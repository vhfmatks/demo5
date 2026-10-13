// 수행계획 저장 PUT { executionPlan, expectedVersion } → RequestDto. 본인·대기 요청만, 오래된 version 409.
import { api, body, IdParams, ok } from "@/server/http/handler";
import { SaveExecutionPlanInput } from "@/features/requests/schema";
import { saveExecutionPlan } from "@/features/requests/service";

export const PUT = api<{ id: string }>(async ({ req, params, user }) =>
  ok(await saveExecutionPlan(user, params.id, await body(req, SaveExecutionPlanInput))),
  { params: IdParams },
);

export const runtime = "nodejs";
