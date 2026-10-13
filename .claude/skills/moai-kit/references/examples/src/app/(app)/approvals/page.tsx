// 결재함 [Server] — request.decide 권한. 타인의 대기 요청만 (본인 요청은 처리 불가).
import { Card, PageHeader, Pagination } from "@/components/ui";
import { requirePermission } from "@/server/auth/session";
import { listRequests } from "@/features/requests/service";
import { ListRequestQuery } from "@/features/requests/schema";
import { RequestTable } from "@/features/requests/components/RequestTable";
import { RequestFilters } from "@/features/requests/components/RequestFilters";

export default async function ApprovalsPage({ searchParams }: PageProps<"/approvals">) {
  const user = await requirePermission("request.decide");
  const q = { ...ListRequestQuery.parse(await searchParams), view: "inbox" as const };
  const { items, meta } = await listRequests(user, q);
  return (
    <>
      <PageHeader title="결재함" description={`처리 대기 ${meta.total}건`} />
      <RequestFilters q={q} />
      <Card>
        <RequestTable rows={items} empty="처리할 요청이 없습니다." />
        <Pagination meta={meta} basePath="/approvals" params={{ category: q.category, q: q.q }} />
      </Card>
    </>
  );
}
