import type { APIRequestContext, Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { loginUI, uniqueTitle } from "./helpers";
import { startMockAi } from "../ai-mock";
import { registerMockModel } from "../ai-register";

test("TC-REQ-UI-001 등록·다른 역할 승인·새로고침 후 저장 상태 확인", async ({ pageAs }) => {
  const title = uniqueTitle("TC-REQ-UI-001");
  const owner = await pageAs("user1");
  await owner.goto("/requests/new");
  await owner.getByLabel("제목").fill(title);
  await owner.getByLabel("분류").selectOption("EQUIPMENT");
  await owner.getByRole("button", { name: "등록", exact: true }).click();
  await expect(owner.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(owner.getByTestId("status")).toHaveText("대기");
  const approver = await pageAs("approver");
  await approver.goto(owner.url());
  await approver.getByRole("button", { name: "승인", exact: true }).click();
  await expect(approver.getByTestId("status")).toHaveText("승인");
  await owner.reload();
  await expect(owner.getByTestId("status")).toHaveText("승인");
});

test("TC-REQ-UI-002 필수값 누락 시 필드 오류·입력 화면 유지", async ({ page }) => {
  await loginUI(page, "user1");
  await page.goto("/requests/new");
  await page.getByRole("button", { name: "등록", exact: true }).click();
  await expect(page.getByText("제목은 2자 이상", { exact: true })).toBeVisible();
  await expect(page.getByLabel("제목")).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL(/\/requests\/new$/);
});

test("TC-REQ-UI-003 비로그인 보호 화면은 로그인으로 이동 (SEC-02)", async ({ page }) => {
  await page.goto("/requests");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "로그인", exact: true })).toBeVisible();
});

test("TC-REQ-UI-004 승인자 대시보드 결재 대기 → 결재함 → 반려 → 양쪽 처리 이력 확인", async ({ pageAs }) => {
  const title = uniqueTitle("TC-REQ-UI-004");
  const owner = await pageAs("user1");
  await owner.goto("/requests/new");
  await owner.getByLabel("제목").fill(title);
  await owner.getByLabel("분류").selectOption("ACCESS");
  await owner.getByRole("button", { name: "등록", exact: true }).click();
  await expect(owner.getByRole("heading", { name: title, exact: true })).toBeVisible();

  const approver = await pageAs("approver");
  await expect(approver.getByRole("heading", { name: /^결재 대기 \d+건$/ })).toBeVisible();
  await approver.goto("/approvals");
  await approver.getByLabel("제목 검색").fill(title);
  await approver.getByRole("button", { name: "검색", exact: true }).click();
  await approver.getByRole("link", { name: title, exact: true }).click();
  await approver.getByLabel("처리 의견 (반려 시 필수)").fill("합성 반려 사유");
  await approver.getByRole("button", { name: "반려", exact: true }).click();
  await expect(approver.getByTestId("status")).toHaveText("반려");
  await expect(approver.getByTestId("history")).toContainText("합성 반려 사유");

  await owner.reload();
  const history = owner.getByTestId("history").getByRole("listitem");
  await expect(history).toHaveCount(2);
  await expect(history.nth(0)).toContainText("등록");
  await expect(history.nth(1)).toContainText("반려");
  await approver.goto(`/approvals?q=${encodeURIComponent(title)}`);
  await expect(approver.getByText("처리할 요청이 없습니다.", { exact: true })).toBeVisible();
});

test("TC-REQ-UI-005 일반 사용자는 결재함 404·메뉴 미노출 (SEC-03)", async ({ pageAs }) => {
  const user = await pageAs("user1");
  await expect(user.getByRole("link", { name: "결재함", exact: true })).toHaveCount(0);
  expect((await user.goto("/approvals"))?.status()).toBe(404);
});

test("TC-REQ-UI-006 대시보드 차트·처리율 표시", async ({ pageAs }) => {
  const page = await pageAs("approver");
  await expect(page.getByRole("figure", { name: "분류별 요청" })).toBeVisible();
  await expect(page.getByRole("figure", { name: "월별 등록" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "처리 완료율" })).toBeVisible();
  await expect(page.getByRole("figure", { name: "분류별 요청" }).getByText("장비", { exact: true })).toBeVisible();
});

