// [공유] 권한 규칙 = 순수 함수. 서버(service)는 강제, 클라이언트는 버튼 표시 여부에만 사용.
// SEC 항목과 1:1로 대응시키고 tests/unit 에서 표로 검증한다.
import { can } from "../../lib/permissions";
import type { Department } from "../../lib/departments";
import type { Role } from "../../lib/roles";
import type { RequestStatus, TransitionAction } from "./schema";

type Actor = { id: string; role: Role; department?: Department | null };
type Target = { requesterId: string; status: RequestStatus; requesterDepartment?: Department | null };

const isOwner = (a: Actor, t: Target) => a.id === t.requesterId;

/** 같은 부서 조회: request.read.dept + 부서가 지정되어 있고 요청자와 같음 */
const sameDept = (a: Actor, t: Target) => can(a, "request.read.dept") && !!a.department && a.department === t.requesterDepartment;

/** 조회: 본인 요청 또는 request.read.all, 부서장은 같은 부서 요청 (SEC-03) */
export const canView = (a: Actor, t: Target) => isOwner(a, t) || can(a, "request.read.all") || sameDept(a, t);

/** 수정: 본인 + 대기 상태 */
export const canEdit = (a: Actor, t: Target) => isOwner(a, t) && t.status === "PENDING";

/** 삭제: 본인(대기 상태) 또는 request.delete.any */
export const canDelete = (a: Actor, t: Target) =>
  can(a, "request.delete.any") || (isOwner(a, t) && t.status === "PENDING");

/** 상태 전이 규칙표 */
export const TRANSITIONS: Record<
  TransitionAction,
  { from: RequestStatus[]; to: RequestStatus; allowed: (a: Actor, t: Target) => boolean }
> = {
  // 승인·반려: request.decide 권한, 단 본인 요청은 불가(직무 분리)
  approve: { from: ["PENDING"], to: "APPROVED", allowed: (a, t) => can(a, "request.decide") && !isOwner(a, t) },
  reject: { from: ["PENDING"], to: "REJECTED", allowed: (a, t) => can(a, "request.decide") && !isOwner(a, t) },
  // 취소: 요청자 본인만
  cancel: { from: ["PENDING"], to: "CANCELED", allowed: (a, t) => isOwner(a, t) },
};

export const allowedActions = (a: Actor, t: Target): TransitionAction[] =>
  (Object.keys(TRANSITIONS) as TransitionAction[]).filter(
    (k) => TRANSITIONS[k].from.includes(t.status) && TRANSITIONS[k].allowed(a, t),
  );

/** 목록 범위: request.read.all = 전체, request.read.dept(부서 지정) = 같은 부서, 그 외 본인 것만. server/scope.ts ownerScope 로 적용 */
export const listScope = (a: Actor): "all" | "dept" | "own" =>
  can(a, "request.read.all") ? "all" : can(a, "request.read.dept") && a.department ? "dept" : "own";
