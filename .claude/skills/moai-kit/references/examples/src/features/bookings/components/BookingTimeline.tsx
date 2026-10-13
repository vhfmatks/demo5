// [Server] 일간 타임라인: 행 = 회의실, 열 = 30분 슬롯. 예약은 colSpan 블록, 빈 미래 슬롯은 새 예약 링크(JS 불필요).
import Link from "next/link";
import { cn, EmptyState } from "@/components/ui";
import { CLOSE_HOUR, OPEN_HOUR, SLOT_MINUTES, SLOT_TIMES, kstDate, kstParts, type BookingDto, type RoomDto } from "../schema";

const SLOTS = SLOT_TIMES.slice(0, -1); // 시작 가능한 슬롯 (마지막 21:00 제외)
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
const slotIndex = (iso: string, date: string) => {
  const p = kstParts(iso);
  if (p.date < date) return 0;
  if (p.date > date) return SLOTS.length;
  return Math.max(0, Math.min(SLOTS.length, (Number(p.time.slice(0, 2)) * 60 + Number(p.time.slice(3)) - OPEN_HOUR * 60) / SLOT_MINUTES));
};

type Cell = { span: number; booking?: BookingDto; time: string };

function rowCells(date: string, list: BookingDto[]): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < SLOTS.length; ) {
    const booking = list.find((b) => slotIndex(b.startAt, date) <= i && i < slotIndex(b.endAt, date));
    if (booking) {
      const span = slotIndex(booking.endAt, date) - i;
      cells.push({ span, booking, time: SLOTS[i] });
      i += span;
    } else {
      cells.push({ span: 1, time: SLOTS[i] });
      i += 1;
    }
  }
  return cells;
}

export function BookingTimeline({ date, rooms, bookings, actorId, now }: {
  date: string; rooms: RoomDto[]; bookings: BookingDto[]; actorId: string; now: number;
}) {
  if (!rooms.length) return <EmptyState title="등록된 회의실이 없습니다." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-5xl table-fixed border-collapse" data-testid="timeline">
        <caption className="sr-only">{date} 회의실별 예약 현황</caption>
        <thead>
          <tr>
            <th scope="col" className="caption-medium-medium w-36 p-2 text-left text-muted">회의실</th>
            {HOURS.map((h) => (
              <th key={h} scope="col" colSpan={2} className="caption-medium-medium border-l border-line p-1 text-left text-muted">
                {String(h).padStart(2, "0")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id} className="border-t border-line">
              <th scope="row" className="p-2 text-left">
                <span className="body-small-bold block truncate">{room.name}</span>
                <span className="caption-medium-medium text-muted">{room.capacity}명 · {room.location}</span>
              </th>
              {rowCells(date, bookings.filter((b) => b.room.id === room.id)).map((c) =>
                c.booking ? (
                  <td key={c.time} colSpan={c.span} className="h-14 p-0.5">
                    <Link
                      href={`/bookings/${c.booking.id}`}
                      title={`${c.booking.title} · ${c.booking.owner.name}`}
                      data-testid="booking-block"
                      className={cn(
                        "flex h-full flex-col justify-center overflow-hidden rounded-md px-2 no-underline",
                        c.booking.owner.id === actorId ? "bg-primary text-on-primary" : "bg-subtle text-fg",
                      )}
                    >
                      <span className="caption-medium-medium truncate">{c.booking.title}</span>
                      <span className="caption-medium-medium truncate opacity-80">{c.booking.owner.name}</span>
                    </Link>
                  </td>
                ) : (
                  <td key={c.time} className={cn("h-14 border-l border-line", c.time.endsWith(":30") && "border-dashed")}>
                    {kstDate(date, c.time).getTime() > now && (
                      <Link
                        href={`/bookings/new?roomId=${room.id}&date=${date}&start=${c.time}`}
                        aria-label={`${room.name} ${c.time} 예약`}
                        className="block h-full w-full hover:bg-subtle"
                      />
                    )}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
