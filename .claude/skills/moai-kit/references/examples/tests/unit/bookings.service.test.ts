// 회의실 예약 서비스 (메모리 DB) — 시간 규칙·겹침·경계·인원·권한·상태
import { describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { rooms } from "@/server/db/schema";
import { AppError } from "@/server/http/errors";
import * as svc from "@/features/bookings/service";
import { CreateBookingInput, addDays, kstToday } from "@/features/bookings/schema";
import { BookingErrors } from "@/features/bookings/errors";
import { makeUser } from "./fixtures";

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "OK";
  } catch (e) {
    return e instanceof AppError ? e.code : e instanceof Error ? e.name : String(e);
  }
};
let n = 0;
const makeRoom = async (capacity = 6, active = true) =>
  (await db.insert(rooms).values({ name: `테스트룸${++n}-${Date.now()}`, capacity, active }).returning().get()).id;
const day = addDays(kstToday(), 10);
const input = (roomId: string, start: string, end: string, extra: Partial<CreateBookingInput> = {}) =>
  CreateBookingInput.parse({ roomId, date: day, start, end, attendees: 2, title: "회의", ...extra });

describe("bookings schema", () => {
  it("시간 규칙: 종료>시작·최대 4시간·30분 단위·운영시간", () => {
    const base = { roomId: crypto.randomUUID(), date: day, attendees: 2, title: "x" };
    const issue = (v: object) => CreateBookingInput.safeParse({ ...base, ...v }).error?.issues[0]?.path.join(".");
    expect(issue({ start: "10:00", end: "10:00" })).toBe("end");
    expect(issue({ start: "09:00", end: "13:30" })).toBe("end");
    expect(issue({ start: "10:15", end: "11:00" })).toBe("start");
    expect(issue({ start: "07:30", end: "09:00" })).toBe("start");
    expect(issue({ start: "20:00", end: "21:30" })).toBe("end");
    expect(issue({ start: "09:00", end: "13:00" })).toBeUndefined();
    expect(issue({ date: "2026-02-30", start: "09:00", end: "10:00" })).toBe("date");
  });
});

describe("bookings service", () => {
  it("겹치면 BOOKING_TIME_CONFLICT, 경계가 맞닿거나 다른 회의실이면 허용, 취소된 시간은 재사용", async () => {
    const [u, other] = await Promise.all([makeUser(), makeUser()]);
    const [room, room2] = await Promise.all([makeRoom(), makeRoom()]);
    const first = await svc.createBooking(u, input(room, "10:00", "11:00"));
    expect(await code(svc.createBooking(other, input(room, "10:30", "11:30")))).toBe(BookingErrors.BOOKING_TIME_CONFLICT.code);
    expect(await code(svc.createBooking(other, input(room, "09:00", "12:00")))).toBe(BookingErrors.BOOKING_TIME_CONFLICT.code);
    expect(await code(svc.createBooking(other, input(room, "11:00", "12:00")))).toBe("OK");
    expect(await code(svc.createBooking(other, input(room, "09:00", "10:00")))).toBe("OK");
    expect(await code(svc.createBooking(other, input(room2, "10:00", "11:00")))).toBe("OK");
    await svc.cancelBooking(u, first.id, {});
    expect(await code(svc.createBooking(other, input(room, "10:00", "11:00")))).toBe("OK");
  });

  it("인원 초과·비활성 회의실·지난 시각은 필드 오류", async () => {
    const u = await makeUser();
    const [small, closed] = await Promise.all([makeRoom(2), makeRoom(6, false)]);
    expect(await code(svc.createBooking(u, input(small, "10:00", "11:00", { attendees: 3 })))).toBe(BookingErrors.BOOKING_OVER_CAPACITY.code);
    expect(await code(svc.createBooking(u, input(closed, "10:00", "11:00")))).toBe(BookingErrors.BOOKING_ROOM_UNAVAILABLE.code);
    const past = CreateBookingInput.parse({ roomId: small, date: addDays(kstToday(), -1), start: "10:00", end: "11:00", attendees: 1, title: "과거" });
    expect(await code(svc.createBooking(u, past))).toBe(BookingErrors.BOOKING_PAST_TIME.code);
  });

  it("수정: 본인만, 자기 자신과는 겹침 아님, 다른 예약과 겹치면 거부·값 불변, 합친 값도 시간 규칙 검사", async () => {
    const [u, other] = await Promise.all([makeUser(), makeUser()]);
    const room = await makeRoom();
    const b = await svc.createBooking(u, input(room, "13:00", "14:00"));
    await svc.createBooking(other, input(room, "15:00", "16:00"));
    expect((await svc.updateBooking(u, b.id, { end: "14:30" })).endAt).not.toBe(b.endAt);
    expect(await code(svc.updateBooking(u, b.id, { start: "14:30", end: "15:30" }))).toBe(BookingErrors.BOOKING_TIME_CONFLICT.code);
    expect(await code(svc.updateBooking(other, b.id, { title: "탈취" }))).toBe(BookingErrors.BOOKING_EDIT_FORBIDDEN.code);
    expect(await code(svc.updateBooking(u, b.id, { start: "15:00" }))).toBe("ZodError"); // 종료(14:30) < 시작
    expect((await svc.getBooking(u, b.id)).title).toBe("회의");
  });

  it("취소: 본인·관리자 가능, 타인 거부, 재취소·취소 후 수정은 상태 오류", async () => {
    const [u, other, admin] = await Promise.all([makeUser(), makeUser(), makeUser("ADMIN")]);
    const room = await makeRoom();
    const b = await svc.createBooking(u, input(room, "17:00", "18:00"));
    expect(await code(svc.cancelBooking(other, b.id, {}))).toBe(BookingErrors.BOOKING_CANCEL_FORBIDDEN.code);
    expect((await svc.cancelBooking(admin, b.id, { reason: "시설 점검" })).status).toBe("CANCELED");
    expect(await code(svc.cancelBooking(u, b.id, {}))).toBe(BookingErrors.BOOKING_NOT_CONFIRMED.code);
    expect(await code(svc.updateBooking(u, b.id, { title: "x" }))).toBe(BookingErrors.BOOKING_NOT_CONFIRMED.code);
  });
  // 동시 요청 직렬화는 메모리 DB(단일 연결)로 검증할 수 없어 E2E TC-BOOKING-API-005 에서 실제 파일 DB 로 확인한다.
});
