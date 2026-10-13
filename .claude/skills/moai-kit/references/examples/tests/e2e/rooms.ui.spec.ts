import { test, expect } from "./fixtures";
import { uniqueTitle } from "./helpers";

test("TC-ROOM-UI-001 관리자 다크 포털에서 회의실 등록 → 사용 중지 → 예약 화면에서 숨김 → 재개", async ({ pageAs }) => {
  const name = uniqueTitle("TC-ROOM-UI-001");
  const admin = await pageAs("admin");
  // 사용자 화면은 기본(라이트), 관리자 포털만 KDS dark 모드
  await expect(admin.locator("[data-mode]")).toHaveCount(0);
  await admin.goto("/admin/rooms");
  await expect(admin.getByTestId("admin-portal")).toHaveAttribute("data-mode", "dark");

  await admin.getByLabel("이름").fill(name);
  await admin.getByLabel("위치").fill("합성 별관");
  await admin.getByLabel("수용 인원").fill("3");
  await admin.getByRole("button", { name: "등록", exact: true }).click();
  await expect(admin.getByRole("heading", { name, exact: true })).toBeVisible();

  await admin.getByRole("button", { name: "사용 중지", exact: true }).click();
  await admin.getByRole("button", { name: "중지 확인", exact: true }).click();
  await expect(admin.getByTestId("room-status")).toHaveText("비활성");

  const user = await pageAs("user1");
  await user.goto("/bookings");
  await expect(user.getByRole("rowheader").filter({ hasText: "대회의실" })).toBeVisible();
  await expect(user.getByRole("rowheader").filter({ hasText: name })).toHaveCount(0);

  await admin.getByRole("button", { name: "사용 재개", exact: true }).click();
  await expect(admin.getByTestId("room-status")).toHaveCount(0);
  await user.reload();
  await expect(user.getByRole("rowheader").filter({ hasText: name })).toBeVisible();
});
