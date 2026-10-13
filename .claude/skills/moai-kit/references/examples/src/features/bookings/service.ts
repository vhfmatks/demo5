// [서버] 회의실 예약. 규칙은 features/requests/service.ts 와 동일하고, 추가로:
//  - 시간 겹침 검사와 저장을 같은 쓰기 트랜잭션에서 수행한다(libsql 기본 BEGIN IMMEDIATE → 동시 요청 직렬화).
//  - 겹침 조건: 같은 회의실·확정 상태·(기존.시작 < 새.종료) AND (기존.종료 > 새.시작). 경계가 맞닿는 건 허용.
import "server-only";
import { and, asc, count, desc, eq, gt, gte, like, lt, ne, type SQL } from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db/client";
import { bookings, rooms, users } from "@/server/db/schema";
import { AppError } from "@/server/http/errors";
import { audit } from "@/server/audit";
import type { SessionUser } from "@/server/auth/session";
import type { PageMeta } from "@/lib/error-codes";
import { gridRange, type CalendarEvent } from "@/lib/calendar";
import { canCancel, canEdit } from "./policy";
import { BookingErrors } from "./errors";
import {
  CreateBookingInput, RecurringBookingInput, expandRecurringBookings, addDays, kstDate, kstParts,
  type RecurringBookingPreview,
  type BookingDto, type CancelBookingInput, type ListBookingQuery, type RoomDto, type UpdateBookingInput,
} from "./schema";

const ENTITY = "booking";

const baseSelect = (executor: DbExecutor = db) =>
  executor
    .select({ b: bookings, ownerName: users.name, room: { id: rooms.id, name: rooms.name, capacity: rooms.capacity } })
    .from(bookings)
    .innerJoin(users, eq(users.id, bookings.ownerId))
    .innerJoin(rooms, eq(rooms.id, bookings.roomId));

type Row = { b: typeof bookings.$inferSelect; ownerName: string; room: BookingDto["room"] };
/** 일정은 모두에게 공유하되 메모(자유 입력)는 예약자 본인에게만 내보낸다(정보 최소화). */
const toDto = (actor: SessionUser) => ({ b, ownerName, room }: Row): BookingDto => ({
  id: b.id,
  title: b.title,
  memo: b.ownerId === actor.id ? b.memo : "",
  room,
  owner: { id: b.ownerId, name: ownerName },
  attendees: b.attendees,
  status: b.status,
  startAt: b.startAt.toISOString(),
  endAt: b.endAt.toISOString(),
  cancelReason: b.cancelReason,
  createdAt: b.createdAt.toISOString(),
  updatedAt: b.updatedAt.toISOString(),
});

/** 일정은 로그인 사용자 모두 조회 가능 (policy 참고) */
async function load(id: string, executor: DbExecutor = db): Promise<Row> {
  const row = await baseSelect(executor).where(eq(bookings.id, id)).get();
  if (!row) throw new AppError(BookingErrors.BOOKING_NOT_FOUND);
  return row;
}

const fieldError = (def: (typeof BookingErrors)[keyof typeof BookingErrors], field: string) =>
  new AppError(def, { fieldErrors: { [field]: [def.message] } });

/** 회의실·인원·과거 시각·겹침 검사 후 저장할 값을 돌려준다. excludeId = 수정 중인 자기 자신. */
async function checkSlot(tx: DbExecutor, input: CreateBookingInput, excludeId?: string) {
  const room = await tx.select().from(rooms).where(eq(rooms.id, input.roomId)).get();
  if (!room?.active) throw fieldError(BookingErrors.BOOKING_ROOM_UNAVAILABLE, "roomId");
  if (input.attendees > room.capacity) {
    throw new AppError(BookingErrors.BOOKING_OVER_CAPACITY, { fieldErrors: { attendees: [`최대 ${room.capacity}명까지 사용할 수 있습니다.`] } });
  }
  const startAt = kstDate(input.date, input.start);
  const endAt = kstDate(input.date, input.end);
  if (startAt.getTime() <= Date.now()) throw fieldError(BookingErrors.BOOKING_PAST_TIME, "start");
  const clash = await tx.select({ id: bookings.id }).from(bookings).where(and(
    eq(bookings.roomId, input.roomId),
    eq(bookings.status, "CONFIRMED"),
    lt(bookings.startAt, endAt),
    gt(bookings.endAt, startAt),
    excludeId ? ne(bookings.id, excludeId) : undefined,
  )).get();
  if (clash) throw new AppError(BookingErrors.BOOKING_TIME_CONFLICT);
  const { roomId, attendees, title, memo } = input;
  return { roomId, attendees, title, memo, startAt, endAt };
}

