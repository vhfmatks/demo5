// 새 예약 [Server] — 타임라인에서 ?roomId=&date=&start= 로 넘어오면 기본값으로 채운다.
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/server/auth/session";
import { listRooms } from "@/features/bookings/service";
import { SLOT_TIMES, kstToday } from "@/features/bookings/schema";
import { BookingForm } from "@/features/bookings/components/BookingForm";

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function NewBookingPage({ searchParams }: PageProps<"/bookings/new">) {
  await requireUser();
  const sp = await searchParams;
  const [start, date, roomId] = [one(sp.start), one(sp.date), one(sp.roomId)];
  const rooms = await listRooms();
  return (
    <>
      <PageHeader title="새 예약" />
      <Card>
        <BookingForm rooms={rooms} defaults={{
          roomId: rooms.find((r) => r.id === roomId)?.id,
          date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : kstToday(),
          start: start && SLOT_TIMES.includes(start) ? start : undefined,
        }} />
      </Card>
    </>
  );
}
