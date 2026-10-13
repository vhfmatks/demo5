import { test, expect } from "./fixtures";
import { uniqueTitle } from "./helpers";

test("TC-DESIGN-UI-003 탭 키보드·아코디언·팝오버·툴팁", async ({ page }) => {
  await page.goto("/design-system");
  const tabs = page.getByRole("tablist", { name: "예제 화면" });
  await tabs.getByRole("tab", { name: "개요" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: "상세" })).toBeFocused();
  await expect(tabs.getByRole("tab", { name: "상세" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "상세" })).toBeVisible();
  await page.keyboard.press("Home");
  await expect(tabs.getByRole("tab", { name: "개요" })).toBeFocused();
  await expect(tabs.getByRole("tab", { name: "준비 중" })).toBeDisabled();
  await page.getByText("어디에서 가져오나요?", { exact: true }).click();
  await expect(page.getByText("@/components/ui에서 가져옵니다.", { exact: true })).toBeVisible();
  await page.getByText("다크 모드도 되나요?", { exact: true }).click();
  await expect(page.getByText("@/components/ui에서 가져옵니다.", { exact: true })).toBeHidden();
  await page.getByText("표시 옵션", { exact: true }).click();
  await expect(page.getByLabel("완료 항목 포함")).toBeVisible();
  await page.getByLabel("완료 항목 포함").press("Escape");
  await expect(page.getByLabel("완료 항목 포함")).toBeHidden();
  await page.getByRole("button", { name: "컴포넌트 도움말" }).focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toBeHidden();
});

