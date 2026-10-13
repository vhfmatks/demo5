// 회의실 예약 [Server] — 일간 타임라인 + 내 다가오는 예약. 날짜 이동은 URL(?date=)로만.
import { Button, DatePicker, Card, LinkButton, PageHeader } from "@/components/ui";
import { requireUser } from "@/server/auth/session";
import { getDaySchedule, listBookings } from "@/features/bookings/service";
import { DayQuery, addDays, kstToday } from "@/features/bookings/schema";
import { BookingTimeline } from "@/features/bookings/components/BookingTimeline";
import { BookingTable } from "@/features/bookings/components/BookingTable";

export default async function BookingsPage({ searchParams }: PageProps<"/bookings">) {
  const user = await requireUser();
  const today = kstToday();
  const date = DayQuery.parse(await searchParams).date ?? today;
  const [day, mine] = await Promise.all([
    getDaySchedule(user, date),
    listBookings(user, { mine: "1", upcoming: "1", status: "CONFIRMED", page: 1, pageSize: 5 }),
  ]);
  const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
  return (
    <>
      <PageHeader title="회의실 예약" description="빈 칸을 누르면 해당 회의실·시각으로 예약합니다."
        actions={<>
          <LinkButton href={`/bookings/calendar?date=${date}`} variant="tertiary">달력</LinkButton>
          <LinkButton href="/bookings/mine" variant="tertiary">내 예약</LinkButton>
          <LinkButton href="/bookings/recurring" variant="tertiary">반복 예약</LinkButton>
          <LinkButton href={`/bookings/new?date=${date}`} variant="tertiary">새 예약</LinkButton>
        </>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <LinkButton href={`/bookings?date=${addDays(date, -1)}`} variant="tertiary" size="small">이전 날</LinkButton>
        <LinkButton href="/bookings" variant="tertiary" size="small">오늘</LinkButton>
        <LinkButton href={`/bookings?date=${addDays(date, 1)}`} variant="tertiary" size="small">다음 날</LinkButton>
        <search><form method="get" className="flex gap-2">
          <DatePicker bare name="date" label="날짜" defaultValue={date} />
          <Button type="submit" variant="tertiary" size="small">이동</Button>
        </form></search>
        <p className="title-medium-bold ml-2" data-testid="day">{date} ({weekday}){date === today && " · 오늘"}</p>
      </div>
      <div className="flex flex-col gap-6">
        <Card title={`예약 ${day.bookings.length}건`} actions={<p className="caption-medium-medium text-muted">검정 = 내 예약 · 회색 = 다른 사람 예약</p>}>
          <BookingTimeline date={date} rooms={day.rooms} bookings={day.bookings} actorId={user.id} now={day.now} />
        </Card>
        <Card title="내 다가오는 예약" actions={<LinkButton href="/bookings/mine" variant="text">전체 보기</LinkButton>}>
          <BookingTable rows={mine.items} empty="다가오는 예약이 없습니다." />
        </Card>
      </div>
    </>
  );
}
