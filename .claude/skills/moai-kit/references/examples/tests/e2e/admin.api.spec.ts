import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "./fixtures";
import { expectData, expectError, uniqueTitle } from "./helpers";
import { CommonErrors } from "../../src/lib/error-codes";
import { SettingsErrors } from "../../src/features/settings/errors";
import { UserErrors } from "../../src/features/users/errors";
import type { SettingsDto } from "../../src/features/settings/schema";
import type { AuditLogDto } from "../../src/features/auditLogs/schema";
import type { UserDto } from "../../src/features/users/schema";

const SETTINGS = "/api/v1/admin/settings";
const DEFAULTS = { noticeBanner: "", maintenanceMode: false, sessionTtlHours: 8 };
// 설정은 전역 상태 → 각 TC 끝에서 기본값으로 되돌린다 (workers 1).
const restore = async (admin: APIRequestContext) => expectData(await admin.patch(SETTINGS, { data: DEFAULTS }));

test("TC-ADMIN-API-001 비로그인 401·일반/승인자 403, 설정값 불변 (SEC-02)", async ({ apiAs }) => {
  const [anon, user, approver, admin] = await Promise.all([apiAs(null), apiAs("user1"), apiAs("approver"), apiAs("admin")]);
  const before = (await expectData<SettingsDto>(await admin.get(SETTINGS))).data.values;
  for (const url of [SETTINGS, "/api/v1/admin/users", "/api/v1/admin/auditLogs"]) {
    await expectError(await anon.get(url), CommonErrors.AUTH_REQUIRED);
    await expectError(await user.get(url), CommonErrors.AUTH_PERMISSION_REQUIRED);
    await expectError(await approver.get(url), CommonErrors.AUTH_PERMISSION_REQUIRED);
  }
  await expectError(await user.patch(SETTINGS, { data: { noticeBanner: "탈취" } }), CommonErrors.AUTH_PERMISSION_REQUIRED);
  const me = (await expectData<{ id: string }>(await user.get("/api/v1/auth/me"))).data;
  await expectError(await user.patch(`/api/v1/admin/users/${me.id}`, { data: { role: "ADMIN" } }), CommonErrors.AUTH_PERMISSION_REQUIRED);
  expect((await expectData<SettingsDto>(await admin.get(SETTINGS))).data.values).toEqual(before);
  expect((await expectData<{ role: string }>(await user.get("/api/v1/auth/me"))).data.role).toBe("USER");
});

test("TC-ADMIN-API-002 설정 변경·재조회·감사로그 기록, 잘못된 입력 400·값 불변", async ({ apiAs }) => {
  const admin = await apiAs("admin");
  const banner = uniqueTitle("공지");
  try {
    const saved = await expectData<SettingsDto>(await admin.patch(SETTINGS, { data: { noticeBanner: banner } }));
    expect(saved.data.values.noticeBanner).toBe(banner);
    expect((await expectData<SettingsDto>(await admin.get(SETTINGS))).data.values.noticeBanner).toBe(banner);
    const logs = await expectData<AuditLogDto[]>(await admin.get("/api/v1/admin/auditLogs?action=settings.update&pageSize=1"));
    expect(logs.data[0]).toMatchObject({ entity: "settings", detail: { changes: { noticeBanner: { to: banner } } } });

    const bad = await expectError(await admin.patch(SETTINGS, { data: { sessionTtlHours: 0, maintenanceMode: "yes" } }), CommonErrors.VALIDATION_ERROR);
    expect(Object.keys(bad.fieldErrors ?? {})).toEqual(expect.arrayContaining(["sessionTtlHours", "maintenanceMode"]));
    await expectError(await admin.patch(SETTINGS, { data: {} }), CommonErrors.VALIDATION_ERROR);
    await expectError(await admin.patch(SETTINGS, { data: { secret: "x" } }), CommonErrors.VALIDATION_ERROR);
    expect((await expectData<SettingsDto>(await admin.get(SETTINGS))).data.values).toMatchObject({ noticeBanner: banner, sessionTtlHours: 8 });
  } finally {
    await restore(admin);
  }
});

