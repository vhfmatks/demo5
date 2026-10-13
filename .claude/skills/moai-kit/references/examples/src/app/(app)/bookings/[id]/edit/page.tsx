// 예약 수정 [Server] — 본인·확정·시작 전만. 저장 시 서버가 시간 규칙·겹침을 다시 검사한다.
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/server/auth/session";
import { load } from "@/server/http/page";
import { getBookingDetail, listRooms } from "@/features/bookings/service";
import { kstParts } from "@/features/bookings/schema";
import { BookingForm } from "@/features/bookings/components/BookingForm";

export default async function EditBookingPage({ params }: PageProps<"/bookings/[id]/edit">) {
  const user = await requireUser();
  const { booking: b, canEdit } = await load(getBookingDetail(user, (await params).id));
  if (!canEdit) notFound();
  const s = kstParts(b.startAt);
  return (
    <>
      <PageHeader title="예약 수정" />
      <Card>
        <BookingForm id={b.id} rooms={await listRooms()} defaults={{
          roomId: b.room.id, date: s.date, start: s.time, end: kstParts(b.endAt).time,
          attendees: b.attendees, title: b.title, memo: b.memo,
        }} />
      </Card>
    </>
  );
}
