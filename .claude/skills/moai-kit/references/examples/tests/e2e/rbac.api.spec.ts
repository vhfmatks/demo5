import { test, expect } from "./fixtures";
import { expectData, expectError } from "./helpers";
import { CommonErrors } from "../../src/lib/error-codes";
import type { AuditLogDto } from "../../src/features/auditLogs/schema";
import type { RequestDto } from "../../src/features/requests/schema";

test("TC-RBAC-API-001 감사 담당은 감사로그만 조회, 설정·사용자·역할 변경·결재는 거부 (SEC-03)", async ({ apiAs }) => {
  const auditor = await apiAs("auditor");
  const logs = await expectData<AuditLogDto[]>(await auditor.get("/api/v1/admin/auditLogs?pageSize=5"));
  expect(Array.isArray(logs.data)).toBe(true);
  await expectError(await auditor.get("/api/v1/admin/settings"), CommonErrors.AUTH_PERMISSION_REQUIRED);
  await expectError(await auditor.patch("/api/v1/admin/settings", { data: { noticeBanner: "x" } }), CommonErrors.AUTH_PERMISSION_REQUIRED);
  await expectError(await auditor.get("/api/v1/admin/users"), CommonErrors.AUTH_PERMISSION_REQUIRED);
  const me = (await expectData<{ id: string; role: string }>(await auditor.get("/api/v1/auth/me"))).data;
  await expectError(await auditor.patch(`/api/v1/admin/users/${me.id}`, { data: { role: "ADMIN" } }), CommonErrors.AUTH_PERMISSION_REQUIRED);
  expect((await expectData<{ role: string }>(await auditor.get("/api/v1/auth/me"))).data.role).toBe("AUDITOR");
  // 업무 데이터는 일반 사용자 범위: 결재함은 비어 있고, 타인 요청은 보이지 않는다
  expect((await expectData<RequestDto[]>(await auditor.get("/api/v1/requests?view=inbox"))).data).toEqual([]);
  expect((await expectData<RequestDto[]>(await auditor.get("/api/v1/requests"))).data.every((r) => r.requester.id === me.id)).toBe(true);
});

test("TC-RBAC-API-002 역할 변경 즉시 권한 반영: 일반→감사 담당→일반 (SEC-03)", async ({ apiAs }) => {
  const [admin, user2] = await Promise.all([apiAs("admin"), apiAs("user2")]);
  const target = (await expectData<{ id: string }>(await user2.get("/api/v1/auth/me"))).data;
  await expectError(await user2.get("/api/v1/admin/auditLogs"), CommonErrors.AUTH_PERMISSION_REQUIRED);
  try {
    await expectData(await admin.patch(`/api/v1/admin/users/${target.id}`, { data: { role: "AUDITOR" } }));
    await expectData(await user2.get("/api/v1/admin/auditLogs")); // 같은 세션에서 바로 허용
    await expectError(await user2.get("/api/v1/admin/settings"), CommonErrors.AUTH_PERMISSION_REQUIRED);
  } finally {
    await expectData(await admin.patch(`/api/v1/admin/users/${target.id}`, { data: { role: "USER" } }));
  }
  await expectError(await user2.get("/api/v1/admin/auditLogs"), CommonErrors.AUTH_PERMISSION_REQUIRED);
});