test("TC-REQ-UI-007 가져오기 화면: 행 오류 목록 → 고친 파일 → 목록에 반영", async ({ pageAs }) => {
  const page = await pageAs("user1");
  const title = uniqueTitle("TC-REQ-UI-007");
  await page.goto("/requests");
  await page.getByRole("link", { name: "가져오기", exact: true }).click();
  await expect(page.getByRole("heading", { name: "요청 가져오기" })).toBeVisible();
  const choose = (text: string) => page.getByLabel("파일").setInputFiles({ name: "요청.csv", mimeType: "text/csv", buffer: Buffer.from(text) });
  await choose(`제목,분류\n${title},없는분류\n`);
  await page.getByRole("button", { name: "가져오기", exact: true }).click();
  await expect(page.getByRole("list", { name: "행 오류" })).toContainText("2행 분류: 분류를 선택해 주세요.");
  await choose(`제목,분류\n${title},휴가\n`);
  await page.getByRole("button", { name: "가져오기", exact: true }).click();
  await expect(page.getByText("1건을 가져왔습니다.")).toBeVisible();
  await page.goto(`/requests?q=${encodeURIComponent(title)}`);
  await expect(page.getByText(title, { exact: true })).toBeVisible();
});

test("TC-REQ-UI-008 AI 분류 추천: 버튼 → 분류 선택지 채움·이유 표시 → 사용자가 등록", async ({ pageAs, apiAs }) => {
  const mock = await startMockAi(() => ({ category: "LEAVE", reason: "휴가 신청입니다." }));
  const cleanup = await registerMockModel(await apiAs("admin"), mock);
  try {
    const page = await pageAs("user1");
    const title = uniqueTitle("TC-REQ-UI-008 연차");
    await page.goto("/requests/new");
    await page.getByLabel("제목").fill(title);
    await page.getByRole("button", { name: "AI 분류 추천" }).click();
    await expect(page.getByText("AI 추천: 휴가 — 휴가 신청입니다.")).toBeVisible();
    await expect(page.getByLabel("분류")).toHaveValue("LEAVE");
    await page.getByRole("button", { name: "등록", exact: true }).click();
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.getByText("휴가", { exact: true })).toBeVisible();
  } finally {
    await cleanup();
    await mock.close();
  }
  const page = await pageAs("user1");
  await page.goto("/requests/new");
  await expect(page.getByRole("button", { name: "AI 분류 추천" })).toHaveCount(0);
});

// ── 수행계획 (AI 초안 → 사람이 가져오기·수정·저장) ──────────
async function createPending(owner: APIRequestContext, title: string) {
  const response = await owner.post("/api/v1/requests", { data: { title, category: "EQUIPMENT", description: "합성 설명" } });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { data: { id: string } }).data.id;
}
const planEditor = (page: Page) => page.getByLabel("수행계획", { exact: true });
const FIRST_PLAN = "1. 합성 확인\n2. 합성 처리";

test("TC-REQ-UI-009 AI 수행계획: 초안 미리보기(자동 반영 없음) → 명시 가져오기 → 수정 → 저장 → 새로고침 유지", async ({ pageAs, apiAs }) => {
  const mock = await startMockAi(() => ({ plan: FIRST_PLAN }));
  const cleanup = await registerMockModel(await apiAs("admin"), mock);
  try {
    const id = await createPending(await apiAs("user1"), uniqueTitle("TC-REQ-UI-009"));
    const page = await pageAs("user1");
    await page.goto(`/requests/${id}/edit`);
    await page.getByRole("button", { name: "AI 초안 만들기" }).click();
    await expect(page.getByTestId("plan-draft")).toContainText("1. 합성 확인");
    await expect(planEditor(page)).toHaveValue("");
    await page.getByRole("button", { name: "편집칸에 가져오기" }).click();
    await expect(planEditor(page)).toHaveValue(FIRST_PLAN);
    await expect(page.getByTestId("plan-draft")).toHaveCount(0);
    const edited = `${FIRST_PLAN}\n3. 직접 추가`;
    await planEditor(page).fill(edited);
    await page.getByRole("button", { name: "수행계획 저장" }).click();
    await expect(page.getByText("수행계획을 저장했습니다.")).toBeVisible();
    await page.reload();
    await expect(planEditor(page)).toHaveValue(edited);
    await page.goto(`/requests/${id}`);
    await expect(page.getByTestId("execution-plan")).toContainText("3. 직접 추가");
    await expect(page.getByTestId("history")).toContainText("수행계획");
  } finally {
    await cleanup();
    await mock.close();
  }
});

