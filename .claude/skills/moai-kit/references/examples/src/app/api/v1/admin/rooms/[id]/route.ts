// 관리자: 회의실 단건 GET / PATCH(이름·위치·인원·사용 여부). 삭제 대신 active=false.
import { api, body, IdParams, ok } from "@/server/http/handler";
import { UpdateRoomInput } from "@/features/rooms/schema";
import { getRoomForAdmin, updateRoom } from "@/features/rooms/service";

type P = { id: string };

export const GET = api<P>(async ({ params, user }) => ok(await getRoomForAdmin(user, params.id)), { params: IdParams, permission: "room.manage" });
export const PATCH = api<P>(async ({ req, params, user }) =>
  ok(await updateRoom(user, params.id, await body(req, UpdateRoomInput))),
  { params: IdParams, permission: "room.manage" },
);

export const runtime = "nodejs";
