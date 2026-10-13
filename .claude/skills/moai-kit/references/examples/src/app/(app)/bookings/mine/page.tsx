// 내 예약 [Server] — 지난·취소 포함 전체 이력
import { Button, Card, PageHeader, Pagination, SearchField, Select, toOptions, FilterBar } from "@/components/ui";
import { requireUser } from "@/server/auth/session";
import { listBookings } from "@/features/bookings/service";
import { BOOKING_STATUS_LABEL, ListBookingQuery } from "@/features/bookings/schema";
import { BookingTable } from "@/features/bookings/components/BookingTable";

export default async function MyBookingsPage({ searchParams }: PageProps<"/bookings/mine">) {
  const user = await requireUser();
  const q = { ...ListBookingQuery.parse(await searchParams), mine: "1" as const };
  const { items, meta } = await listBookings(user, q);
  return (
    <>
      <PageHeader title="내 예약" description={`총 ${meta.total}건`} />
      <FilterBar>
        <SearchField name="q" label="제목 검색" defaultValue={q.q} placeholder="예약 제목 검색" />
        <Select name="status" aria-label="상태" defaultValue={q.status ?? ""} options={toOptions(BOOKING_STATUS_LABEL)} placeholder="전체 상태" className="w-36" />
        <Button type="submit" variant="tertiary">검색</Button>
      </FilterBar>
      <Card>
        <BookingTable rows={items} />
        <Pagination meta={meta} basePath="/bookings/mine" params={{ status: q.status, q: q.q }} />
      </Card>
    </>
  );
}
