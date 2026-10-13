// 회의실 관리 서비스 (메모리 DB) — 권한·이름 중복·비활성화/인원 축소 안전장치·감사로그
import { describe, expect, it } from "vitest";
import { AppError } from "@/server/http/errors";
import { CommonErrors } from "@/lib/error-codes";
import * as rooms from "@/features/rooms/service";
import { createBooking, listRooms } from "@/features/bookings/service";
import { CreateBookingInput, addDays, kstToday } from "@/features/bookings/schema";
import { listAuditLogs } from "@/features/auditLogs/service";
import { RoomErrors } from "@/features/rooms/errors";
import { makeUser } from "./fixtures";

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "OK";
  } catch (e) {
    return e instanceof AppError ? e.code : e instanceof Error ? e.name : String(e);
  }
};
const uniq = (s: string) => `${s}-${crypto.randomUUID().slice(0, 8)}`;

describe("rooms service", () => {
  it("room.manage 권한이 없으면 거부", async () => {
    for (const role of ["USER", "APPROVER", "AUDITOR"] as const) {
      const u = await makeUser(role);
      expect(await code(rooms.listRoomsForAdmin(u))).toBe(CommonErrors.AUTH_PERMISSION_REQUIRED.code);
      expect(await code(rooms.createRoom(u, { name: uniq("x"), location: "", capacity: 2 }))).toBe(CommonErrors.AUTH_PERMISSION_REQUIRED.code);
    }
  });

  it("등록·이름 중복 409·수정·감사로그", async () => {
    const admin = await makeUser("ADMIN");
    const name = uniq("회의실");
    const r = await rooms.createRoom(admin, { name, location: "1층", capacity: 4 });
    expect(r).toMatchObject({ name, capacity: 4, active: true, upcomingBookings: 0 });
    expect(await code(rooms.createRoom(admin, { name, location: "", capacity: 2 }))).toBe(RoomErrors.ROOM_NAME_DUPLICATE.code);
    const other = await rooms.createRoom(admin, { name: uniq("다른"), location: "", capacity: 2 });
    expect(await code(rooms.updateRoom(admin, other.id, { name }))).toBe(RoomErrors.ROOM_NAME_DUPLICATE.code);
    expect((await rooms.updateRoom(admin, r.id, { name, capacity: 8 })).capacity).toBe(8); // 자기 이름 유지는 허용
    const { items } = await listAuditLogs(admin, { entity: "room", entityId: r.id, page: 1, pageSize: 5 });
    expect(items.map((l) => l.action)).toEqual(["room.update", "room.create"]);
    expect(items[0].detail).toEqual({ changes: { capacity: { from: 4, to: 8 } } });
  });

  it("예정 예약이 있으면 비활성화·인원 축소 거부, 없으면 비활성화 후 예약 목록에서 숨김", async () => {
    const [admin, u] = await Promise.all([makeUser("ADMIN"), makeUser()]);
    const r = await rooms.createRoom(admin, { name: uniq("예약룸"), location: "", capacity: 6 });
    await createBooking(u, CreateBookingInput.parse({ roomId: r.id, date: addDays(kstToday(), 5), start: "10:00", end: "11:00", attendees: 5, title: "회의" }));
    expect((await rooms.getRoomForAdmin(admin, r.id)).upcomingBookings).toBe(1);
    expect(await code(rooms.updateRoom(admin, r.id, { active: false }))).toBe(RoomErrors.ROOM_HAS_UPCOMING_BOOKINGS.code);
    expect(await code(rooms.updateRoom(admin, r.id, { capacity: 4 }))).toBe(RoomErrors.ROOM_CAPACITY_BELOW_BOOKINGS.code);
    expect((await rooms.updateRoom(admin, r.id, { capacity: 5 })).capacity).toBe(5);

    const idle = await rooms.createRoom(admin, { name: uniq("빈방"), location: "", capacity: 2 });
    expect((await rooms.updateRoom(admin, idle.id, { active: false })).active).toBe(false);
    expect((await listRooms()).map((x) => x.id)).not.toContain(idle.id);
    const logs = await listAuditLogs(admin, { entityId: idle.id, page: 1, pageSize: 1 });
    expect(logs.items[0].action).toBe("room.deactivate");
  });
});
