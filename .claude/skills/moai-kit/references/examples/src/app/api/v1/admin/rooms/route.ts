// 관리자: 회의실 목록 GET(비활성 포함) / 등록 POST
import { api, body, created, ok } from "@/server/http/handler";
import { CreateRoomInput } from "@/features/rooms/schema";
import { createRoom, listRoomsForAdmin } from "@/features/rooms/service";

export const GET = api(async ({ user }) => ok(await listRoomsForAdmin(user)), { permission: "room.manage" });
export const POST = api(async ({ req, user }) => created(await createRoom(user, await body(req, CreateRoomInput))), { permission: "room.manage" });

export const runtime = "nodejs";
