// [Server] 예약 목록 표
import { DataTable, Tag, type Column } from "@/components/ui";
import { BOOKING_STATUS_LABEL, kstParts, type BookingDto } from "../schema";

const when = (b: BookingDto) => {
  const s = kstParts(b.startAt);
  return `${s.date} ${s.time}–${kstParts(b.endAt).time}`;
};

const columns: Column<BookingDto>[] = [
  { key: "title", header: "제목", render: (b) => b.title },
  { key: "when", header: "일시", render: when, className: "whitespace-nowrap" },
  { key: "room", header: "회의실", render: (b) => b.room.name },
  { key: "owner", header: "예약자", render: (b) => b.owner.name },
  { key: "attendees", header: "인원", render: (b) => `${b.attendees}명`, className: "is-num" },
  { key: "status", header: "상태", render: (b) => (b.status === "CANCELED" ? <Tag tone="critical" testId="status">{BOOKING_STATUS_LABEL[b.status]}</Tag> : "") },
];

export const BookingTable = ({ rows, empty = "예약이 없습니다." }: { rows: BookingDto[]; empty?: string }) => (
  <DataTable rows={rows} columns={columns} empty={empty} rowHref={(b) => `/bookings/${b.id}`} />
);
