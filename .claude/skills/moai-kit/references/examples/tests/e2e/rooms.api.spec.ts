// 회의실 관리 API. 시드 회의실은 다른 TC 가 쓰므로 새 회의실만 만들어 바꾼다.
import { test, expect } from "./fixtures";
import { expectData, expectError, uniqueTitle } from "./helpers";
import { CommonErrors } from "../../src/lib/error-codes";
import { RoomErrors } from "../../src/features/rooms/errors";
import { BookingErrors } from "../../src/features/bookings/errors";
import type { AdminRoomDto } from "../../src/features/rooms/schema";
import { addDays, kstToday, type RoomDto } from "../../src/features/bookings/schema";

const URL = "/api/v1/admin/rooms";

test("TC-ROOM-API-001 등록·목록·수정·이름 중복 409·입력 검증 400", async ({ apiAs }) => {
  const admin = await apiAs("admin");
  const name = uniqueTitle("TC-ROOM-API-001");
  const { data } = await expectData<AdminRoomDto>(await admin.post(URL, { data: { name, location: "합성 3층", capacity: 6 } }), 201);
  expect(data).toMatchObject({ name, location: "합성 3층", capacity: 6, active: true, upcomingBookings: 0 });
  expect((await expectData<AdminRoomDto[]>(await admin.get(URL))).data.map((r) => r.id)).toContain(data.id);
  expect((await expectData<RoomDto[]>(await admin.get("/api/v1/rooms"))).data.map((r) => r.id)).toContain(data.id);
  expect((await expectData<AdminRoomDto>(await admin.patch(`${URL}/${data.id}`, { data: { capacity: 8 } }))).data.capacity).toBe(8);
  const dup = await expectError(await admin.post(URL, { data: { name, capacity: 2 } }), RoomErrors.ROOM_NAME_DUPLICATE);
  expect(dup.fieldErrors?.name).toBeTruthy();
  const bad = await expectError(await admin.post(URL, { data: { name: "", capacity: 0 } }), CommonErrors.VALIDATION_ERROR);
  expect(Object.keys(bad.fieldErrors ?? {})).toEqual(expect.arrayContaining(["name", "capacity"]));
  await expectError(await admin.patch(`${URL}/${data.id}`, { data: {} }), CommonErrors.VALIDATION_ERROR);
});

test("TC-ROOM-API-002 room.manage 없는 역할 403·비로그인 401·값 불변 (SEC-03)", async ({ apiAs }) => {
  const admin = await apiAs("admin");
  const { data } = await expectData<AdminRoomDto>(await admin.post(URL, { data: { name: uniqueTitle("TC-ROOM-API-002"), capacity: 4 } }), 201);
  for (const who of ["user1", "approver", "auditor"] as const) {
    const ctx = await apiAs(who);
    await expectError(await ctx.get(URL), CommonErrors.AUTH_PERMISSION_REQUIRED);
    await expectError(await ctx.post(URL, { data: { name: uniqueTitle("탈취"), capacity: 2 } }), CommonErrors.AUTH_PERMISSION_REQUIRED);
    await expectError(await ctx.patch(`${URL}/${data.id}`, { data: { active: false } }), CommonErrors.AUTH_PERMISSION_REQUIRED);
  }
  await expectError(await (await apiAs(null)).get(URL), CommonErrors.AUTH_REQUIRED);
  expect((await expectData<AdminRoomDto>(await admin.get(`${URL}/${data.id}`))).data).toMatchObject({ capacity: 4, active: true });
});

test("TC-ROOM-API-003 예정 예약이 있으면 중지·인원 축소 409, 취소 후 중지하면 예약 불가·재개 가능", async ({ apiAs }) => {
  const [admin, user] = await Promise.all([apiAs("admin"), apiAs("user1")]);
  const { data: room } = await expectData<AdminRoomDto>(await admin.post(URL, { data: { name: uniqueTitle("TC-ROOM-API-003"), capacity: 6 } }), 201);
  const date = addDays(kstToday(), 50);
  const { data: booking } = await expectData<{ id: string }>(await user.post("/api/v1/bookings", {
    data: { roomId: room.id, date, start: "10:00", end: "11:00", attendees: 5, title: uniqueTitle("예약") },
  }), 201);
  const blocked = await expectError(await admin.patch(`${URL}/${room.id}`, { data: { active: false } }), RoomErrors.ROOM_HAS_UPCOMING_BOOKINGS);
  expect(blocked.message).toContain("1건");
  await expectError(await admin.patch(`${URL}/${room.id}`, { data: { capacity: 4 } }), RoomErrors.ROOM_CAPACITY_BELOW_BOOKINGS);

  await expectData(await user.post(`/api/v1/bookings/${booking.id}/cancel`, { data: {} }));
  expect((await expectData<AdminRoomDto>(await admin.patch(`${URL}/${room.id}`, { data: { active: false } }))).data.active).toBe(false);
  expect((await expectData<RoomDto[]>(await user.get("/api/v1/rooms"))).data.map((r) => r.id)).not.toContain(room.id);
  await expectError(await user.post("/api/v1/bookings", {
    data: { roomId: room.id, date, start: "13:00", end: "14:00", attendees: 2, title: uniqueTitle("중지된 방") },
  }), BookingErrors.BOOKING_ROOM_UNAVAILABLE);
  expect((await expectData<AdminRoomDto>(await admin.patch(`${URL}/${room.id}`, { data: { active: true } }))).data.active).toBe(true);
});
