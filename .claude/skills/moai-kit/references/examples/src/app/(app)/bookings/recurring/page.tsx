import { Card, PageHeader } from "@/components/ui";
import { BookingForm } from "@/features/bookings/components/BookingForm";
import { addDays, kstToday } from "@/features/bookings/schema";
import { listRooms } from "@/features/bookings/service";
import { requireUser } from "@/server/auth/session";

export default async function RecurringBookingPage() {
  await requireUser();
  const rooms = await listRooms();
  return (
    <>
      <PageHeader title="반복 예약" description="반복 일정을 확인한 뒤 한 번에 확정합니다. 하나라도 충돌하면 전체를 저장하지 않습니다." />
      <Card>
        <BookingForm recurring rooms={rooms} defaults={{ date: addDays(kstToday(), 1) }} />
      </Card>
    </>
  );
}
