import { test, expect } from "./fixtures";

test("TC-RBAC-UI-001 감사 담당 포털: 권한 있는 메뉴만 표시, 권한 없는 화면 404, 권한 매트릭스 확인 (SEC-03)", async ({ pageAs }) => {
  const auditor = await pageAs("auditor");
  await expect(auditor.getByRole("link", { name: "결재함", exact: true })).toHaveCount(0);
  await auditor.goto("/me");
  await expect(auditor.getByRole("link", { name: "관리자 포털", exact: true })).toHaveAttribute("href", "/admin");
  await auditor.goto("/admin");
  const menu = auditor.getByRole("navigation", { name: "주 메뉴" });
  await expect(menu.getByRole("link")).toHaveText(["개요", "역할·권한", "감사로그"]);
  await expect(auditor.getByText("최근 감사로그", { exact: true })).toBeVisible();
  await expect(auditor.getByTestId("stats")).toHaveCount(0);
  expect((await auditor.goto("/admin/settings"))?.status()).toBe(404);
  expect((await auditor.goto("/admin/users"))?.status()).toBe(404);

  await auditor.goto("/admin/roles");
  const matrix = auditor.getByTestId("permission-matrix");
  await expect(matrix.getByLabel("감사 담당 audit.read 허용", { exact: true })).toBeVisible();
  await expect(matrix.getByLabel("감사 담당 settings.update 거부", { exact: true })).toBeVisible();
  await expect(matrix.getByLabel("관리자 settings.update 허용", { exact: true })).toBeVisible();
});

test("TC-RBAC-UI-002 관리자 포털 메뉴 전체 표시·역할 선택지에 감사 담당 포함", async ({ pageAs }) => {
  const admin = await pageAs("admin");
  await admin.goto("/admin/users");
  const menu = admin.getByRole("navigation", { name: "주 메뉴" });
  await expect(menu.getByRole("link")).toHaveText(["개요", "사용자", "회의실", "역할·권한", "감사로그", "설정", "AI"]);
  await expect(admin.getByLabel("역할", { exact: true }).getByRole("option", { name: "감사 담당" })).toHaveCount(1);
});
