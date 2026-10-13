// 예약 상세 [Server] — 권한·시각 판단은 서버에서 하고 boolean 만 넘긴다.
import { Card, DescriptionList, LinkButton, PageHeader, Tag } from "@/components/ui";
import { requireUser } from "@/server/auth/session";
import { load } from "@/server/http/page";
import { fmtDateTime } from "@/lib/format";
import { getBookingDetail } from "@/features/bookings/service";
import { BOOKING_STATUS_LABEL, kstParts } from "@/features/bookings/schema";
import { BookingActions } from "@/features/bookings/components/BookingActions";

export default async function BookingDetailPage({ params }: PageProps<"/bookings/[id]">) {
  const user = await requireUser();
  const { booking: b, canEdit, canCancel } = await load(getBookingDetail(user, (await params).id));
  const s = kstParts(b.startAt);
  return (
    <>
      <PageHeader title={b.title} actions={<LinkButton href={`/bookings?date=${s.date}`} variant="tertiary">타임라인에서 보기</LinkButton>} />
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-3">
          <DescriptionList items={[
            { label: "상태", value: <Tag tone={b.status === "CANCELED" ? "critical" : "positive"} testId="status">{BOOKING_STATUS_LABEL[b.status]}</Tag> },
            { label: "일시", value: `${s.date} ${s.time}–${kstParts(b.endAt).time}` },
            { label: "회의실", value: `${b.room.name} (최대 ${b.room.capacity}명)` },
            { label: "인원", value: `${b.attendees}명` },
            { label: "예약자", value: b.owner.name },
            { label: "메모", value: b.memo || "-" },
            ...(b.status === "CANCELED" ? [{ label: "취소 사유", value: b.cancelReason || "-" }] : []),
            { label: "등록일", value: fmtDateTime(b.createdAt) },
          ]} />
        </Card>
        <Card title="관리">
          <BookingActions id={b.id} canEdit={canEdit} canCancel={canCancel} />
        </Card>
      </div>
    </>
  );
}
