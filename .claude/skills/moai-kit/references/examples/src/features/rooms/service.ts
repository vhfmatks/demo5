// [서버] 회의실 관리 (room.manage 권한). 삭제 대신 비활성화 — 예약 이력이 회의실을 참조한다.
// 안전장치: 이름 중복 409, 예정 예약이 있으면 비활성화 409, 예정 예약 인원보다 수용 인원 축소 409.
import "server-only";
import { and, asc, count, eq, gt, max, ne } from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db/client";
import { bookings, rooms } from "@/server/db/schema";
import { AppError } from "@/server/http/errors";
import { audit } from "@/server/audit";
import { assertPermission, type SessionUser } from "@/server/auth/session";
import { RoomErrors } from "./errors";
import type { AdminRoomDto, CreateRoomInput, UpdateRoomInput } from "./schema";

const ENTITY = "room";

/** 지금 이후 끝나는 확정 예약 (= 아직 사용 예정) */
const upcoming = (roomId: string) =>
  and(eq(bookings.roomId, roomId), eq(bookings.status, "CONFIRMED"), gt(bookings.endAt, new Date()));

async function load(id: string, executor: DbExecutor = db): Promise<AdminRoomDto> {
  const r = await executor.select().from(rooms).where(eq(rooms.id, id)).get();
  if (!r) throw new AppError(RoomErrors.ROOM_NOT_FOUND);
  const n = (await executor.select({ n: count() }).from(bookings).where(upcoming(id)).get())?.n ?? 0;
  return { id: r.id, name: r.name, location: r.location, capacity: r.capacity, active: r.active, upcomingBookings: n, createdAt: r.createdAt.toISOString() };
}

async function assertUniqueName(tx: DbExecutor, name: string, exceptId?: string) {
  const dup = await tx.select({ id: rooms.id }).from(rooms)
    .where(and(eq(rooms.name, name), exceptId ? ne(rooms.id, exceptId) : undefined)).get();
  if (dup) throw new AppError(RoomErrors.ROOM_NAME_DUPLICATE, { fieldErrors: { name: [RoomErrors.ROOM_NAME_DUPLICATE.message] } });
}

export async function listRoomsForAdmin(actor: SessionUser): Promise<AdminRoomDto[]> {
  assertPermission(actor, "room.manage");
  const list = await db.select({ id: rooms.id }).from(rooms).orderBy(asc(rooms.name)).all();
  return Promise.all(list.map((r) => load(r.id)));
}

export async function getRoomForAdmin(actor: SessionUser, id: string): Promise<AdminRoomDto> {
  assertPermission(actor, "room.manage");
  return load(id);
}

export async function createRoom(actor: SessionUser, input: CreateRoomInput): Promise<AdminRoomDto> {
  assertPermission(actor, "room.manage");
  return db.transaction(async (tx) => {
    await assertUniqueName(tx, input.name);
    const r = await tx.insert(rooms).values(input).returning({ id: rooms.id }).get();
    await audit(actor.id, `${ENTITY}.create`, ENTITY, r.id, { ...input }, tx);
    return load(r.id, tx);
  });
}

export async function updateRoom(actor: SessionUser, id: string, input: UpdateRoomInput): Promise<AdminRoomDto> {
  assertPermission(actor, "room.manage");
  return db.transaction(async (tx) => {
    const before = await load(id, tx);
    if (input.name !== undefined) await assertUniqueName(tx, input.name, id);
    if (input.active === false && before.active && before.upcomingBookings > 0) {
      throw new AppError(RoomErrors.ROOM_HAS_UPCOMING_BOOKINGS, {
        message: `예정된 예약 ${before.upcomingBookings}건이 있어 비활성화할 수 없습니다. 예약을 먼저 취소해 주세요.`,
      });
    }
    if (input.capacity !== undefined && input.capacity < before.capacity) {
      const peak = (await tx.select({ m: max(bookings.attendees) }).from(bookings).where(upcoming(id)).get())?.m ?? 0;
      if (peak > input.capacity) {
        throw new AppError(RoomErrors.ROOM_CAPACITY_BELOW_BOOKINGS, { fieldErrors: { capacity: [`예정된 예약 중 최대 인원이 ${peak}명입니다.`] } });
      }
    }
    await tx.update(rooms).set(input).where(eq(rooms.id, id)).run();
    const changes = Object.fromEntries(
      (Object.keys(input) as (keyof UpdateRoomInput)[])
        .filter((k) => input[k] !== before[k])
        .map((k) => [k, { from: before[k], to: input[k] }]),
    );
    const action = input.active === false && before.active ? "deactivate" : input.active === true && !before.active ? "activate" : "update";
    if (Object.keys(changes).length) await audit(actor.id, `${ENTITY}.${action}`, ENTITY, id, { changes }, tx);
    return load(id, tx);
  });
}
