import { test, expect } from "./fixtures";
import { uniqueTitle } from "./helpers";
import { addDays, kstToday } from "../../src/features/bookings/schema";

test("TC-BOOKING-UI-001 타임라인 빈 칸 → 예약 → 블록 표시 → 다른 사용자 충돌 안내 → 취소 후 블록 제거", async ({ pageAs }) => {
  const date = addDays(kstToday(), 40);
  const title = uniqueTitle("TC-BOOKING-UI-001");
  const owner = await pageAs("user1");
  await owner.goto(`/bookings?date=${date}`);
  await expect(owner.getByTestId("day")).toContainText(date);
  await owner.getByRole("link", { name: "소회의실 A 10:00 예약", exact: true }).click();
  await expect(owner).toHaveURL(/\/bookings\/new\?/);
  await expect(owner.getByRole("combobox", { name: "날짜", exact: true })).toHaveValue(date.replaceAll("-", "."));
  await expect(owner.getByLabel("시작")).toHaveValue("10:00");
  await expect(owner.getByLabel("종료")).toHaveValue("11:00");
  await owner.getByLabel("종료").selectOption("11:30");
  await owner.getByLabel("제목").fill(title);
  await owner.getByRole("button", { name: "예약", exact: true }).click();
  await expect(owner.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(owner.getByText(`${date} 10:00–11:30`)).toBeVisible();

  await owner.getByRole("link", { name: "타임라인에서 보기", exact: true }).click();
  await expect(owner.getByTestId("booking-block").filter({ hasText: title })).toBeVisible();
  await expect(owner.getByRole("link", { name: "소회의실 A 10:30 예약", exact: true })).toHaveCount(0);

  const other = await pageAs("user2");
  await other.goto(`/bookings/new?date=${date}&start=11:00`);
  await other.getByLabel("회의실").selectOption({ label: "소회의실 A (최대 4명 · 본관 3층)" });
  await other.getByLabel("제목").fill(uniqueTitle("충돌"));
  await other.getByRole("button", { name: "예약", exact: true }).click();
  await expect(other.getByRole("alert").filter({ hasText: "이미 예약된 시간입니다" })).toBeVisible();
  await expect(other).toHaveURL(/\/bookings\/new/);

  await owner.getByTestId("booking-block").filter({ hasText: title }).click();
  await owner.getByRole("button", { name: "예약 취소", exact: true }).click();
  await owner.getByLabel("취소 사유 (선택)").fill("합성 취소");
  await owner.getByRole("button", { name: "취소 확인", exact: true }).click();
  await expect(owner.getByTestId("status")).toHaveText("취소");
  await owner.goto(`/bookings?date=${date}`);
  await expect(owner.getByTestId("booking-block").filter({ hasText: title })).toHaveCount(0);
  await expect(owner.getByRole("link", { name: "소회의실 A 10:30 예약", exact: true })).toHaveCount(1);
});

test("TC-BOOKING-UI-002 달력: 월 보기 칸에 예약 표시 → 주 보기 전환 → 다음 달 이동 → 날짜 → 그날 타임라인", async ({ pageAs, apiAs }) => {
  const date = addDays(kstToday(), 45);
  const title = uniqueTitle("TC-BOOKING-UI-002");
  const api = await apiAs("user1");
  const rooms = (await (await api.get("/api/v1/rooms")).json()).data as { id: string; name: string }[];
  const room = rooms.find((r) => r.name === "소회의실 A");
  expect((await api.post("/api/v1/bookings", { data: { roomId: room?.id, date, start: "14:00", end: "15:00", attendees: 2, title } })).status()).toBe(201);

  const page = await pageAs("user1");
  await page.goto("/bookings");
  await page.getByRole("link", { name: "달력", exact: true }).click();
  await expect(page.getByTestId("calendar")).toHaveAttribute("data-view", "month");
  await page.goto(`/bookings/calendar?date=${date}`);
  const cell = page.getByTestId("calendar").locator(`[data-date="${date}"]`).first();
  await expect(cell.getByTestId("calendar-event").filter({ hasText: title })).toHaveText(`14:00 소회의실 A · ${title}`);

  await page.getByRole("link", { name: "주", exact: true }).click();
  await expect(page.getByTestId("calendar")).toHaveAttribute("data-view", "week");
  await expect(page.locator(`li[data-date="${date}"]`).getByTestId("calendar-event").filter({ hasText: title })).toBeVisible();
  await page.getByRole("link", { name: "다음 주", exact: true }).click();
  await expect(page.locator(`li[data-date="${addDays(date, 7)}"]`)).toBeVisible();
  await expect(page.getByTestId("calendar-event").filter({ hasText: title })).toHaveCount(0);

  await page.goto(`/bookings/calendar?view=month&date=${date}`);
  await page.getByRole("link", { name: date, exact: true }).click();
  await expect(page.getByTestId("day")).toContainText(date);
  await expect(page.getByTestId("booking-block").filter({ hasText: title })).toBeVisible();
});
