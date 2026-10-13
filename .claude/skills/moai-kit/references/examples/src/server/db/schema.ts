// 모든 테이블은 이 파일 하나에 정의한다. (AI가 읽을 파일 수를 줄이기 위함)
// 규칙: id = text(UUID), 시간 = integer(timestamp_ms), enum = text({ enum }), FK는 references()
// enum 값 배열은 features/<도메인>/schema.ts 에 두고 여기서 import (클라이언트와 공유하기 위함)
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
// drizzle-kit 이 이 파일을 직접 읽으므로 "@/" 별칭 대신 상대경로를 쓴다
import { ROLES } from "../../lib/roles";
import { REQUEST_CATEGORIES, REQUEST_STATUSES } from "../../features/requests/schema";
import { BOOKING_STATUSES } from "../../features/bookings/schema";
import { DEPARTMENTS } from "../../lib/departments";
import { AI_KINDS } from "../../features/ai/schema";
// @gen:imports
export type { Role } from "../../lib/roles";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
    .$defaultFn(() => new Date()); // ms 정밀도 (정렬 안정성)
const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());

// ── 공통: 사용자·세션·감사로그 ──────────────────────────────
export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ROLES }).notNull().default("USER"),
  department: text("department", { enum: DEPARTMENTS }), // null = 미지정. 부서 범위 조회는 server/scope.ts
  createdAt: createdAt(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // 랜덤 토큰의 SHA-256 해시 (원문 토큰은 쿠키에만 존재)
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: createdAt(),
});

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: id(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(), // 예: request.create, request.approve
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    detail: text("detail", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("audit_entity_idx").on(t.entity, t.entityId), index("audit_created_idx").on(t.createdAt)],
);

// 운영 설정 (key-value). 값 형식·기본값은 features/settings/schema.ts 의 SETTING_FIELDS 가 단일 기준. 비밀값은 넣지 않는다(.env 사용).
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).$type<unknown>().notNull(),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

// ── 레퍼런스 도메인: 요청·승인 워크플로 ─────────────────────
export const requests = sqliteTable(
  "requests",
  {
    id: id(),
    title: text("title").notNull(),
    category: text("category", { enum: REQUEST_CATEGORIES }).notNull(),
    description: text("description").notNull().default(""),
    status: text("status", { enum: REQUEST_STATUSES }).notNull().default("PENDING"),
    requesterId: text("requester_id")
      .notNull()
      .references(() => users.id),
    approverId: text("approver_id").references(() => users.id),
    decisionNote: text("decision_note"),
    executionPlan: text("execution_plan"), // 수행계획(사람이 확인·저장한 글, 최대 2000자는 공유 스키마가 검증). null = 없음
    version: integer("version").notNull().default(1), // 모든 변경에서 +1. 수정·저장·상태 전이의 동시 변경 판정(updatedAt 은 쓰지 않음)
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("requests_requester_idx").on(t.requesterId),
    index("requests_status_idx").on(t.status),
  ],
);

// ── 공개 메모: 모든 사용자가 함께 사용하는 공개 데이터 ─────
export const publicNotes = sqliteTable(
  "public_notes",
  {
    id: id(),
    title: text("title").notNull(),
    memo: text("memo").notNull().default(""),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("public_notes_created_idx").on(t.createdAt)],
);

// ── 회의실 예약: 회의실(마스터) + 예약 ─────────────────────
export const rooms = sqliteTable("rooms", {
  id: id(),
  name: text("name").notNull().unique(),
  location: text("location").notNull().default(""),
  capacity: integer("capacity").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

export const bookings = sqliteTable(
  "bookings",
  {
    id: id(),
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    memo: text("memo").notNull().default(""),
    attendees: integer("attendees").notNull(),
    startAt: integer("start_at", { mode: "timestamp_ms" }).notNull(),
    endAt: integer("end_at", { mode: "timestamp_ms" }).notNull(),
    status: text("status", { enum: BOOKING_STATUSES }).notNull().default("CONFIRMED"),
    cancelReason: text("cancel_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("bookings_room_time_idx").on(t.roomId, t.startAt), // 겹침 검사·일간 조회
    index("bookings_owner_idx").on(t.ownerId),
  ],
);

// ── AI 공급자·모델 (관리자 포털 > AI). 키는 server/secret.ts 로 암호화해 저장한다 ──
export const aiProviders = sqliteTable("ai_providers", {
  id: id(),
  name: text("name").notNull().unique(),
  kind: text("kind", { enum: AI_KINDS }).notNull(),
  baseUrl: text("base_url").notNull(),
  apiKeyEnc: text("api_key_enc"), // null = 키 없음(로컬 모델)
  apiKeyHint: text("api_key_hint"), // 끝 4자리 표시용
  createdAt: createdAt(),
});

export const aiModels = sqliteTable(
  "ai_models",
  {
    id: id(),
    providerId: text("provider_id")
      .notNull()
      .references(() => aiProviders.id, { onDelete: "cascade" }),
    model: text("model").notNull(), // 공급자의 모델 ID
    label: text("label").notNull(), // 기능 코드가 부르는 이름 (aiComplete({ model: label }))
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("ai_models_label_idx").on(t.label), index("ai_models_provider_idx").on(t.providerId)],
);

// @gen:tables — `npm run gen` 이 이 줄 위에 새 테이블을 추가한다. 지우지 말 것.
