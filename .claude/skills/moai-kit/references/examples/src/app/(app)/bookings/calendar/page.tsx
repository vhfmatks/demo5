// 예약 달력 [Server] — 월·주 보기. 날짜 숫자 → 그날 타임라인(/bookings?date=)
import { Calendar, Card, LinkButton, PageHeader } from "@/components/ui";
import { requireUser } from "@/server/auth/session";
import { CalendarQuery, kstToday, visibleDays } from "@/lib/calendar";
import { bookingCalendar } from "@/features/bookings/service";

export default async function BookingCalendarPage({ searchParams }: PageProps<"/bookings/calendar">) {
  const user = await requireUser();
  const q = CalendarQuery.parse(await searchParams);
  const today = kstToday();
  const date = q.date ?? today;
  const events = await bookingCalendar(user, visibleDays(q.view, date));
  return (
    <>
      <PageHeader title="예약 달력" description="검정 = 내 예약 · 회색 = 다른 사람 예약. 날짜를 누르면 그날 타임라인으로 갑니다."
        actions={<LinkButton href={`/bookings?date=${date}`} variant="tertiary">타임라인</LinkButton>} />
      <Card>
        <Calendar view={q.view} date={date} today={today} events={events} basePath="/bookings/calendar" dayHref={(d) => `/bookings?date=${d}`} />
      </Card>
    </>
  );
}
