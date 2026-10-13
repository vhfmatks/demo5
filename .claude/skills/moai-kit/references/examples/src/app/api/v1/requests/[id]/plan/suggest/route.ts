// AI 수행계획 초안 POST { expectedVersion } → { plan, sourceVersion }. 저장하지 않는다. 미등록 503·공급자 오류 502·오래된 version 409.
import { api, body, IdParams, ok } from "@/server/http/handler";
import { SuggestPlanInput } from "@/features/requests/schema";
import { suggestExecutionPlan } from "@/features/requests/service";

export const POST = api<{ id: string }>(async ({ req, params, user }) =>
  ok(await suggestExecutionPlan(user, params.id, await body(req, SuggestPlanInput))),
  { params: IdParams },
);

export const runtime = "nodejs";
