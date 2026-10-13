// REST 표준: 상태 전이는 하위 리소스 POST /{id}/transition { action, note? }
import { api, body, IdParams, ok } from "@/server/http/handler";
import { TransitionInput } from "@/features/requests/schema";
import { transitionRequest } from "@/features/requests/service";

export const POST = api<{ id: string }>(async ({ req, params, user }) =>
  ok(await transitionRequest(user, params.id, await body(req, TransitionInput))),
  { params: IdParams },
);

export const runtime = "nodejs";
