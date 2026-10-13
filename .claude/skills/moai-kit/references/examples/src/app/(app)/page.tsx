// 대시보드 [Server] — 역할별 구성. 승인자·관리자는 결재 대기를 먼저 보여준다.
import { BarChart, Card, LineChart, LinkButton, PageHeader, Progress, Stat } from "@/components/ui";
import { requireUser } from "@/server/auth/session";
import { can } from "@/lib/permissions";
import { listRequests, requestInsights, requestStats } from "@/features/requests/service";
import { STATUS_LABEL, REQUEST_STATUSES } from "@/features/requests/schema";
import { RequestTable } from "@/features/requests/components/RequestTable";

export default async function DashboardPage() {
  const user = await requireUser();
  const staff = can(user, "request.read.all");
  const [stats, insights, mine, inbox] = await Promise.all([
    requestStats(user),
    requestInsights(user),
    listRequests(user, { view: "mine", page: 1, pageSize: 5 }),
    can(user, "request.decide") ? listRequests(user, { view: "inbox", page: 1, pageSize: 5 }) : null,
  ]);
  const total = REQUEST_STATUSES.reduce((n, s) => n + stats[s], 0);
  return (
    <>
      <PageHeader
        title="대시보드"
        description={inbox ? `${user.name}님, 처리할 요청이 ${inbox.meta.total}건 있습니다.` : `${user.name}님, 안녕하세요.`}
        actions={<LinkButton href="/requests/new" variant="tertiary">새 요청</LinkButton>}
      />
      <p className="body-small-medium mb-2 text-muted">{staff ? "전체 요청 현황" : "내 요청 현황"}</p>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="stats">
        {REQUEST_STATUSES.map((s) => (
          <Stat key={s} label={STATUS_LABEL[s]} value={stats[s]} />
        ))}
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card title="분류별 요청">
          <BarChart label="분류별 요청" series={insights.categorySeries} rows={insights.categories} />
        </Card>
        <Card title="월별 등록">
          <div className="flex flex-col gap-6">
            <LineChart label="월별 등록" x={insights.months.x} series={[{ name: "등록", values: insights.months.values }]} format={(n) => `${n}건`} />
            <Progress label="처리 완료율" value={stats.APPROVED + stats.REJECTED} max={total} />
          </div>
        </Card>
      </div>
      <div className="flex flex-col gap-6">
        {inbox && (
          <Card title={`결재 대기 ${inbox.meta.total}건`} actions={<LinkButton href="/approvals" variant="text">결재함</LinkButton>}>
            <RequestTable rows={inbox.items} empty="처리할 요청이 없습니다." />
          </Card>
        )}
        <Card title="내 최근 요청" actions={<LinkButton href="/requests?view=mine" variant="text">전체 보기</LinkButton>}>
          <RequestTable rows={mine.items} />
        </Card>
      </div>
    </>
  );
}
