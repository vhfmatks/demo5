// 목록 [Server] — searchParams → zod 파싱 → 서비스
import { Card, LinkButton, PageHeader, Pagination } from "@/components/ui";
import { requireUser } from "@/server/auth/session";
import { can } from "@/lib/permissions";
import { listRequests } from "@/features/requests/service";
import { ListRequestQuery } from "@/features/requests/schema";
import { RequestFilters } from "@/features/requests/components/RequestFilters";
import { RequestTable } from "@/features/requests/components/RequestTable";

export default async function RequestsPage({ searchParams }: PageProps<"/requests">) {
  const user = await requireUser();
  const q = ListRequestQuery.parse(await searchParams);
  const { items, meta } = await listRequests(user, q);
  const filters = { view: q.view === "all" ? undefined : q.view, status: q.status, category: q.category, q: q.q };
  const exportHref = `/api/v1/requests/export?${new URLSearchParams(Object.entries(filters).filter((e): e is [string, string] => !!e[1]))}`;
  return (
    <>
      <PageHeader
        title="요청"
        description={`총 ${meta.total}건`}
        actions={<>
          {/* download 속성 → Next 클라이언트 이동 대신 파일 받기 */}
          <LinkButton href={exportHref} download prefetch={false} variant="tertiary">CSV 내보내기</LinkButton>
          <LinkButton href="/requests/import" variant="tertiary">가져오기</LinkButton>
          <LinkButton href="/requests/new" variant="tertiary">새 요청</LinkButton>
        </>}
      />
      <RequestFilters q={q} staff={can(user, "request.read.all")} />
      <Card>
        <RequestTable rows={items} />
        <Pagination meta={meta} basePath="/requests" params={filters} />
      </Card>
    </>
  );
}
