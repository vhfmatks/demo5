// RBAC 매트릭스 검증 — 역할 구성을 바꾸면 이 표가 실패해 의도한 변경인지 확인하게 한다 (SEC-03)
import { describe, expect, it } from "vitest";
import { can, PERMISSION_KEYS, ROLE_PERMISSIONS, type Permission } from "@/lib/permissions";
import { ROLES, type Role } from "@/lib/roles";
import { canCancel } from "@/features/bookings/policy";
import { canChangeRole } from "@/features/users/policy";
import { allowedActions, canView } from "@/features/requests/policy";

// 기대 매트릭스: ADMIN 은 전체, 나머지는 여기 적힌 것만 (최소 권한)
const EXPECTED: Record<Exclude<Role, "ADMIN">, Permission[]> = {
  USER: [],
  // 부서장 = 같은 부서 조회(<x>.read.dept)만
  MANAGER: PERMISSION_KEYS.filter((p) => p.endsWith(".read.dept")),
  APPROVER: ["request.read.all", "request.decide"],
  AUDITOR: ["admin.access", "audit.read"],
};

describe("RBAC", () => {
  it.each(Object.entries(EXPECTED))("%s 권한은 정확히 기대 목록과 같다", (role, perms) => {
    expect([...ROLE_PERMISSIONS[role as Role]].sort()).toEqual([...perms].sort());
  });

  it("ADMIN 은 등록된 모든 권한을 가진다(새 권한 자동 포함)", () => {
    expect([...ROLE_PERMISSIONS.ADMIN].sort()).toEqual([...PERMISSION_KEYS].sort());
  });

  it("모든 역할이 정의되어 있고, 비로그인·알 수 없는 역할은 거부(기본 거부)", () => {
    for (const r of ROLES) expect(ROLE_PERMISSIONS[r]).toBeDefined();
    expect(can(null, "audit.read")).toBe(false);
    expect(can(undefined, "audit.read")).toBe(false);
    expect(can({ role: "ROOT" as Role }, "audit.read")).toBe(false);
  });

  it("권한 키는 <자원>.<행위>[.<범위>] 형식 (자원 = gen 엔티티 이름, 숫자 허용)", () => {
    for (const p of PERMISSION_KEYS) expect(p).toMatch(/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*){1,2}$/);
  });

  it("권한과 자원 조건(ABAC)을 함께 적용", () => {
    const auditor = { id: "au", role: "AUDITOR" as const };
    const admin = { id: "ad", role: "ADMIN" as const };
    const approver = { id: "ap", role: "APPROVER" as const };
    // 감사 담당은 포털에 들어가도 업무 데이터 권한은 일반 사용자와 같다
    expect(canView(auditor, { requesterId: "x", status: "PENDING" })).toBe(false);
    expect(allowedActions(auditor, { requesterId: "x", status: "PENDING" })).toEqual([]);
    // 직무 분리: 결재 권한이 있어도 본인 요청은 불가
    expect(allowedActions(approver, { requesterId: "ap", status: "PENDING" })).toEqual(["cancel"]);
    // 역할 변경 권한이 있어도 본인 역할은 불가 (자기 권한 상승·마지막 관리자 강등 방지)
    expect(canChangeRole(admin, { id: "ad" })).toBe(false);
    expect(canChangeRole(admin, { id: "x" })).toBe(true);
    // 예약 취소: 소유자 또는 booking.cancel.any, 확정 상태만
    expect(canCancel(approver, { ownerId: "x", status: "CONFIRMED" })).toBe(false);
    expect(canCancel(admin, { ownerId: "x", status: "CONFIRMED" })).toBe(true);
    expect(canCancel(admin, { ownerId: "x", status: "CANCELED" })).toBe(false);
  });
});