test("TC-ADMIN-API-003 점검 모드: 일반 쓰기 503·읽기/로그인 허용·관리자 쓰기 허용", async ({ apiAs }) => {
  const admin = await apiAs("admin");
  const user = await apiAs("user1");
  const input = { title: uniqueTitle("점검"), category: "ETC" };
  try {
    await expectData(await admin.patch(SETTINGS, { data: { maintenanceMode: true } }));
    const err = await expectError(await user.post("/api/v1/requests", { data: input }), SettingsErrors.SETTINGS_MAINTENANCE_MODE);
    expect(err.retryable).toBe(true);
    await expectError(await (await apiAs(null)).post("/api/v1/publicNotes", { data: { title: input.title } }), SettingsErrors.SETTINGS_MAINTENANCE_MODE);
    await expectData(await user.get("/api/v1/requests"));
    await apiAs("user2"); // 로그인은 허용 (fixture 가 200 확인)
    const list = await expectData<{ title: string }[]>(await user.get(`/api/v1/requests?q=${encodeURIComponent(input.title)}`));
    expect(list.data).toHaveLength(0);
    await expectData(await admin.post("/api/v1/requests", { data: input }), 201);
  } finally {
    await restore(admin);
  }
  await expectData(await user.post("/api/v1/requests", { data: { ...input, title: `${input.title} 해제` } }), 201);
});

test("TC-ADMIN-API-004 역할 변경 즉시 적용·감사로그, 본인 변경 403 (SEC-03)", async ({ apiAs }) => {
  const admin = await apiAs("admin");
  const user2 = await apiAs("user2");
  const [me, target] = await Promise.all([
    expectData<{ id: string }>(await admin.get("/api/v1/auth/me")),
    expectData<{ id: string }>(await user2.get("/api/v1/auth/me")),
  ]);
  const url = `/api/v1/admin/users/${target.data.id}`;
  try {
    expect((await expectData<UserDto>(await admin.patch(url, { data: { role: "APPROVER" } }))).data.role).toBe("APPROVER");
    expect((await expectData<{ role: string }>(await user2.get("/api/v1/auth/me"))).data.role).toBe("APPROVER");
    const logs = await expectData<AuditLogDto[]>(await admin.get(`/api/v1/admin/auditLogs?entityId=${target.data.id}&action=user.role_change`));
    expect(logs.data[0]).toMatchObject({ actor: { id: me.data.id }, detail: { from: "USER", to: "APPROVER" } });
    await expectError(await admin.patch(`/api/v1/admin/users/${me.data.id}`, { data: { role: "USER" } }), UserErrors.USER_SELF_ROLE_CHANGE_FORBIDDEN);
    await expectError(await admin.patch(url, { data: { role: "ROOT" } }), CommonErrors.VALIDATION_ERROR);
    await expectError(await admin.patch(`/api/v1/admin/users/${crypto.randomUUID()}`, { data: { role: "USER" } }), UserErrors.USER_NOT_FOUND);
    expect((await expectData<{ role: string }>(await admin.get("/api/v1/auth/me"))).data.role).toBe("ADMIN");
  } finally {
    await expectData(await admin.patch(url, { data: { role: "USER" } }));
  }
});

test("TC-ADMIN-API-005 세션 유지 시간 설정이 새 로그인 쿠키 만료에 적용 (SEC-08)", async ({ apiAs }) => {
  const admin = await apiAs("admin");
  try {
    await expectData(await admin.patch(SETTINGS, { data: { sessionTtlHours: 1 } }));
    const user = await apiAs("user1");
    const sid = (await user.storageState()).cookies.find((c) => c.name === "sid");
    const remaining = (sid?.expires ?? 0) - Date.now() / 1000;
    expect(remaining).toBeGreaterThan(3500);
    expect(remaining).toBeLessThanOrEqual(3600);
  } finally {
    await restore(admin);
  }
});

test("TC-ADMIN-API-006 부서 지정·감사로그·내 정보 반영, 잘못된 값 400·권한 없는 역할 403 (SEC-03)", async ({ apiAs }) => {
  const [admin, manager, target] = await Promise.all([apiAs("admin"), apiAs("manager"), apiAs("approver")]);
  const me = (await expectData<{ id: string; department: string | null }>(await target.get("/api/v1/auth/me"))).data;
  const url = `/api/v1/admin/users/${me.id}/department`;
  try {
    expect((await expectData<UserDto>(await admin.patch(url, { data: { department: "OPS" } }))).data.department).toBe("OPS");
    expect((await expectData<{ department: string | null }>(await target.get("/api/v1/auth/me"))).data.department).toBe("OPS");
    const logs = await expectData<AuditLogDto[]>(await admin.get(`/api/v1/admin/auditLogs?action=user.department_change&entityId=${me.id}&pageSize=1`));
    expect(logs.data[0]).toMatchObject({ entityId: me.id, detail: { from: me.department, to: "OPS" } });
    await expectError(await admin.patch(url, { data: { department: "NOPE" } }), CommonErrors.VALIDATION_ERROR);
    await expectError(await manager.patch(url, { data: { department: "DEV" } }), CommonErrors.AUTH_PERMISSION_REQUIRED);
    expect((await expectData<{ department: string | null }>(await target.get("/api/v1/auth/me"))).data.department).toBe("OPS");
  } finally {
    await expectData(await admin.patch(url, { data: { department: me.department } }));
  }
});