/** 시작 전 확정 예약만 변경 가능 */
function assertChangeable(b: typeof bookings.$inferSelect) {
  if (b.status !== "CONFIRMED") throw new AppError(BookingErrors.BOOKING_NOT_CONFIRMED);
  if (b.startAt.getTime() <= Date.now()) throw new AppError(BookingErrors.BOOKING_ALREADY_STARTED);
}

export async function listRooms(): Promise<RoomDto[]> {
  return db.select({ id: rooms.id, name: rooms.name, location: rooms.location, capacity: rooms.capacity })
    .from(rooms).where(eq(rooms.active, true)).orderBy(asc(rooms.name)).all();
}

export async function listBookings(actor: SessionUser, q: ListBookingQuery): Promise<{ items: BookingDto[]; meta: PageMeta }> {
  const where: SQL[] = [];
  if (q.mine) where.push(eq(bookings.ownerId, actor.id));
  if (q.roomId) where.push(eq(bookings.roomId, q.roomId));
  if (q.status) where.push(eq(bookings.status, q.status));
  if (q.date) where.push(gte(bookings.startAt, kstDate(q.date)), lt(bookings.startAt, kstDate(addDays(q.date, 1))));
  if (q.upcoming) where.push(gt(bookings.endAt, new Date()));
  if (q.q) where.push(like(bookings.title, `%${q.q}%`));
  const cond = where.length ? and(...where) : undefined;
  // 다가오는 예약은 가까운 순, 그 외는 최근 순
  const order = q.upcoming ? [asc(bookings.startAt)] : [desc(bookings.startAt), desc(bookings.id)];
  const items = (await baseSelect().where(cond).orderBy(...order).limit(q.pageSize).offset((q.page - 1) * q.pageSize).all()).map(toDto(actor));
  const total = (await db.select({ n: count() }).from(bookings).where(cond).get())?.n ?? 0;
  return { items, meta: { page: q.page, pageSize: q.pageSize, total } };
}

/** 일간 타임라인: 활성 회의실 전체 + 그날 확정 예약 + 기준 시각(지난 슬롯 판단용) */
export async function getDaySchedule(actor: SessionUser, date: string): Promise<{ rooms: RoomDto[]; bookings: BookingDto[]; now: number }> {
  const [roomList, day] = await Promise.all([
    listRooms(),
    listBookings(actor, { date, status: "CONFIRMED", page: 1, pageSize: 100 }),
  ]);
  return { rooms: roomList, bookings: day.items, now: Date.now() };
}

export async function getBooking(actor: SessionUser, id: string): Promise<BookingDto> {
  return toDto(actor)(await load(id));
}

/** 상세 화면용: 권한(policy) + 시작 전 여부를 서버에서 계산해 버튼 표시값으로 돌려준다. */
export async function getBookingDetail(actor: SessionUser, id: string) {
  const row = await load(id);
  const upcoming = row.b.startAt.getTime() > Date.now();
  return { booking: toDto(actor)(row), canEdit: upcoming && canEdit(actor, row.b), canCancel: upcoming && canCancel(actor, row.b) };
}

export async function createBooking(actor: SessionUser, input: CreateBookingInput): Promise<BookingDto> {
  return db.transaction(async (tx) => {
    const values = await checkSlot(tx, input);
    const r = await tx.insert(bookings).values({ ...values, ownerId: actor.id }).returning({ id: bookings.id }).get();
    await audit(actor.id, `${ENTITY}.create`, ENTITY, r.id, { roomId: input.roomId, date: input.date, start: input.start, end: input.end }, tx);
    return toDto(actor)(await load(r.id, tx));
  });
}

/** 미리보기는 예약을 잠그거나 저장하지 않는다. 확정할 때 모든 슬롯을 다시 검사한다. */
export async function previewRecurringBookings(_actor: SessionUser, input: RecurringBookingInput): Promise<RecurringBookingPreview> {
  const plan = expandRecurringBookings(RecurringBookingInput.parse(input));
  const slots: RecurringBookingPreview["slots"] = [];
  for (const slot of plan) {
    let available = true;
    try {
      await checkSlot(db, slot);
    } catch (e) {
      if (!(e instanceof AppError) || e.code !== BookingErrors.BOOKING_TIME_CONFLICT.code) throw e;
      available = false;
    }
    slots.push({ date: slot.date, start: slot.start, end: slot.end, available });
  }
  return { slots, canCreate: slots.every((slot) => slot.available) };
}

