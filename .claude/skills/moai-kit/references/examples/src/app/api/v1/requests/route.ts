// REST 표준: 컬렉션  GET(목록) / POST(생성)
import { api, body, created, ok, query } from "@/server/http/handler";
import { CreateRequestInput, ListRequestQuery } from "@/features/requests/schema";
import { createRequest, listRequests } from "@/features/requests/service";

export const GET = api(async ({ req, user }) => {
  const { items, meta } = await listRequests(user, query(req, ListRequestQuery));
  return ok(items, meta);
});

export const POST = api(async ({ req, user }) =>
  created(await createRequest(user, await body(req, CreateRequestInput))),
);

export const runtime = "nodejs";
