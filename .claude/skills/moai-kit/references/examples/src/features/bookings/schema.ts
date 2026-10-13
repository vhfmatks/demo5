// [공유] 회의실 예약 — enum·라벨·시간 규칙·zod 입력·DTO.
// 시간은 Asia/Seoul(+09:00) 기준 날짜(YYYY-MM-DD) + 30분 단위 시각(HH:mm)으로 입력받고, DB 에는 UTC timestamp 로 저장한다.
// 주의: "@/" 별칭 금지(drizzle-kit 호환), server-only 금지
import { z } from "zod";

export const BOOKING_STATUSES = ["CONFIRMED", "CANCELED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = { CONFIRMED: "확정", CANCELED: "취소" };

// ── 시간 규칙 (요구사항이 바뀌면 이 상수만 수정) ──────────
export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 21;
export const SLOT_MINUTES = 30;
export const MAX_HOURS = 4;
/** 08:00, 08:30, … 21:00 */
export const SLOT_TIMES = Array.from({ length: ((CLOSE_HOUR - OPEN_HOUR) * 60) / SLOT_MINUTES + 1 }, (_, i) => {
  const m = OPEN_HOUR * 60 + i * SLOT_MINUTES;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

/** KST 날짜·시각 → Date */
export const kstDate = (date: string, time = "00:00") => new Date(`${date}T${time}:00+09:00`);
/** Date → KST { date: YYYY-MM-DD, time: HH:mm } */
export function kstParts(d: Date | string) {
  const s = new Date(new Date(d).getTime() + 9 * 3_600_000).toISOString();
  return { date: s.slice(0, 10), time: s.slice(11, 16) };
}
export const kstToday = () => kstParts(new Date()).date;
export const addDays = (date: string, n: number) => kstParts(new Date(kstDate(date).getTime() + n * 86_400_000)).date;

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜를 선택해 주세요.")
  .refine((s) => !Number.isNaN(kstDate(s).getTime()) && kstParts(kstDate(s)).date === s, "올바른 날짜가 아닙니다.");
const timeField = z.enum(SLOT_TIMES as [string, ...string[]], { error: `${SLOT_MINUTES}분 단위 시각을 선택해 주세요.` });

const BookingFields = {
  roomId: z.uuid("회의실을 선택해 주세요."),
  date: dateField,
  start: timeField,
  end: timeField,
  attendees: z.coerce.number({ error: "인원을 입력해 주세요." }).int("정수로 입력해 주세요.").min(1, "1명 이상"),
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(100, "100자 이하"),
  memo: z.string().trim().max(2000, "2000자 이하"),
};

/** 시간 범위 규칙: 종료 > 시작, 최대 MAX_HOURS 시간 (운영시간·단위는 timeField 가 보장) */
const slotRules = (v: { start: string; end: string }, ctx: z.RefinementCtx) => {
  const len = minutes(v.end) - minutes(v.start);
  if (len <= 0) ctx.addIssue({ code: "custom", path: ["end"], message: "종료 시각은 시작 이후여야 합니다." });
  else if (len > MAX_HOURS * 60) ctx.addIssue({ code: "custom", path: ["end"], message: `최대 ${MAX_HOURS}시간까지 예약할 수 있습니다.` });
};

export const CreateBookingInput = z.strictObject({ ...BookingFields, memo: BookingFields.memo.default("") }).superRefine(slotRules);
export type CreateBookingInput = z.infer<typeof CreateBookingInput>;

export const MAX_OCCURRENCES = 12;
export const RecurringBookingInput = z.strictObject({
  ...BookingFields,
  memo: BookingFields.memo.default(""),
  occurrences: z.coerce.number().int().min(2, "2회 이상").max(MAX_OCCURRENCES, `최대 ${MAX_OCCURRENCES}회`),
  intervalWeeks: z.coerce.number().int().min(1, "1주 이상").max(4, "최대 4주 간격"),
}).superRefine(slotRules);
export type RecurringBookingInput = z.infer<typeof RecurringBookingInput>;

/** 날짜 계산을 서버에서만 수행하고 미리보기와 확정이 같은 계획을 사용한다. */
export function expandRecurringBookings(input: RecurringBookingInput): CreateBookingInput[] {
  const { occurrences, intervalWeeks, ...booking } = input;
  return Array.from({ length: occurrences }, (_, i) => ({ ...booking, date: addDays(input.date, i * intervalWeeks * 7) }));
}

export type RecurringBookingPreview = {
  slots: { date: string; start: string; end: string; available: boolean }[];
  canCreate: boolean;
};

/** 수정은 부분 입력. 서비스가 기존 값과 합친 뒤 CreateBookingInput 규칙으로 다시 검증한다. */
export const UpdateBookingInput = z.strictObject(BookingFields).partial().refine(
  (input) => Object.keys(input).length > 0,
  { message: "수정할 항목을 하나 이상 입력해 주세요." },
);
export type UpdateBookingInput = z.infer<typeof UpdateBookingInput>;

export const CancelBookingInput = z.strictObject({ reason: z.string().trim().max(200, "200자 이하").optional() });
export type CancelBookingInput = z.infer<typeof CancelBookingInput>;

export const ListBookingQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  roomId: z.uuid().optional().catch(undefined),
  mine: z.enum(["1"]).optional().catch(undefined), // 내 예약만
  upcoming: z.enum(["1"]).optional().catch(undefined), // 지금 이후 종료
  status: z.enum(BOOKING_STATUSES).optional().catch(undefined),
  q: z.string().trim().max(50).optional().catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20).catch(20),
});
export type ListBookingQuery = z.infer<typeof ListBookingQuery>;

export const DayQuery = z.object({ date: dateField.optional().catch(undefined) });

export type RoomDto = { id: string; name: string; location: string; capacity: number };

export type BookingDto = {
  id: string;
  title: string;
  memo: string;
  room: { id: string; name: string; capacity: number };
  owner: { id: string; name: string };
  attendees: number;
  status: BookingStatus;
  startAt: string; // ISO
  endAt: string;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
};
