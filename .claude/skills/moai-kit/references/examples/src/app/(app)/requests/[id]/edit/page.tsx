import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/server/auth/session";
import { load } from "@/server/http/page";
import { getRequest } from "@/features/requests/service";
import { canEdit } from "@/features/requests/policy";
import { RequestForm } from "@/features/requests/components/RequestForm";
import { RequestPlanAssist } from "@/features/requests/components/RequestPlanAssist";
import { aiAvailable } from "@/features/ai/service";

export default async function EditRequestPage({ params }: PageProps<"/requests/[id]/edit">) {
  const user = await requireUser();
  const r = await load(getRequest(user, (await params).id));
  if (!canEdit(user, { requesterId: r.requester.id, status: r.status })) notFound();
  return (
    <>
      <PageHeader title="요청 수정" />
      <div className="flex flex-col gap-4">
        <Card><RequestForm initial={r} /></Card>
        <Card title="수행계획"><RequestPlanAssist id={r.id} initialPlan={r.executionPlan} initialVersion={r.version} ai={await aiAvailable()} /></Card>
      </div>
    </>
  );
}