/** 전체 성공 또는 전체 롤백. createBooking을 반복 호출하면 트랜잭션이 나뉘므로 사용하지 않는다. */
export async function createRecurringBookings(actor: SessionUser, input: RecurringBookingInput): Promise<BookingDto[]> {
  const plan = expandRecurringBookings(RecurringBookingInput.parse(input));
  return db.transaction(async (tx) => {
    const seriesId = crypto.randomUUID();
    const result: BookingDto[] = [];
    for (const [index, slot] of plan.entries()) {
      let values: Awaited<ReturnType<typeof checkSlot>>;
      try {
        values = await checkSlot(tx, slot);
      } catch (e) {
        if (!(e instanceof AppError) || e.code !== BookingErrors.BOOKING_TIME_CONFLICT.code) throw e;
        throw new AppError(BookingErrors.BOOKING_SERIES_CONFLICT, {
          fieldErrors: { date: [`${slot.date} ${slot.start}–${slot.end}에 충돌이 있습니다. 전체 예약을 저장하지 않았습니다.`] },
          cause: e,
        });
      }
      const row = await tx.insert(bookings).values({ ...values, ownerId: actor.id }).returning({ id: bookings.id }).get();
      await audit(actor.id, `${ENTITY}.create`, ENTITY, row.id, {
        seriesId, occurrence: index + 1, occurrences: plan.length,
        roomId: slot.roomId, date: slot.date, start: slot.start, end: slot.end,
      }, tx);
      result.push(toDto(actor)(await load(row.id, tx)));
    }
    return result;
  });
}

export async function updateBooking(actor: SessionUser, id: string, input: UpdateBookingInput): Promise<BookingDto> {
  return db.transaction(async (tx) => {
    const { b } = await load(id, tx);
    if (!canEdit(actor, b)) {
      throw new AppError(b.ownerId === actor.id ? BookingErrors.BOOKING_NOT_CONFIRMED : BookingErrors.BOOKING_EDIT_FORBIDDEN);
    }
    assertChangeable(b);
    const s = kstParts(b.startAt);
    const current = { roomId: b.roomId, date: s.date, start: s.time, end: kstParts(b.endAt).time, attendees: b.attendees, title: b.title, memo: b.memo };
    // 합친 값을 생성 규칙 그대로 다시 검증 (종료>시작·최대 시간 등). 실패는 400.
    const merged = CreateBookingInput.parse({ ...current, ...input });
    const values = await checkSlot(tx, merged, id);
    const result = await tx.update(bookings).set(values)
      .where(and(eq(bookings.id, id), eq(bookings.status, "CONFIRMED"))).run();
    if (result.rowsAffected === 0) throw new AppError(BookingErrors.BOOKING_CONCURRENT_MODIFICATION);
    await audit(actor.id, `${ENTITY}.update`, ENTITY, id, { fields: Object.keys(input) }, tx);
    return toDto(actor)(await load(id, tx));
  });
}

export async function cancelBooking(actor: SessionUser, id: string, input: CancelBookingInput): Promise<BookingDto> {
  return db.transaction(async (tx) => {
    const { b } = await load(id, tx);
    if (!canCancel(actor, b)) {
      throw new AppError(b.status !== "CONFIRMED" ? BookingErrors.BOOKING_NOT_CONFIRMED : BookingErrors.BOOKING_CANCEL_FORBIDDEN);
    }
    assertChangeable(b);
    const result = await tx.update(bookings).set({ status: "CANCELED", cancelReason: input.reason ?? null })
      .where(and(eq(bookings.id, id), eq(bookings.status, "CONFIRMED"))).run();
    if (result.rowsAffected === 0) throw new AppError(BookingErrors.BOOKING_CONCURRENT_MODIFICATION);
    await audit(actor.id, `${ENTITY}.cancel`, ENTITY, id, { reason: input.reason ?? null, byOwner: actor.id === b.ownerId }, tx);
    return toDto(actor)(await load(id, tx));
  });
}

/** 달력: 보이는 날짜 범위의 확정 예약 → 이벤트(시작일·시각 KST). 내 예약은 강조. */
// ponytail: 범위당 최대 500건. 회의실이 많아 넘치면 회의실 필터(params)로 좁힌다.
export async function bookingCalendar(actor: SessionUser, days: string[]): Promise<CalendarEvent[]> {
  const { from, to } = gridRange(days);
  const rows = await baseSelect()
    .where(and(eq(bookings.status, "CONFIRMED"), gte(bookings.startAt, kstDate(from)), lt(bookings.startAt, kstDate(to))))
    .orderBy(asc(bookings.startAt)).limit(500).all();
  return rows.map(({ b, room }) => {
    const { date, time } = kstParts(b.startAt);
    return {
      id: b.id, date, time, title: `${room.name} · ${b.title}`, href: `/bookings/${b.id}`,
      tone: b.ownerId === actor.id ? "primary" : "subtle",
    };
  });
}
