import { api, ok } from "@/server/http/handler";
import { requestStats } from "@/features/requests/service";

export const GET = api(async ({ user }) => ok(await requestStats(user)));

export const runtime = "nodejs";