test("TC-DESIGN-UI-004 모바일 시트·팝업·토스트·스낵바 닫기와 포커스", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design-system");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await testInfo.attach("gallery-mobile", { body: await page.screenshot(), contentType: "image/png" });
  const trigger = page.getByRole("button", { name: "시트 열기" });
  await trigger.click();
  const sheet = page.getByRole("dialog", { name: "정렬 방식" });
  await expect(sheet).toBeVisible();
  await testInfo.attach("sheet-mobile", { body: await page.screenshot(), contentType: "image/png" });
  await sheet.getByRole("radio", { name: "이름순" }).check();
  await sheet.getByRole("button", { name: "적용" }).click();
  await expect(sheet).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.getByRole("button", { name: "팝업 열기" }).click();
  await expect(page.getByRole("dialog", { name: "상세 안내" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "상세 안내" })).toBeHidden();
  await page.getByRole("button", { name: "토스트 표시" }).click();
  await expect(page.getByText("설정을 저장했습니다.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "알림 닫기" }).click();
  await expect(page.getByText("설정을 저장했습니다.", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "스낵바 표시" }).click();
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(page.getByText("항목을 보관했습니다.", { exact: true })).toBeHidden();
});

test("TC-DESIGN-UI-005 날짜·선택·범위는 키보드와 폼 값으로 동작", async ({ page }) => {
  await page.goto("/design-system");
  const startCalendar = page.getByRole("dialog", { name: "시작일 날짜 선택" });
  const endCalendar = page.getByRole("dialog", { name: "종료일 날짜 선택" });
  await page.getByLabel("시작일", { exact: true }).click();
  await startCalendar.getByRole("button", { name: "2026년 10월 12일" }).click();
  await page.getByLabel("종료일", { exact: true }).click();
  await endCalendar.getByRole("button", { name: "2026년 10월 13일" }).click();
  await page.getByRole("radio", { name: "오전 9시" }).check();
  await expect(page.getByRole("radio", { name: "오전 10시" })).toBeDisabled();
  await page.getByRole("radio", { name: "일주일" }).check();
  await page.getByRole("button", { name: "사용 가능", exact: true }).click();
  await expect(page.getByRole("button", { name: "사용 가능", exact: true })).toHaveAttribute("aria-pressed", "true");
  const people = page.getByRole("slider", { name: "인원" });
  await people.focus(); await people.press("ArrowRight");
  await expect(people).toHaveValue("5");
  const minimum = page.getByRole("slider", { name: "최솟값" });
  await minimum.focus(); await minimum.press("End");
  await expect(minimum).toHaveValue("80");
  const maximum = page.getByRole("slider", { name: "최댓값" });
  await maximum.focus(); await maximum.press("ArrowLeft");
  await expect(maximum).toHaveValue("80");
  await page.getByRole("button", { name: "선택 확인", exact: true }).click();
  await expect(page.getByTestId("selection-result")).toContainText("시작 2026-10-12 · 종료 2026-10-13 · 시간 09:00 · 이용권 week");
});

test("TC-DESIGN-UI-008 KDS 달력 키보드·월 이동·닫기", async ({ page }) => {
  await page.goto("/design-system");
  const start = page.getByLabel("시작일", { exact: true });
  await expect(start).toHaveValue("2026.10.09");
  await expect(page.locator("input[type='hidden'][name='start']")).toHaveValue("2026-10-09");
  await expect(start).toHaveAttribute("readonly", "");
  await start.focus();
  await start.press("Space");
  const calendar = page.getByRole("dialog", { name: "시작일 날짜 선택" });
  await expect(calendar).toBeVisible();
  await expect(calendar).toContainText("2026년 10월");
  await expect(calendar.locator(".kds-calendar__grid > *")).toHaveCount(42);
  await expect(calendar.getByRole("button", { name: "2026년 10월 9일" })).toBeFocused();
  await calendar.getByRole("button", { name: "2026년 10월 9일" }).press("ArrowRight");
  await expect(calendar.getByRole("button", { name: "2026년 10월 10일" })).toBeFocused();
  await calendar.getByRole("button", { name: "2026년 10월 10일" }).press("Tab");
  await expect(calendar.getByRole("button", { name: "2026년 10월 11일" })).toBeFocused();
  await calendar.getByRole("button", { name: "이전 달" }).click();
  await expect(calendar).toContainText("2026년 9월");
  await calendar.getByRole("button", { name: "다음 달" }).click();
  await expect(calendar).toContainText("2026년 10월");
  await calendar.getByRole("button", { name: "2026년 10월 9일" }).press("Escape");
  await expect(calendar).toBeHidden();
  await expect(start).toBeFocused();
  await start.click();
  await page.getByRole("heading", { name: "날짜·시간·범위·선택" }).click();
  await expect(calendar).toBeHidden();
});

test("TC-DESIGN-UI-006 AI 입력·첨부·중지·문서 페이지·차트", async ({ page }) => {
  await page.goto("/design-system");
  await page.getByRole("button", { name: "예약 취소 방법은?", exact: true }).click();
  await expect(page.getByLabel("AI에게 질문")).toHaveValue("예약 취소 방법은?");
  await page.getByLabel("파일 첨부", { exact: true }).setInputFiles({ name: "synthetic-note.txt", mimeType: "text/plain", buffer: Buffer.from("합성 예제") });
  await expect(page.getByText("synthetic-note.txt", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "synthetic-note.txt 첨부 제거" }).click();
  await expect(page.getByText("synthetic-note.txt", { exact: true })).toBeHidden();
  await page.getByLabel("AI에게 질문").press("Control+Enter");
  await expect(page.getByRole("button", { name: "생성 중지" })).toBeVisible();
  await expect(page.getByLabel("AI에게 질문")).toBeDisabled();
  await page.getByRole("button", { name: "생성 중지" }).click();
  await expect(page.getByLabel("AI에게 질문")).toBeEnabled();
  await page.getByRole("button", { name: "다음 페이지", exact: true }).click();
  await expect(page.getByRole("img", { name: "예제 문서 2쪽: 취소 안내" })).toBeVisible();
  await expect(page.getByRole("button", { name: "다음 페이지", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "참고 자료 닫기" }).click();
  await expect(page.getByRole("region", { name: "예제 문서" })).toBeHidden();
  await page.getByRole("button", { name: "출처 패널 열기" }).click();
  await expect(page.getByRole("region", { name: "예제 문서" })).toBeVisible();
  await expect(page.getByRole("figure", { name: "이용 비율" })).toContainText("목 42건 (35%)");
  await expect(page.getByRole("progressbar", { name: "자료 처리" })).toHaveAttribute("aria-valuenow", "65");
});

test("TC-DESIGN-UI-001 모바일·태블릿 메뉴·현재 위치·Escape·PC 전환", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design-system");
  const toggle = page.getByLabel("주 메뉴 열기");
  const nav = page.getByRole("navigation", { name: "모바일 주 메뉴" });
  const desktop = page.getByRole("navigation", { name: "주 메뉴", exact: true });
  for (const width of [360, 390, 768, 1024, 1279]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(toggle).toBeVisible();
    await expect(desktop).toBeHidden();
    await toggle.click();
    await expect(nav.getByRole("link", { name: "디자인 시스템", exact: true })).toBeVisible();
    if (width === 390 || width === 768) {
      await testInfo.attach(`menu-${width}`, { body: await page.screenshot(), contentType: "image/png" });
    }
    await toggle.click();
    await expect(nav).toBeHidden();
  }
  await toggle.click();
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "디자인 시스템", exact: true })).toHaveAttribute("aria-current", "page");
  await toggle.press("Escape");
  await expect(nav).toBeHidden();
  await expect(toggle).toBeFocused();
  await toggle.click();
  await nav.getByRole("link", { name: "디자인 시스템", exact: true }).click();
  await expect(nav).toBeHidden();
  await toggle.click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(toggle).toBeHidden();
  await expect(page.getByRole("navigation", { name: "주 메뉴", exact: true }).getByRole("link", { name: "디자인 시스템" })).toBeVisible();
  await page.setViewportSize({ width: 768, height: 900 });
  await expect(toggle).toBeVisible();
  await expect(nav).toBeHidden();
});

