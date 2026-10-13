// [공유] 예약 권한 (순수 함수). 회의실 일정은 사내 공유 정보 → 로그인 사용자 모두 조회(별도 규칙 없음).
// 수정 = 예약자 본인, 취소 = 예약자 또는 booking.cancel.any 권한. 둘 다 확정 상태이면서 시작 전이어야 한다(시각은 서비스가 강제).
import { can } from "../../lib/permissions";
import type { Role } from "../../lib/roles";
import type { BookingStatus } from "./schema";

type Actor = { id: string; role: Role };
type Target = { ownerId: string; status: BookingStatus };

export const canEdit = (a: Actor, t: Target) => a.id === t.ownerId && t.status === "CONFIRMED";
export const canCancel = (a: Actor, t: Target) => (a.id === t.ownerId || can(a, "booking.cancel.any")) && t.status === "CONFIRMED";
