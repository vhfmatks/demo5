// 회의실 예약 API. TC 마다 다른 미래 날짜(+30일~)를 써서 서로의 예약과 겹치지 않게 한다.
import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "./fixtures";
import { expectData, expectError, uniqueTitle } from "./helpers";
import { CommonErrors } from "../../src/lib/error-codes";
import { BookingErrors } from "../../src/features/bookings/errors";
import { addDays, kstToday, type BookingDto, type RoomDto } from "../../src/features/bookings/schema";

const URL = "/api/v1/bookings";
const roomId = async (ctx: APIRequestContext, name: string) => {
  const room = (await expectData<RoomDto[]>(await ctx.get("/api/v1/rooms"))).data.find((r) => r.name === name);
  expect(room, `시드 회의실 ${name}`).toBeTruthy();
  return room?.id ?? "";
};
const slot = (room: string, day: number, start: string, end: string, extra: object = {}) =>
  ({ roomId: room, date: addDays(kstToday(), day), start, end, attendees: 2, title: uniqueTitle("회의"), ...extra });

test("TC-BOOKING-API-001 예약·날짜 목록·조회·시간 변경·취소 후 재조회", async ({ apiAs }) => {
  const owner = await apiAs("user1");
  const room = await roomId(owner, "소회의실 A");
  const input = slot(room, 30, "10:00", "11:00", { memo: "합성 메모" });
  const { data } = await expectData<BookingDto>(await owner.post(URL, { data: input }), 201);
  expect(data).toMatchObject({ title: input.title, status: "CONFIRMED", attendees: 2, room: { id: room }, memo: "합성 메모" });
  expect(new Date(data.startAt).toISOString()).toBe(new Date(`${input.date}T10:00:00+09:00`).toISOString());
  const listed = await expectData<BookingDto[]>(await owner.get(`${URL}?date=${input.date}&roomId=${room}`));
  expect(listed.data.map((b) => b.id)).toContain(data.id);

  const moved = await expectData<BookingDto>(await owner.patch(`${URL}/${data.id}`, { data: { start: "13:00", end: "14:30" } }));
  expect(moved.data).toMatchObject({ title: input.title, memo: "합성 메모" });
  expect(new Date(moved.data.endAt).toISOString()).toBe(new Date(`${input.date}T14:30:00+09:00`).toISOString());

  const canceled = await expectData<BookingDto>(await owner.post(`${URL}/${data.id}/cancel`, { data: { reason: "일정 변경" } }));
  expect(canceled.data).toMatchObject({ status: "CANCELED", cancelReason: "일정 변경" });
  expect((await expectData<BookingDto>(await owner.get(`${URL}/${data.id}`))).data.status).toBe("CANCELED");
});

test("TC-BOOKING-API-002 시간·인원·과거·필드 검증 400과 건수 불변", async ({ apiAs }) => {
  const owner = await apiAs("user1");
  const room = await roomId(owner, "포커스룸"); // 최대 2명
  const count = async () => (await expectData<BookingDto[]>(await owner.get(`${URL}?mine=1`))).meta?.total;
  const before = await count();
  const field = async (data: object, def: { code: string; category: "VALIDATION_ERROR" } = CommonErrors.VALIDATION_ERROR) =>
    Object.keys((await expectError(await owner.post(URL, { data }), def)).fieldErrors ?? {});
  expect(await field(slot(room, 31, "10:00", "10:00"))).toContain("end");
  expect(await field(slot(room, 31, "09:00", "13:30"))).toContain("end");
  expect(await field(slot(room, 31, "10:10", "11:00"))).toContain("start");
  expect(await field(slot(room, 31, "07:00", "08:00"))).toContain("start");
  expect(await field(slot(room, 31, "10:00", "11:00", { attendees: 3 }), BookingErrors.BOOKING_OVER_CAPACITY)).toContain("attendees");
  expect(await field(slot(room, -1, "10:00", "11:00"), BookingErrors.BOOKING_PAST_TIME)).toContain("start");
  expect(await field(slot(crypto.randomUUID(), 31, "10:00", "11:00"), BookingErrors.BOOKING_ROOM_UNAVAILABLE)).toContain("roomId");
  await expectError(await owner.post(URL, { data: { ...slot(room, 31, "10:00", "11:00"), ownerId: crypto.randomUUID() } }), CommonErrors.VALIDATION_ERROR);
  expect(await count()).toBe(before);
});

