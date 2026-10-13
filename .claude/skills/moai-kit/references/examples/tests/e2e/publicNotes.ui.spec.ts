import { test, expect } from "./fixtures";
import { uniqueTitle } from "./helpers";

test("TC-PUB-UI-001 익명 생성·수정·새로고침·삭제 후 목록 확인", async ({ page }) => {
  const title = uniqueTitle("TC-PUB-UI-001");
  await page.goto("/publicNotes/new");
  await page.getByLabel("제목").fill(title);
  await page.getByLabel("메모").fill("합성 공개 메모");
  await page.getByRole("button", { name: "등록", exact: true }).click();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "수정", exact: true }).click();
  await page.getByLabel("제목").fill(`${title} 수정`);
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("heading", { name: `${title} 수정`, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: `${title} 수정`, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "삭제", exact: true }).click();
  await page.getByRole("button", { name: "삭제 확인", exact: true }).click();
  await expect(page).toHaveURL(/\/publicNotes$/);
  await expect(page.getByText(`${title} 수정`, { exact: true })).toHaveCount(0);
});

test("TC-PUB-UI-002 공백 제목은 요청 전 거부하고 수정 후 저장", async ({ page }) => {
  const title = uniqueTitle("TC-PUB-UI-002");
  await page.goto("/publicNotes/new");
  let submissions = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/v1/publicNotes") submissions++;
  });
  await page.getByLabel("제목").fill("   ");
  await page.getByLabel("메모").fill("검증 실패 후 유지할 합성 메모");
  await page.getByRole("button", { name: "등록", exact: true }).click();
  await expect(page.getByText("제목을 입력해 주세요.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("제목")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("제목")).toHaveAttribute("aria-describedby", "title-error");
  await expect(page.getByLabel("메모")).toHaveValue("검증 실패 후 유지할 합성 메모");
  expect(submissions).toBe(0);
  await page.getByLabel("제목").fill(title);
  await page.getByRole("button", { name: "등록", exact: true }).click();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  expect(submissions).toBe(1);
});
