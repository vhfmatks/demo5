// 가져오기: multipart file(.csv/.xlsx) → 일괄 생성. 행 오류는 400 fieldErrors["3행 분류"], 저장 없음.
import { api, created, upload } from "@/server/http/handler";
import { importRequests } from "@/features/requests/service";

export const POST = api(async ({ req, user }) => created(await importRequests(user, await upload(req, { extensions: [".csv", ".xlsx"] }))));

export const runtime = "nodejs";
