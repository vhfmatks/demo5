// 권한 규칙 표 검증 — docs/security-compliance.md 의 SEC-03, SEC-04 근거
import { describe, expect, it } from "vitest";
import { allowedActions, canDelete, canEdit, canView, listScope } from "@/features/requests/policy";

const owner = { id: "u1", role: "USER" as const };
const other = { id: "u2", role: "USER" as const };
const approver = { id: "a1", role: "APPROVER" as const };
const admin = { id: "ad", role: "ADMIN" as const };
const pending = { requesterId: "u1", status: "PENDING" as const };
const approved = { requesterId: "u1", status: "APPROVED" as const };

describe("requests policy", () => {
  it.each([
    ["본인", true, owner],
    ["타인(일반)", false, other],
    ["승인자", true, approver],
    ["관리자", true, admin],
  ])("조회: %s → %s", (_, expected, actor) => expect(canView(actor, pending)).toBe(expected));

  it("수정: 본인 + 대기 상태만", () => {
    expect(canEdit(owner, pending)).toBe(true);
    expect(canEdit(owner, approved)).toBe(false);
    expect(canEdit(approver, pending)).toBe(false);
  });

  it("삭제: 본인(대기) 또는 관리자", () => {
    expect(canDelete(owner, pending)).toBe(true);
    expect(canDelete(owner, approved)).toBe(false);
    expect(canDelete(other, pending)).toBe(false);
    expect(canDelete(admin, approved)).toBe(true);
  });

  it("상태 전이: 승인자는 타인 요청만 승인·반려, 요청자는 취소만", () => {
    expect(allowedActions(approver, pending)).toEqual(["approve", "reject"]);
    expect(allowedActions(owner, pending)).toEqual(["cancel"]);
    expect(allowedActions(approver, { requesterId: "a1", status: "PENDING" })).toEqual(["cancel"]); // 직무 분리: 본인 건은 취소만
    expect(allowedActions(approver, approved)).toEqual([]); // 종료 상태
  });

  it("목록 범위", () => {
    expect(listScope(owner)).toBe("own");
    expect(listScope(approver)).toBe("all");
  });
});
