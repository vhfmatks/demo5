import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { BookingErrors } from "@/features/bookings/errors";
import { RecurringBookingInput, addDays, expandRecurringBookings, kstParts, kstToday } from "@/features/bookings/schema";
import * as svc from "@/features/bookings/service";
import * as auditService from "@/server/audit";
import { db } from "@/server/db/client";
import { auditLogs, bookings, rooms } from "@/server/db/schema";
import { makeUser } from "./fixtures";

const makeInput = async () => {
  const room = await db.insert(rooms).values({ name: `반복룸-${crypto.randomUUID()}`, capacity: 6 }).returning().get();
  return RecurringBookingInput.parse({
    roomId: room.id, date: addDays(kstToday(), 10), start: "10:00", end: "11:00",
    title: "합성 반복 회의", attendees: 2, occurrences: 3, intervalWeeks: 2,
  });
};
const stored = (ownerId: string) => db.select().from(bookings).where(eq(bookings.ownerId, ownerId)).all();
const logs = (actorId: string) => db.select().from(auditLogs).where(eq(auditLogs.actorId, actorId)).all();

describe("반복 예약", () => {
  it("횟수·간격·시간 규칙·unknown 필드를 검증하고 연도 경계를 KST로 계산한다", async () => {
    const input = await makeInput();
    for (const change of [{ occurrences: 1 }, { occurrences: 13 }, { occurrences: 2.5 }, { intervalWeeks: 0 }, { intervalWeeks: 5 }, { end: "10:00" }, { ownerId: crypto.randomUUID() }]) {
      expect(RecurringBookingInput.safeParse({ ...input, ...change }).success).toBe(false);
    }
    expect(expandRecurringBookings({ ...input, date: "2026-12-25", intervalWeeks: 1 }).map((slot) => slot.date))
      .toEqual(["2026-12-25", "2027-01-01", "2027-01-08"]);
  });

  it("미리보기는 쓰기 없이 충돌 날짜를 반환하고 모든 회차가 성공하면 감사로그도 함께 저장한다", async () => {
    const actor = await makeUser();
    const input = await makeInput();
    const preview = await svc.previewRecurringBookings(actor, input);
    expect(preview.canCreate).toBe(true);
    expect(await stored(actor.id)).toHaveLength(0);
    expect(await logs(actor.id)).toHaveLength(0);
    const result = await svc.createRecurringBookings(actor, input);
    expect(result.map((b) => kstParts(b.startAt).date)).toEqual(preview.slots.map((slot) => slot.date));
    expect(await stored(actor.id)).toHaveLength(3);
    const audit = await logs(actor.id);
    expect(audit).toHaveLength(3);
    expect(new Set(audit.map((log) => log.detail?.seriesId)).size).toBe(1);
    expect(audit.map((log) => log.detail?.occurrence).sort()).toEqual([1, 2, 3]);
  });

  it("미리보기 이후 중간 회차가 선점되면 앞선 예약·감사로그도 롤백한다", async () => {
    const actor = await makeUser();
    const other = await makeUser();
    const input = await makeInput();
    expect((await svc.previewRecurringBookings(actor, input)).canCreate).toBe(true);
    const occupied = await svc.createBooking(other, expandRecurringBookings(input)[1]);
    const preview = await svc.previewRecurringBookings(actor, input);
    expect(preview.slots.map((slot) => slot.available)).toEqual([true, false, true]);
    expect(preview.canCreate).toBe(false);
    await expect(svc.createRecurringBookings(actor, input)).rejects.toMatchObject({
      code: BookingErrors.BOOKING_SERIES_CONFLICT.code,
      fieldErrors: { date: [expect.stringContaining(preview.slots[1].date)] },
    });
    expect(await stored(actor.id)).toHaveLength(0);
    expect(await logs(actor.id)).toHaveLength(0);
    expect((await svc.getBooking(other, occupied.id)).status).toBe("CONFIRMED");
  });

  it("2회차 감사로그 저장 실패 시 모든 예약·로그를 롤백한다", async () => {
    const actor = await makeUser();
    const input = await makeInput();
    const original = auditService.audit;
    const spy = vi.spyOn(auditService, "audit").mockImplementationOnce(original).mockRejectedValueOnce(new Error("합성 감사 장애"));
    try {
      await expect(svc.createRecurringBookings(actor, input)).rejects.toThrow("합성 감사 장애");
      expect(await stored(actor.id)).toHaveLength(0);
      expect(await logs(actor.id)).toHaveLength(0);
    } finally {
      spy.mockRestore();
    }
  });
});
