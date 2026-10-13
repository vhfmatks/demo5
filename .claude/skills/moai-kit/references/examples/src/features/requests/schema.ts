// [공유] 서버·클라이언트 공용: enum, 라벨, zod 입력 스키마, DTO 타입
// 주의: drizzle-kit 이 import 하므로 "@/" 별칭 금지(상대경로만), server-only 금지
import { z } from "zod";

export const REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELED"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING: "대기",
  APPROVED: "승인",
  REJECTED: "반려",
  CANCELED: "취소",
};

export const REQUEST_CATEGORIES = ["EQUIPMENT", "ACCESS", "LEAVE", "ETC"] as const;
export type RequestCategory = (typeof REQUEST_CATEGORIES)[number];
export const CATEGORY_LABEL: Record<RequestCategory, string> = {
  EQUIPMENT: "장비",
  ACCESS: "권한",
  LEAVE: "휴가",
  ETC: "기타",
};

// ── 입력 스키마 (REQ-xx 의 입력 조건을 그대로 코드로) ────────
const RequestFields = {
  title: z.string().trim().min(2, "제목은 2자 이상").max(100, "제목은 100자 이하"),
  category: z.enum(REQUEST_CATEGORIES, { error: "분류를 선택해 주세요." }),
  description: z.string().trim().max(2000, "내용은 2000자 이하"),
};
export const CreateRequestInput = z.strictObject({ ...RequestFields, description: RequestFields.description.default("") });
export type CreateRequestInput = z.infer<typeof CreateRequestInput>;

/** AI 분류 추천 입력(작성 중인 제목·내용)과 결과. 결과는 enum 으로 다시 검사한다(AI 출력 = 신뢰하지 않는 입력). */
export const SuggestRequestInput = z.strictObject({ title: RequestFields.title, description: RequestFields.description.default("") });
export type SuggestRequestInput = z.infer<typeof SuggestRequestInput>;
export const RequestSuggestion = z.object({ category: z.enum(REQUEST_CATEGORIES), reason: z.string().trim().max(200) });
export type RequestSuggestion = z.infer<typeof RequestSuggestion>;

export const UpdateRequestInput = z.strictObject(RequestFields).partial().refine(
  (input) => Object.keys(input).length > 0,
  { message: "수정할 항목을 하나 이상 입력해 주세요." },
);
export type UpdateRequestInput = z.infer<typeof UpdateRequestInput>;

// ── AI 수행계획 보조: 초안 생성은 저장하지 않는다. 저장은 사람이 확인한 글 + 화면이 본 version ──
export const EXECUTION_PLAN_MAX = 2000;
const ExpectedVersion = z.number().int().min(1);
export const SuggestPlanInput = z.strictObject({ expectedVersion: ExpectedVersion });
export type SuggestPlanInput = z.infer<typeof SuggestPlanInput>;
/** AI 출력 = 신뢰하지 않는 입력. 길이를 다시 검사한다(넘으면 502). */
export const PlanDraft = z.object({ plan: z.string().trim().min(1).max(EXECUTION_PLAN_MAX) });
/** 초안 + 생성에 쓴 version. 클라이언트는 이 version 이 현재와 다르면 초안을 버린다. */
export type PlanSuggestion = { plan: string; sourceVersion: number };
/** 빈 문자열 = 수행계획 삭제(null 저장). 서버는 클라이언트의 AI 출처 주장을 받지 않는다. */
export const SaveExecutionPlanInput = z.strictObject({
  executionPlan: z.string().trim().max(EXECUTION_PLAN_MAX, `수행계획은 ${EXECUTION_PLAN_MAX}자 이하`),
  expectedVersion: ExpectedVersion,
});
export type SaveExecutionPlanInput = z.infer<typeof SaveExecutionPlanInput>;

export const TRANSITION_ACTIONS =["approve", "reject", "cancel"] as const;
export type TransitionAction = (typeof TRANSITION_ACTIONS)[number];
export const TransitionInput = z
  .strictObject({
    action: z.enum(TRANSITION_ACTIONS),
    note: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.action !== "reject" || (v.note && v.note.length >= 2), {
    path: ["note"],
    message: "반려 사유를 2자 이상 입력해 주세요.",
  });
export type TransitionInput = z.infer<typeof TransitionInput>;

// 목록 보기: 전체(권한 범위 내) · 내 요청 · 결재함(타인의 대기 요청, 승인자·관리자용)
export const REQUEST_VIEWS = ["all", "mine", "inbox"] as const;
export type RequestView = (typeof REQUEST_VIEWS)[number];
export const VIEW_LABEL: Record<RequestView, string> = { all: "전체", mine: "내 요청", inbox: "결재 대기" };

export const ListRequestQuery = z.object({
  view: z.enum(REQUEST_VIEWS).optional().catch(undefined), // 생략 = all
  status: z.enum(REQUEST_STATUSES).optional().catch(undefined),
  category: z.enum(REQUEST_CATEGORIES).optional().catch(undefined),
  q: z.string().trim().max(50).optional().catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10).catch(10),
});
export type ListRequestQuery = z.infer<typeof ListRequestQuery>;

/** 감사로그 기반 처리 이력의 행위 라벨 */
export const HISTORY_LABEL: Record<string, string> = {
  create: "등록", update: "수정", plan_update: "계획", approve: "승인", reject: "반려", cancel: "취소", delete: "삭제",
};
export type RequestHistoryDto = {
  id: string;
  action: string; // create·update·approve·reject·cancel
  actor: { id: string; name: string } | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
};

// ── 응답 DTO (DB 행을 그대로 내보내지 않는다) ────────────────
export type RequestDto = {
  id: string;
  title: string;
  category: RequestCategory;
  description: string;
  status: RequestStatus;
  requester: { id: string; name: string };
  approver: { id: string; name: string } | null;
  decisionNote: string | null;
  executionPlan: string | null;
  version: number; // 변경마다 +1 (동시 변경 판정)
  createdAt: string; // ISO
  updatedAt: string;
};