test("TC-REQ-UI-010 AI 형식 오류에도 직접 입력·저장 가능, 다른 화면이 먼저 저장하면 거부하고 새로고침 후 최신 계획 확인", async ({ pageAs, apiAs }) => {
  const mock = await startMockAi(() => ({ nope: true }));
  const cleanup = await registerMockModel(await apiAs("admin"), mock);
  try {
    const id = await createPending(await apiAs("user1"), uniqueTitle("TC-REQ-UI-010"));
    const first = await pageAs("user1");
    await first.goto(`/requests/${id}/edit`);
    await first.getByRole("button", { name: "AI 초안 만들기" }).click();
    await expect(first.getByRole("alert").filter({ hasText: "외부 서비스의 응답을 처리하지 못했습니다." })).toBeVisible();
    await expect(first.getByTestId("plan-draft")).toHaveCount(0);
    await planEditor(first).fill("직접 작성한 계획");
    await first.getByRole("button", { name: "수행계획 저장" }).click();
    await expect(first.getByText("수행계획을 저장했습니다.")).toBeVisible();

    const second = await pageAs("user1");
    await second.goto(`/requests/${id}/edit`);
    await planEditor(first).fill("먼저 저장한 계획");
    await first.getByRole("button", { name: "수행계획 저장" }).click();
    await expect(first.getByText("수행계획을 저장했습니다.")).toBeVisible();
    await planEditor(second).fill("오래된 화면의 계획");
    await second.getByRole("button", { name: "수행계획 저장" }).click();
    await expect(second.getByRole("alert").filter({ hasText: "다른 사용자가 먼저 처리했습니다." })).toBeVisible();
    await second.reload();
    await expect(planEditor(second)).toHaveValue("먼저 저장한 계획");
  } finally {
    await cleanup();
    await mock.close();
  }
});

test("TC-REQ-UI-011 늦게 도착한 AI 초안은 편집 중인 글을 덮어쓰지 않고, 가져오기는 명시 동작", async ({ pageAs, apiAs }) => {
  // 실제 외부 AI 응답을 지연시킨다: 가짜 공급자가 gate 가 열릴 때까지 답하지 않는다(앱 HTTP 를 가로채지 않음).
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const mock = await startMockAi(async () => {
    await gate;
    return { plan: "AI가 만든 초안" };
  });
  const cleanup = await registerMockModel(await apiAs("admin"), mock);
  try {
    const id = await createPending(await apiAs("user1"), uniqueTitle("TC-REQ-UI-011"));
    const page = await pageAs("user1");
    await page.goto(`/requests/${id}/edit`);
    const calls = mock.seen.length;
    await page.getByRole("button", { name: "AI 초안 만들기" }).click();
    await expect.poll(() => mock.seen.length).toBe(calls + 1); // 요청이 공급자에 도착해 응답 대기 중
    await planEditor(page).fill("내가 쓰는 중인 계획");
    release();
    await expect(page.getByText("편집 내용이 바뀌어 AI 초안을 표시하지 않았습니다.")).toBeVisible();
    await expect(planEditor(page)).toHaveValue("내가 쓰는 중인 계획");
    await expect(page.getByTestId("plan-draft")).toHaveCount(0);

    // 편집 후 다시 만들면 미리보기까지만 — 저장 안 한 편집은 그대로이고, 가져오기를 눌러야 바뀐다
    await page.getByRole("button", { name: "AI 초안 만들기" }).click();
    await expect(page.getByTestId("plan-draft")).toHaveText("AI가 만든 초안");
    await expect(planEditor(page)).toHaveValue("내가 쓰는 중인 계획");
    await page.getByRole("button", { name: "저장 안 한 편집을 덮어쓰고 가져오기" }).click();
    await expect(planEditor(page)).toHaveValue("AI가 만든 초안");
  } finally {
    release();
    await cleanup();
    await mock.close();
  }
});

test("TC-REQ-UI-012 수행계획 편집 화면: 모바일 360·375 / PC 1280 에서 가로 넘침 없이 입력·저장 가능", async ({ pageAs, apiAs }) => {
  const id = await createPending(await apiAs("user1"), uniqueTitle("TC-REQ-UI-012"));
  const page = await pageAs("user1");
  for (const width of [360, 375, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`/requests/${id}/edit`);
    await expect(planEditor(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "수행계획 저장" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  }
  await planEditor(page).fill("화면 폭 시험 계획");
  await page.getByRole("button", { name: "수행계획 저장" }).click();
  await expect(page.getByText("수행계획을 저장했습니다.")).toBeVisible();
});
