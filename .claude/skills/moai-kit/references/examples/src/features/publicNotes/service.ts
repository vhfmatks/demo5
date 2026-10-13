// [서버] actor는 선택적 세션이며 쓰기 감사에만 사용한다. 공개 데이터에는 소유자 조건이 없다.
import "server-only";
import { and, count, desc, eq, like, sql } from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db/client";
import { publicNotes } from "@/server/db/schema";
import { AppError } from "@/server/http/errors";
import { audit } from "@/server/audit";
import type { SessionUser } from "@/server/auth/session";
import type { PageMeta } from "@/lib/error-codes";
import { canCreate, canDelete, canEdit, canView } from "./policy";
import { PublicNoteErrors } from "./errors";
import type { CreatePublicNoteInput, PublicNoteDto, ListPublicNoteQuery, UpdatePublicNoteInput } from "./schema";

const ENTITY = "publicNote";
const toDto = (row: typeof publicNotes.$inferSelect): PublicNoteDto => ({
  id: row.id, title: row.title, memo: row.memo, version: row.version,
  createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
});
async function loadRow(id: string, executor: DbExecutor = db) {
  const row = await executor.select().from(publicNotes).where(eq(publicNotes.id, id)).get();
  if (!row) throw new AppError(PublicNoteErrors.PUBLIC_NOTE_NOT_FOUND);
  return row;
}

export async function listPublicNotes(_actor: SessionUser | null, q: ListPublicNoteQuery): Promise<{ items: PublicNoteDto[]; meta: PageMeta }> {
  if (!canView()) throw new AppError(PublicNoteErrors.PUBLIC_NOTE_READ_FORBIDDEN);
  const where = q.q ? like(publicNotes.title, `%${q.q}%`) : undefined;
  const rows = await db.select().from(publicNotes).where(where)
    .orderBy(desc(publicNotes.createdAt), desc(publicNotes.id)).limit(q.pageSize).offset((q.page - 1) * q.pageSize).all();
  const total = (await db.select({ n: count() }).from(publicNotes).where(where).get())?.n ?? 0;
  return { items: rows.map(toDto), meta: { page: q.page, pageSize: q.pageSize, total } };
}

export async function getPublicNote(_actor: SessionUser | null, id: string): Promise<PublicNoteDto> {
  if (!canView()) throw new AppError(PublicNoteErrors.PUBLIC_NOTE_READ_FORBIDDEN);
  return toDto(await loadRow(id));
}

export async function createPublicNote(actor: SessionUser | null, input: CreatePublicNoteInput): Promise<PublicNoteDto> {
  if (!canCreate()) throw new AppError(PublicNoteErrors.PUBLIC_NOTE_CREATE_FORBIDDEN);
  return db.transaction(async (tx) => {
    const row = await tx.insert(publicNotes).values(input).returning().get();
    await audit(actor?.id ?? null, `${ENTITY}.create`, ENTITY, row.id, undefined, tx);
    return toDto(row);
  });
}

export async function updatePublicNote(actor: SessionUser | null, id: string, input: UpdatePublicNoteInput): Promise<PublicNoteDto> {
  if (!canEdit()) throw new AppError(PublicNoteErrors.PUBLIC_NOTE_EDIT_FORBIDDEN);
  const { version, ...changes } = input;
  return db.transaction(async (tx) => {
    const row = await tx.update(publicNotes).set({ ...changes, version: sql`${publicNotes.version} + 1` })
      .where(and(eq(publicNotes.id, id), eq(publicNotes.version, version))).returning().get();
    if (!row) {
      await loadRow(id, tx);
      throw new AppError(PublicNoteErrors.PUBLIC_NOTE_VERSION_CONFLICT);
    }
    await audit(actor?.id ?? null, `${ENTITY}.update`, ENTITY, id, { fields: Object.keys(changes) }, tx);
    return toDto(row);
  });
}

export async function deletePublicNote(actor: SessionUser | null, id: string, version: number): Promise<void> {
  if (!canDelete()) throw new AppError(PublicNoteErrors.PUBLIC_NOTE_DELETE_FORBIDDEN);
  await db.transaction(async (tx) => {
    const result = await tx.delete(publicNotes).where(and(eq(publicNotes.id, id), eq(publicNotes.version, version))).run();
    if (result.rowsAffected === 0) {
      await loadRow(id, tx);
      throw new AppError(PublicNoteErrors.PUBLIC_NOTE_VERSION_CONFLICT);
    }
    await audit(actor?.id ?? null, `${ENTITY}.delete`, ENTITY, id, undefined, tx);
  });
}
