// 사용 가능한 회의실 목록 GET /api/v1/rooms
import { api, ok } from "@/server/http/handler";
import { listRooms } from "@/features/bookings/service";

export const GET = api(async () => ok(await listRooms()));

export const runtime = "nodejs";
