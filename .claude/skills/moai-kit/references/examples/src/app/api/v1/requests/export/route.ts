// 내보내기: 목록과 같은 query → CSV 파일 (download 헬퍼, 수식 주입 방지는 lib/csv)
import { api, download, query } from "@/server/http/handler";
import { ListRequestQuery } from "@/features/requests/schema";
import { exportRequestsCsv } from "@/features/requests/service";

export const GET = api(async ({ req, user }) => download("요청목록.csv", await exportRequestsCsv(user, query(req, ListRequestQuery))));

export const runtime = "nodejs";