test("TC-DESIGN-UI-002 필드 오류 연결·삭제 모달 포커스 격리와 복원", async ({ page }) => {
  await page.goto("/publicNotes/new");
  await page.getByRole("button", { name: "등록", exact: true }).click();
  const title = page.getByLabel("제목");
  await expect(title).toHaveAttribute("aria-invalid", "true");
  await expect(title).toHaveAttribute("aria-describedby", "title-error");
  await expect(page.locator("#title-error")).toBeVisible();
  await title.fill(uniqueTitle("TC-DESIGN-UI-002"));
  await page.getByRole("button", { name: "등록", exact: true }).click();
  const remove = page.getByRole("button", { name: "삭제", exact: true });
  await remove.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const cancel = dialog.getByRole("button", { name: "취소", exact: true });
  const confirm = dialog.getByRole("button", { name: "삭제 확인", exact: true });
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(confirm).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(remove).toBeFocused();
  await remove.click();
  await confirm.click();
  await expect(page).toHaveURL(/\/publicNotes$/);
});

test("TC-DESIGN-UI-007 로그인·관리자 모바일/태블릿 메뉴 이동", async ({ pageAs }, testInfo) => {
  for (const screen of [
    { actor: "user1" as const, route: "/requests", label: "회의실 예약", target: /\/bookings$/, current: "요청" },
    { actor: "admin" as const, route: "/admin", label: "사용자", target: /\/admin\/users$/, current: "개요" },
  ]) {
    const page = await pageAs(screen.actor);
    for (const width of [360, 768, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(screen.route);
      const toggle = page.getByLabel("주 메뉴 열기");
      await expect(toggle).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await toggle.click();
      const nav = page.getByRole("navigation", { name: "모바일 주 메뉴" });
      await expect(nav.getByRole("link", { name: screen.current, exact: true })).toHaveAttribute("aria-current", "page");
      if (width === 360) {
        await testInfo.attach(`menu-${screen.actor}`, { body: await page.screenshot(), contentType: "image/png" });
      }
      await nav.getByRole("link", { name: screen.label, exact: true }).click();
      await expect(page).toHaveURL(screen.target);
      await expect(nav).toBeHidden();
      await toggle.click();
      await expect(nav.getByRole("link", { name: screen.label, exact: true })).toHaveAttribute("aria-current", "page");
    }
  }
});
