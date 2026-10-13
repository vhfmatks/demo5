// AI 분류 추천 POST { title, description } → { category, reason }. 미등록 503·공급자 오류 502.
import { api, body, ok } from "@/server/http/handler";
import { SuggestRequestInput } from "@/features/requests/schema";
import { suggestRequestCategory } from "@/features/requests/service";

export const POST = api(async ({ req, user }) => ok(await suggestRequestCategory(user, await body(req, SuggestRequestInput))));

export const runtime = "nodejs";
