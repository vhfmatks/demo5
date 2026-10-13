// 상세 [Server] — 권한 계산은 서버에서 하고 결과(boolean/배열)만 Client 에 넘긴다
import { Card, DescriptionList, PageHeader } from "@/components/ui";
import { requireUser } from "@/server/auth/session";
import { load } from "@/server/http/page";
import { fmtDateTime } from "@/lib/format";
import { getRequest, getRequestHistory } from "@/features/requests/service";
import { allowedActions, canDelete, canEdit } from "@/features/requests/policy";
import { CATEGORY_LABEL } from "@/features/requests/schema";
import { StatusBadge } from "@/features/requests/components/StatusBadge";
import { RequestActions } from "@/features/requests/components/RequestActions";
import { RequestHistory } from "@/features/requests/components/RequestHistory";

export default async function RequestDetailPage({ params }: PageProps<"/requests/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const [r, history] = await load(Promise.all([getRequest(user, id), getRequestHistory(user, id)]));
  const target = { requesterId: r.requester.id, status: r.status };
  return (
    <>
      <PageHeader title={r.title} />
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-3">
          <DescriptionList
            items={[
              { label: "상태", value: <StatusBadge status={r.status} /> },
              { label: "분류", value: CATEGORY_LABEL[r.category] },
              { label: "요청자", value: r.requester.name },
              { label: "등록일", value: fmtDateTime(r.createdAt) },
              { label: "내용", value: r.description || "-" },
              ...(r.executionPlan ? [{ label: "수행계획", value: <span className="whitespace-pre-wrap" data-testid="execution-plan">{r.executionPlan}</span> }] : []),
              ...(r.approver ? [{ label: "처리자", value: r.approver.name }, { label: "처리 의견", value: r.decisionNote || "-" }] : []),
            ]}
          />
        </Card>
        <Card title="처리">
          <RequestActions id={r.id} actions={allowedActions(user, target)} canEdit={canEdit(user, target)} canDelete={canDelete(user, target)} />
        </Card>
        <Card title="처리 이력" className="md:col-span-3">
          <RequestHistory items={history} />
        </Card>
      </div>
    </>
  );
}
