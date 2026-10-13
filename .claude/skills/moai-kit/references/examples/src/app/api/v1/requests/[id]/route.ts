// REST 표준: 단건  GET / PATCH(부분 수정) / DELETE
import { api, body, IdParams, noContent, ok } from "@/server/http/handler";
import { UpdateRequestInput } from "@/features/requests/schema";
import { deleteRequest, getRequest, updateRequest } from "@/features/requests/service";

type P = { id: string };

export const GET = api<P>(async ({ params, user }) => ok(await getRequest(user, params.id)), { params: IdParams });

export const PATCH = api<P>(async ({ req, params, user }) =>
  ok(await updateRequest(user, params.id, await body(req, UpdateRequestInput))),
  { params: IdParams },
);

export const DELETE = api<P>(async ({ params, user }) => {
  await deleteRequest(user, params.id);
  return noContent();
}, { params: IdParams });

export const runtime = "nodejs";
