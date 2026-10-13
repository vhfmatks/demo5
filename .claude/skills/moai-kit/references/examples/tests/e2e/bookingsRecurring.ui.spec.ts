import { test, expect } from "./fixtures";
import { expectData, selectKdsDate, uniqueTitle } from "./helpers";
import { addDays, kstToday, type BookingDto, type RoomDto } from "../../src/features/bookings/schema";

test("TC-BOOKING_SERIES-UI-001 일정 확인·입력 변경 시 재확인·전체 확정 후 새로고침 유지", async ({ pageAs }) => {
  const page = await pageAs("user1");
  const title = uniqueTitle("반복 UI");
  const date = addDays(kstToday(), 180);
  await page.goto("/bookings");
  await page.getByRole("link", { name: "반복 예약", exact: true }).click();
  await expect(page).toHaveURL(/\/bookings\/recurring$/);
  await page.getByLabel("회의실").selectOption({ label: "소회의실 A (최대 4명 · 본관 3층)" });
  await selectKdsDate(page, "날짜", date);
  await page.getByLabel("제목").fill(title);
  await page.getByLabel("반복 횟수").fill("3");
  await page.getByRole("button", { name: "일정 확인", exact: true }).click();
  const preview = page.getByRole("region", { name: "반복 일정 미리보기" });
  await expect(preview).toContainText(addDays(date, 14));
  await expect(preview.getByText("예약 가능", { exact: true })).toHaveCount(3);
  await page.getByLabel("반복 간격 (주)").selectOption("2");
  await expect(preview).toHaveCount(0);
  await expect(page.getByRole("button", { name: "전체 예약 확정" })).toHaveCount(0);
  await page.getByRole("button", { name: "일정 확인", exact: true }).click();
  await expect(preview).toContainText(addDays(date, 28));
  await page.getByRole("button", { name: "전체 예약 확정" }).click();
  await expect(page).toHaveURL(/\/bookings\/mine$/);
  await page.reload();
  await page.getByLabel("제목 검색", { exact: true }).fill(title);
  await page.getByLabel("제목 검색", { exact: true }).press("Enter");
  await expect(page.getByRole("link", { name: title, exact: true })).toHaveCount(3);
});

test("TC-BOOKING_SERIES-UI-002 충돌 날짜 표시·확정 차단·미리보기 후 선점 시 오류와 입력 유지", async ({ pageAs, apiAs }) => {
  const page = await pageAs("user1");
  const other = await apiAs("user2");
  const room = (await expectData<RoomDto[]>(await other.get("/api/v1/rooms"))).data.find((r) => r.name === "소회의실 A");
  expect(room).toBeTruthy();
  const date = addDays(kstToday(), 181);
  const title = uniqueTitle("UI 충돌");
  await page.goto("/bookings/recurring");
  await page.getByLabel("회의실").selectOption(room?.id ?? "");
  await selectKdsDate(page, "날짜", date);
  await page.getByLabel("제목").fill(title);
  await page.getByLabel("반복 횟수").fill("3");
  await page.getByRole("button", { name: "일정 확인", exact: true }).click();
  await expect(page.getByRole("button", { name: "전체 예약 확정" })).toBeVisible();
  await expectData<BookingDto>(await other.post("/api/v1/bookings", { data: {
    roomId: room?.id, date: addDays(date, 7), start: "09:00", end: "10:00", attendees: 2, title: uniqueTitle("선점"),
  } }), 201);
  await page.getByRole("button", { name: "전체 예약 확정" }).click();
  await expect(page.getByText("반복 일정에 충돌이 있어 전체 예약을 저장하지 않았습니다. 다시 확인해 주세요.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("제목")).toHaveValue(title);
  await expect(page).toHaveURL(/\/bookings\/recurring$/);
  await page.getByRole("button", { name: "일정 확인", exact: true }).click();
  const preview = page.getByRole("region", { name: "반복 일정 미리보기" });
  await expect(preview.getByText("충돌", { exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "전체 예약 확정" })).toHaveCount(0);
});
