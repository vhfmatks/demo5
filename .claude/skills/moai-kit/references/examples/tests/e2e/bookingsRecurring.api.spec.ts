import { test, expect } from "./fixtures";
import { expectData, expectError, uniqueTitle } from "./helpers";
import { CommonErrors } from "../../src/lib/error-codes";
import { BookingErrors } from "../../src/features/bookings/errors";
import { addDays, kstParts, kstToday, type BookingDto, type RecurringBookingPreview, type RoomDto } from "../../src/features/bookings/schema";

const URL = "/api/v1/bookings/recurring";

test("TC-BOOKING_SERIES-API-001 미리보기는 저장하지 않고 확정은 전체 회차를 저장한다", async ({ apiAs }) => {
  const owner = await apiAs("user1");
  const room = (await expectData<RoomDto[]>(await owner.get("/api/v1/rooms"))).data[0];
  const input = { roomId: room.id, date: addDays(kstToday(), 160), start: "10:00", end: "11:00", attendees: 2, title: uniqueTitle("반복"), occurrences: 3, intervalWeeks: 2 };
  const query = `/api/v1/bookings?q=${encodeURIComponent(input.title)}`;
  const preview = (await expectData<RecurringBookingPreview>(await owner.post(`${URL}/preview`, { data: input }))).data;
  expect(preview).toMatchObject({ canCreate: true, slots: [{ available: true }, { available: true }, { available: true }] });
  expect((await expectData<BookingDto[]>(await owner.get(query))).data).toHaveLength(0);
  const saved = (await expectData<BookingDto[]>(await owner.post(URL, { data: input }), 201)).data;
  expect(saved.map((b) => kstParts(b.startAt).date)).toEqual([input.date, addDays(input.date, 14), addDays(input.date, 28)]);
  expect((await expectData<BookingDto[]>(await owner.get(query))).data).toHaveLength(3);
});

test("TC-BOOKING_SERIES-API-002 미리보기 이후 중간 일정 선점은 409와 전체 롤백", async ({ apiAs }) => {
  const owner = await apiAs("user1");
  const other = await apiAs("user2");
  const room = (await expectData<RoomDto[]>(await owner.get("/api/v1/rooms"))).data[0];
  const input = { roomId: room.id, date: addDays(kstToday(), 161), start: "10:00", end: "11:00", attendees: 2, title: uniqueTitle("롤백"), occurrences: 3, intervalWeeks: 1 };
  expect((await expectData<RecurringBookingPreview>(await owner.post(`${URL}/preview`, { data: input }))).data.canCreate).toBe(true);
  const occupied = (await expectData<BookingDto>(await other.post("/api/v1/bookings", { data: {
    roomId: room.id, date: addDays(input.date, 7), start: input.start, end: input.end, attendees: 2, title: uniqueTitle("선점"),
  } }), 201)).data;
  const failure = await expectError(await owner.post(URL, { data: input }), BookingErrors.BOOKING_SERIES_CONFLICT);
  expect(failure.fieldErrors?.date?.[0]).toContain(addDays(input.date, 7));
  expect((await expectData<BookingDto[]>(await owner.get(`/api/v1/bookings?q=${encodeURIComponent(input.title)}`))).data).toHaveLength(0);
  const preview = (await expectData<RecurringBookingPreview>(await owner.post(`${URL}/preview`, { data: input }))).data;
  expect(preview.slots.map((s) => s.available)).toEqual([true, false, true]);
  expect(preview.canCreate).toBe(false);
  expect((await expectData<BookingDto>(await other.get(`/api/v1/bookings/${occupied.id}`))).data.status).toBe("CONFIRMED");
});

test("TC-BOOKING_SERIES-API-003 동시 확정은 한 묶음만 성공하고 다른 묶음은 전체 거부", async ({ apiAs }) => {
  const first = await apiAs("user1");
  const second = await apiAs("user2");
  const room = (await expectData<RoomDto[]>(await first.get("/api/v1/rooms"))).data[0];
  const title = uniqueTitle("경합");
  const input = { roomId: room.id, date: addDays(kstToday(), 162), start: "10:00", end: "11:00", attendees: 2, title, occurrences: 3, intervalWeeks: 1 };
  const responses = await Promise.all([first.post(URL, { data: input }), second.post(URL, { data: input })]);
  expect(responses.map((r) => r.status()).sort()).toEqual([201, 409]);
  for (const response of responses) {
    if (response.status() === 201) expect((await expectData<BookingDto[]>(response, 201)).data).toHaveLength(3);
    else await expectError(response, BookingErrors.BOOKING_SERIES_CONFLICT);
  }
  const saved = (await expectData<BookingDto[]>(await first.get(`/api/v1/bookings?q=${encodeURIComponent(title)}`))).data;
  expect(saved).toHaveLength(3);
  expect(new Set(saved.map((b) => b.owner.id)).size).toBe(1);
});

test("TC-BOOKING_SERIES-API-004 인증과 횟수·간격·시간·unknown 필드 검증 후 건수 불변", async ({ apiAs }) => {
  const anon = await apiAs(null);
  const owner = await apiAs("user1");
  for (const path of [URL, `${URL}/preview`]) await expectError(await anon.post(path, { data: {} }), CommonErrors.AUTH_REQUIRED);
  const room = (await expectData<RoomDto[]>(await owner.get("/api/v1/rooms"))).data[0];
  const input = { roomId: room.id, date: addDays(kstToday(), 163), start: "10:00", end: "11:00", attendees: 2, title: uniqueTitle("검증"), occurrences: 3, intervalWeeks: 1 };
  for (const path of [URL, `${URL}/preview`]) {
    for (const change of [{ occurrences: 13 }, { intervalWeeks: 0 }, { end: "10:00" }, { ownerId: crypto.randomUUID() }]) {
      await expectError(await owner.post(path, { data: { ...input, ...change } }), CommonErrors.VALIDATION_ERROR);
    }
  }
  expect((await expectData<BookingDto[]>(await owner.get(`/api/v1/bookings?q=${encodeURIComponent(input.title)}`))).data).toHaveLength(0);
});