test("TC-BOOKING-API-003 비로그인 거부 (SEC-02)", async ({ apiAs }) => {
  const anon = await apiAs(null);
  await expectError(await anon.get(URL), CommonErrors.AUTH_REQUIRED);
  await expectError(await anon.get("/api/v1/rooms"), CommonErrors.AUTH_REQUIRED);
  await expectError(await anon.post(URL, { data: { title: "익명" } }), CommonErrors.AUTH_REQUIRED);
});

test("TC-BOOKING-API-004 일정은 공유 조회(메모는 예약자만), 타인 수정·취소 403·값 불변, 관리자 취소 허용 (SEC-03)", async ({ apiAs }) => {
  const [owner, other, admin] = await Promise.all([apiAs("user1"), apiAs("user2"), apiAs("admin")]);
  const room = await roomId(owner, "소회의실 B");
  const { data } = await expectData<BookingDto>(await owner.post(URL, { data: slot(room, 32, "10:00", "11:00", { memo: "합성 메모" }) }), 201);
  const itemURL = `${URL}/${data.id}`;
  const shared = (await expectData<BookingDto>(await other.get(itemURL))).data;
  expect(shared.owner.name).toBeTruthy();
  expect(shared.memo).toBe(""); // 정보 최소화: 메모는 예약자 본인에게만
  expect((await expectData<BookingDto>(await owner.get(itemURL))).data.memo).toBe("합성 메모");
  await expectError(await other.patch(itemURL, { data: { title: "탈취" } }), BookingErrors.BOOKING_EDIT_FORBIDDEN);
  await expectError(await other.post(`${itemURL}/cancel`, { data: {} }), BookingErrors.BOOKING_CANCEL_FORBIDDEN);
  expect((await expectData<BookingDto>(await owner.get(itemURL))).data).toMatchObject({ title: data.title, status: "CONFIRMED" });
  expect((await expectData<BookingDto>(await admin.post(`${itemURL}/cancel`, { data: { reason: "시설 점검" } }))).data.status).toBe("CANCELED");
  await expectError(await owner.post(`${itemURL}/cancel`, { data: {} }), BookingErrors.BOOKING_NOT_CONFIRMED);
  await expectError(await owner.patch(itemURL, { data: { title: "재사용" } }), BookingErrors.BOOKING_NOT_CONFIRMED);
});

test("TC-BOOKING-API-005 겹침 409·경계 허용·다른 회의실 허용, 같은 슬롯 동시 요청은 1건만 성공", async ({ apiAs }) => {
  const [u1, u2, ad, ap] = await Promise.all([apiAs("user1"), apiAs("user2"), apiAs("admin"), apiAs("approver")]);
  const [room, other] = await Promise.all([roomId(u1, "대회의실"), roomId(u1, "소회의실 A")]);
  await expectData(await u1.post(URL, { data: slot(room, 33, "10:00", "11:00") }), 201);
  await expectError(await u2.post(URL, { data: slot(room, 33, "10:30", "11:30") }), BookingErrors.BOOKING_TIME_CONFLICT);
  await expectError(await u2.post(URL, { data: slot(room, 33, "09:00", "12:00") }), BookingErrors.BOOKING_TIME_CONFLICT);
  await expectData(await u2.post(URL, { data: slot(room, 33, "11:00", "12:00") }), 201);
  await expectData(await u2.post(URL, { data: slot(other, 33, "10:00", "11:00") }), 201);

  const racers = [u1, u2, ad, ap];
  const responses = await Promise.all(racers.map((ctx) => ctx.post(URL, { data: slot(room, 33, "15:00", "16:00") })));
  const statuses = responses.map((r) => r.status()).sort();
  expect(statuses).toEqual([201, 409, 409, 409]);
  for (const r of responses.filter((x) => x.status() === 409)) await expectError(r, BookingErrors.BOOKING_TIME_CONFLICT);
  const day = await expectData<BookingDto[]>(await u1.get(`${URL}?date=${addDays(kstToday(), 33)}&roomId=${room}&status=CONFIRMED`));
  expect(day.data.filter((b) => b.startAt === new Date(`${addDays(kstToday(), 33)}T15:00:00+09:00`).toISOString())).toHaveLength(1);
});
