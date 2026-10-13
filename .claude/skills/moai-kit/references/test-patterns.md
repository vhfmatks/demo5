# 시험 패턴 카탈로그 — 언제 무엇을 어떻게

표준 규칙은 프로젝트의 `docs/conventions/testing.md`에 있다. 이 문서는 그 규칙을 **기능 특성 → 필요한 시험 → 코드**로 바로 옮기기 위한 카탈로그다.

- 코드는 키트에서 통과한 실제 TC를 일반화한 것이다. `X`·`URL`·`XErrors`·`XDto`·`valid()`는 해당 도메인 것으로 바꾼다.
- 원본 TC 경로가 프로젝트에 없으면 `.claude/skills/moai-kit/references/examples/` 아래 같은 경로에서 읽는다(예제 도메인 시험).

## 1. 선택표: AC·기능에 이런 특성이 있으면 → 이 패턴

| AC·기능 신호 | 필요한 패턴 | 층 |
|---|---|---|
| 새 도메인 CRUD (`gen` 결과) | P01 · P02 · P03 · P04 · P20 — **gen이 이미 생성**. 필드·정책을 바꿨으면 기대값만 고친다 | API·UI |
| 익명 사용 (`--auth=public`) | P01(익명) · P02 · P09 — gen이 생성 | API·UI |
| "모두 볼 수 있다 / 작성자만 수정" (공유 조회) | P05 (P04 대신) | API |
| 서버가 정하는 값: 작성자·상태·조회수·승인자·관리자 전용 필드 | P06 | API |
| "상태", "승인/반려/취소", "~후에는 수정 불가" | P07 · P23 · (P16 전이 롤백) | API·UI·unit |
| "본인 건은 승인 불가" 같은 직무 분리 | P08 | API |
| "이름/코드는 중복 불가" | P10 | API |
| 시간·좌석·재고처럼 겹치거나 소진되는 자원 | P11 · P12 · P17 | API·unit |
| 목록 필터·보기(내 것/결재함)·검색·정렬 | P13 | API |
| 새 권한·역할, 관리자 전용 메뉴/화면 | P14 · P22 · unit RBAC 매트릭스 갱신 | API·UI·unit |
| "이력/로그를 남긴다" | P15 · P16 | API·unit |
| 계산·날짜·경계값 규칙(금액, 기간, 최대 N) | P17 | unit |
| 설정·전역 상태를 바꾸는 TC | P18 (복구 필수) | API |
| 부모-자식(댓글·항목): 다른 엔티티 참조 | P19 · P04(부모 권한 상속) | API |
| 입력 폼이 있는 화면 | P20 · P21 | UI |
| 로그인 필요한 화면 | P22 | UI |
| 두 역할이 주고받는 흐름(요청→승인) | P23 | UI |

공통 HTTP(Origin·MIME·64KiB·UUID)와 세션·로그인은 base의 `http.api.spec.ts`·`auth.*.spec.ts`가 이미 덮는다. 도메인마다 다시 쓰지 않는다.

## 2. 작성 절차 (AC → TC)

1. AC 문장마다 위 표의 신호를 찾고, 필요한 패턴 ID를 적는다.
2. TC 이름을 먼저 정한다.
   - 형식: `TC-<DOMAIN>-API|UI-NNN <무엇을 확인하는지>`
   - 보안 성격이면 끝에 `(SEC-…)` 태그를 붙인다(§6 "SEC 태그").
3. API 시험을 먼저 쓴다. 규칙 하나당 TC 하나이고, 거절 직후에는 **항상 저장값 불변**을 확인한다.
4. UI 시험은 사용자 흐름 AC 하나당 1개다. 세부 규칙은 API·unit에서 확인했으므로 UI에서 반복하지 않는다.
5. 계산·경계값·롤백은 unit(메모리 DB, 빠름)에서 확인한다.
6. TC마다 확인하는 경계(`정상`·`오류`·`권한`·`재조회`)를 정한다. AC 규칙에 오류·권한·저장 후 재조회 경계가 있으면 그 경계를 확인하는 TC가 빠지지 않게 한다.
7. `docs/prd.md`의 REQ 행에 TC ID를 적고, `docs/e2e-test.md` §2에 `TC | REQ | AC | 경계 | GIVEN · WHEN · THEN | 예상 결과 | 자동화 위치` 계획 행을 적는다(자동화 위치 = E2E spec · 같은 AC의 단위 시험 파일). 실제 결과는 실행 근거(`docs/evidence/`)로 `npm run e2e:dashboard`가 현황에 계산한다.

## 3. 패턴 카드 — API (`tests/e2e/<x>.api.spec.ts`)

공통 import:

```ts
import { test, expect } from "./fixtures";
import { expectData, expectError, expectNoContent, uniqueTitle } from "./helpers";
import { CommonErrors } from "../../src/lib/error-codes";
import { XErrors } from "../../src/features/xs/errors";
import type { XDto } from "../../src/features/xs/schema";
const URL = "/api/v1/xs";
```

### P01 CRUD 왕복
- **언제:** 모든 도메인. gen이 생성한다.
- **확인:** 생성 201 → 검색 목록에 있음 → 상세 → 수정 → 재조회 시 수정값, **생략한 필드는 유지** → 삭제 204 → 재조회 404
- **원본:** `TC-REQ-API-001`, gen의 `TC-<X>-API-001`

```ts
const { data } = await expectData<XDto>(await owner.post(URL, { data: { ...SAMPLE, title } }), 201);
expect((await expectData<XDto[]>(await owner.get(`${URL}?q=${encodeURIComponent(title)}`))).data[0].id).toBe(data.id);
await expectData(await owner.patch(`${URL}/${data.id}`, { data: { title: `${title} 수정` } }));
expect((await expectData<XDto>(await owner.get(`${URL}/${data.id}`))).data).toMatchObject({ ...SAMPLE, title: `${title} 수정` });
await expectNoContent(await owner.delete(`${URL}/${data.id}`));
await expectError(await owner.get(`${URL}/${data.id}`), XErrors.X_NOT_FOUND);
```

### P02 입력 검증 + 건수 불변
- **언제:** 입력이 있는 모든 쓰기. 필드 규칙(필수·길이·형식·범위)이 AC에 있으면 그 필드를 지정해서 확인한다.
- **확인:** 400 `VALIDATION_ERROR`, `fieldErrors`에 해당 필드, 필요하면 `issues[].code`, 목록 건수 불변
- **원본:** `TC-REQ-API-002`, `TC-BOOKING-API-002`

```ts
const before = (await expectData<XDto[]>(await owner.get(URL))).meta?.total;
const error = await expectError(await owner.post(URL, { data: { title: "" } }), CommonErrors.VALIDATION_ERROR);
expect(Object.keys(error.fieldErrors ?? {})).toEqual(expect.arrayContaining(["title", "amount"]));
expect(error.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ["title"], code: "too_small" })]));
expect((await expectData<XDto[]>(await owner.get(URL))).meta?.total).toBe(before);
```

### P03 비로그인 거부 `(SEC-02)`
- **언제:** 인증 도메인의 모든 메서드. gen이 생성한다.
- **원본:** `TC-REQ-API-003`

```ts
const anon = await apiAs(null);
const itemURL = `${URL}/${crypto.randomUUID()}`;
await expectError(await anon.get(URL), CommonErrors.AUTH_REQUIRED);
await expectError(await anon.post(URL, { data: valid("익명") }), CommonErrors.AUTH_REQUIRED);
await expectError(await anon.patch(itemURL, { data: { title: "x" } }), CommonErrors.AUTH_REQUIRED);
await expectError(await anon.delete(itemURL), CommonErrors.AUTH_REQUIRED);
```

### P04 소유권 경계 (타인은 존재도 모름) `(SEC-03)`
- **언제:** 본인 것만 보는 도메인(gen 기본 정책).
- **확인:** 타인의 조회·수정·삭제가 **404**, 타인 검색 목록에 노출 안 됨, 원본 불변
- **원본:** `TC-REQ-API-004`

```ts
await expectError(await other.get(itemURL), XErrors.X_NOT_FOUND);
await expectError(await other.patch(itemURL, { data: { title: "탈취" } }), XErrors.X_NOT_FOUND);
await expectError(await other.delete(itemURL), XErrors.X_NOT_FOUND);
expect((await expectData<XDto[]>(await other.get(`${URL}?q=${encodeURIComponent(title)}`))).data).toEqual([]);
expect((await expectData<XDto>(await owner.get(itemURL))).data.title).toBe(title);
```

### P05 공유 조회 + 행위 제한 `(SEC-03)`
- **언제:** 정책을 "모두 조회, 작성자만 수정"으로 바꿨을 때(게시판·공유 일정). **P04 대신 쓰고 gen의 TC-…-004 기대값을 이걸로 바꾼다.**
- **확인:** 타인 조회 200, 수정·삭제 403(`*_FORBIDDEN`), 관리 권한자는 삭제 허용, 원본 불변
- **원본:** `TC-BOOKING-API-004`

```ts
await expectData<XDto>(await other.get(itemURL));
await expectError(await other.patch(itemURL, { data: { title: "탈취" } }), XErrors.X_EDIT_FORBIDDEN);
await expectError(await other.delete(itemURL), XErrors.X_DELETE_FORBIDDEN);
expect((await expectData<XDto>(await owner.get(itemURL))).data.title).toBe(title);
await expectNoContent(await admin.delete(itemURL)); // x.manage.any 보유
```

### P06 서버 소유 필드 주입 거부 `(SEC-04)`
- **언제:** 작성자·상태·승인자·조회수·`pinned`(관리자 전용)처럼 클라이언트가 정하면 안 되는 값이 있을 때. 빈 PATCH도 함께 확인한다.
- **확인:** 알 수 없는 키는 400(strictObject). 스키마에 있지만 권한이 필요한 값은 403 또는 무시(정책대로). 값 불변.
- **원본:** `TC-REQ-API-008`

```ts
await expectError(await owner.patch(itemURL, { data: { title: "주입", ownerId: crypto.randomUUID() } }), CommonErrors.VALIDATION_ERROR);
await expectError(await owner.patch(itemURL, { data: {} }), CommonErrors.VALIDATION_ERROR);
expect((await expectData<XDto>(await owner.get(itemURL))).data.title).toBe(data.title);
```

### P07 상태 전이 매트릭스
- **언제:** 상태값(enum)과 전이 행위가 있을 때.
- **확인:** 4가지를 각각 확인하고, 매번 상태 불변을 함께 본다.
  1. 금지된 역할의 전이 → 403
  2. 허용된 전이 → 새 상태
  3. 재처리 → 409 `INVALID_STATE`
  4. 확정 후 수정·삭제 → 409
- **원본:** `TC-REQ-API-005`

```ts
await expectError(await owner.post(transition, { data: { action: "approve" } }), XErrors.X_TRANSITION_FORBIDDEN);
expect((await expectData<XDto>(await owner.get(itemURL))).data.status).toBe("PENDING");
expect((await expectData<XDto>(await approver.post(transition, { data: { action: "approve" } }))).data.status).toBe("APPROVED");
await expectError(await approver.post(transition, { data: { action: "reject", note: "재처리" } }), XErrors.X_TRANSITION_NOT_ALLOWED);
await expectError(await owner.patch(itemURL, { data: { title: "금지" } }), XErrors.X_EDIT_NOT_PENDING);
expect((await expectData<XDto>(await owner.get(itemURL))).data).toMatchObject({ title: data.title, status: "APPROVED" });
```

### P08 직무 분리 `(SEC-03)`
- **언제:** "본인 건 승인 불가"처럼 권한이 있어도 대상 조건으로 막는 규칙. **관리자로도 확인**한다(ADMIN은 모든 권한을 가지므로).
- **원본:** `TC-REQ-API-007`

```ts
const { data } = await expectData<XDto>(await admin.post(URL, { data: valid(uniqueTitle("TC-X-API-007")) }), 201);
await expectError(await admin.post(`${URL}/${data.id}/transition`, { data: { action: "approve" } }), XErrors.X_SELF_DECISION_FORBIDDEN);
expect((await expectData<XDto>(await admin.get(`${URL}/${data.id}`))).data.status).toBe("PENDING");
```

### P09 오래된 version 경합
- **언제:** 공개 CRUD(gen이 생성)나 낙관적 잠금을 넣은 도메인.
- **확인:** 같은 version으로 두 번째 수정·삭제 → 409 `CONFLICT`, 최신값 유지
- **원본:** `TC-PUB-API-002`

```ts
const updated = await expectData<XDto>(await first.patch(itemURL, { data: { memo: "최신", version: 1 } }));
await expectError(await second.patch(itemURL, { data: { memo: "오래된 화면", version: 1 } }), XErrors.X_VERSION_CONFLICT);
await expectError(await second.delete(`${itemURL}?version=1`), XErrors.X_VERSION_CONFLICT);
expect((await expectData<XDto>(await first.get(itemURL))).data).toMatchObject(updated.data);
```

### P10 유일성 충돌
- **언제:** "이름·코드 중복 불가"(DB unique + 도메인 오류 코드).
- **확인:** 같은 값으로 생성·수정 → 409, 건수 불변. 대소문자·공백 규칙이 AC에 있으면 그것도 확인한다.
- **원본:** `TC-ROOM-API-001`

### P11 겹침·경계
- **언제:** 시간·구간·수량처럼 서로 겹치면 안 되는 자원.
- **확인:**
  - 부분 겹침·포함 → 409
  - **경계가 맞닿는 것은 허용**
  - 다른 자원(다른 방)은 허용
  - 취소된 것은 재사용 가능
- **원본:** `TC-BOOKING-API-005` 앞부분

```ts
await expectData(await u1.post(URL, { data: slot(room, "10:00", "11:00") }), 201);
await expectError(await u2.post(URL, { data: slot(room, "10:30", "11:30") }), XErrors.X_TIME_CONFLICT);   // 부분 겹침
await expectError(await u2.post(URL, { data: slot(room, "09:00", "12:00") }), XErrors.X_TIME_CONFLICT);   // 포함
await expectData(await u2.post(URL, { data: slot(room, "11:00", "12:00") }), 201);                          // 경계
await expectData(await u2.post(URL, { data: slot(otherRoom, "10:00", "11:00") }), 201);                     // 다른 자원
```

### P12 동시 요청 1건만 성공
- **언제:** P11 자원, 재고 차감, "선착순 1명"처럼 동시성이 AC에 영향을 줄 때. 검사와 쓰기가 같은 tx에 있는지 확인하는 유일한 방법이다.
- **확인:** 여러 사용자가 동시에 같은 요청을 보내면 상태 정렬 결과가 `[201, 409, 409, 409]`이고, 실제 저장도 1건
- **원본:** `TC-BOOKING-API-005` 뒷부분

```ts
const racers = await Promise.all([apiAs("user1"), apiAs("user2"), apiAs("admin"), apiAs("approver")]);
const responses = await Promise.all(racers.map((ctx) => ctx.post(URL, { data: slot(room, "15:00", "16:00") })));
expect(responses.map((r) => r.status()).sort()).toEqual([201, 409, 409, 409]);
for (const r of responses.filter((x) => x.status() === 409)) await expectError(r, XErrors.X_TIME_CONFLICT);
```

### P13 목록 필터·보기 정확성
- **언제:** 필터·보기 모드·검색·정렬이 AC에 있을 때.
- **확인:** 결과 **id 집합을 정확히 비교**한다(포함 여부만 보지 않는다). 다른 사용자 데이터가 섞이지 않게 `uniqueTitle`로 `q`를 고정한다. 상태가 바뀐 뒤 결과가 갱신되는 것도 확인한다.
- **원본:** `TC-REQ-API-009`

```ts
const q = `q=${encodeURIComponent(title)}`;
const ids = async (ctx: typeof owner, params: string) =>
  (await expectData<XDto[]>(await ctx.get(`${URL}?${params}&${q}`))).data.map((r) => r.id);
expect(await ids(approver, "view=inbox")).toEqual([mine.data.id]);
expect(await ids(owner, "view=inbox")).toEqual([]);
expect(await ids(approver, "category=EQUIPMENT")).toEqual([own.data.id]);
```

정렬(예: 공지 먼저)은 `ids()` 결과의 순서를 `toEqual([pinned.id, normal.id])`로 비교한다.

### P14 권한(RBAC) 경계 `(SEC-03)`
- **언제:** 새 권한 키, 역할별 기능, 관리자 API.
- **확인:**
  - 비로그인 401, 권한 없는 역할 403(`AUTH_PERMISSION_REQUIRED`), 허용 역할 200
  - 역할 변경이 같은 세션에 즉시 반영됨
  - unit `tests/unit/rbac.test.ts`의 `EXPECTED` 매트릭스도 갱신
- **원본:** `TC-ADMIN-API-001`, `TC-RBAC-API-002`, `TC-ROOM-API-002`

```ts
for (const url of ["/api/v1/admin/xs"]) {
  await expectError(await anon.get(url), CommonErrors.AUTH_REQUIRED);
  await expectError(await user.get(url), CommonErrors.AUTH_PERMISSION_REQUIRED);
  await expectData(await admin.get(url));
}
```

### P15 감사로그 기록
- **언제:** "이력을 남긴다", 관리자 변경, 상태 전이.
- **확인:** 관리자 API로 해당 `action`·`entityId`의 로그를 조회하고 행위자·변경 내용을 확인한다.
- **원본:** `TC-ADMIN-API-002`, `TC-ADMIN-API-004`

```ts
const logs = await expectData<AuditLogDto[]>(await admin.get(`/api/v1/admin/auditLogs?action=x.create&entityId=${data.id}`));
expect(logs.data[0]).toMatchObject({ entity: "x", actor: { id: me.id } });
```

### P18 전역 상태 TC는 반드시 복구
- **언제:** 운영 설정·역할 변경처럼 다른 TC에 영향을 주는 상태를 바꿀 때. workers가 1이라 순서 의존이 생기기 쉽다.
- **원본:** `TC-ADMIN-API-003`·`004`

```ts
try {
  await expectData(await admin.patch("/api/v1/admin/settings", { data: { maintenanceMode: true } }));
  // ... 확인
} finally {
  await expectData(await admin.patch("/api/v1/admin/settings", { data: DEFAULTS }));
}
```

### P19 부모-자식 (댓글·하위 항목)
- **언제:** 자식이 부모 id를 참조할 때(`/xs/{id}/children`).
- **확인:**
  - 부모를 볼 수 없는 사람은 자식 목록·생성 모두 부모와 같은 오류(404)
  - 없는 부모 → 404
  - 자식 삭제는 자식 작성자만
  - 부모 삭제 시 자식 처리 규칙(함께 삭제 또는 거부)이 AC대로
- **근거:** P04(부모를 못 보면 404) + P05(자식 삭제는 작성자만)의 조합. 키트 원본은 없다(새로 작성).

```ts
await expectError(await other.get(`${URL}/${privateParent.id}/comments`), XErrors.X_NOT_FOUND);
await expectError(await owner.post(`${URL}/${crypto.randomUUID()}/comments`, { data: { content: "x" } }), XErrors.X_NOT_FOUND);
```

## 4. 패턴 카드 — UI (`tests/e2e/<x>.ui.spec.ts`)

```ts
import { test, expect } from "./fixtures";
import { loginUI, uniqueTitle } from "./helpers";
```

요소는 role·label·`data-testid`로만 찾는다. 기다릴 때는 `expect(...).toBeVisible()` 같은 재시도 assertion을 쓰고, 고정 sleep은 쓰지 않는다.

### P20 화면 CRUD + 새로고침 후 유지
- **언제:** 모든 도메인. gen이 생성한다. 필수 필드를 추가했으면 입력도 추가한다(`--fields`면 자동).
- **원본:** gen의 `TC-<X>-UI-001`, `TC-PUB-UI-001`

```ts
await loginUI(page, "user1");
await page.goto("/xs/new");
await page.getByLabel("제목").fill(title);
await page.getByRole("button", { name: "등록", exact: true }).click();
await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
await page.reload();
await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
```

### P21 필드 오류 표시 + 입력 화면 유지
- **언제:** 사용자가 직접 채우는 폼. 필수 필드마다 할 필요는 없고 대표 1개면 된다.
- **원본:** `TC-REQ-UI-002`

```ts
await page.getByRole("button", { name: "등록", exact: true }).click();
await expect(page.getByText("제목을 입력해 주세요.", { exact: true })).toBeVisible();
await expect(page.getByLabel("제목")).toHaveAttribute("aria-invalid", "true");
await expect(page).toHaveURL(/\/xs\/new$/);
```

### P22 접근 차단 화면 `(SEC-02 / SEC-03)`
- **언제:** 로그인 필수 화면은 로그인으로 이동해야 하고, 권한 화면은 **메뉴에 보이지 않고 직접 접근하면 404**여야 한다.
- **원본:** `TC-REQ-UI-003`, `TC-REQ-UI-005`, `TC-ADMIN-UI-003`

```ts
await page.goto("/xs");
await expect(page).toHaveURL(/\/login$/);                                    // 비로그인
const user = await pageAs("user1");
await expect(user.getByRole("link", { name: "결재함", exact: true })).toHaveCount(0);
expect((await user.goto("/approvals"))?.status()).toBe(404);                // 권한 없음
```

### P23 두 역할이 주고받는 흐름
- **언제:** 요청→승인, 예약→다른 사용자 충돌 안내처럼 서로 다른 사용자의 화면이 연결될 때.
- **확인:** `pageAs`로 두 사용자를 동시에 띄운다(fixture가 정리·스크린샷). 상대가 처리한 뒤 `reload()`해서 내 화면에 반영됐는지 확인한다.
- **원본:** `TC-REQ-UI-001`, `TC-REQ-UI-004`, `TC-BOOKING-UI-001`

```ts
const owner = await pageAs("user1");
// ... owner가 등록
const approver = await pageAs("approver");
await approver.goto(owner.url());
await approver.getByRole("button", { name: "승인", exact: true }).click();
await expect(approver.getByTestId("status")).toHaveText("승인");
await owner.reload();
await expect(owner.getByTestId("status")).toHaveText("승인");
```

## 5. 패턴 카드 — unit (`tests/unit/<x>.service.test.ts`)

메모리 DB를 쓰고 테스트마다 새로 마이그레이션한다. 서비스는 직접 호출하고 mock은 쓰지 않는다. 사용자는 `makeUser(role)`로 만든다.

```ts
import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { AppError } from "@/server/http/errors";
import * as svc from "@/features/xs/service";
import { CreateXInput } from "@/features/xs/schema";
import { makeUser } from "./fixtures";
const code = async (p: Promise<unknown>) => { try { await p; return "OK"; } catch (e) { return e instanceof AppError ? e.code : "UNKNOWN"; } };
```

### P16 감사로그 실패 시 롤백
- **언제:** 쓰기와 감사로그를 같은 tx로 묶는 모든 서비스. "쓰기와 감사로그는 같은 tx" 규칙을 증명하는 유일한 시험이다.
- **방법:** SQLite trigger로 해당 actor의 audit insert를 실패시킨다(mock 아님). 그다음 생성은 행이 남지 않고, 수정·전이는 값이 그대로인지 확인한다.
- **원본:** `tests/unit/requests.service.test.ts` "audit 실패 시 롤백"

```ts
const failAuditFor = (actorId: string) => db.run(sql.raw(
  `CREATE TRIGGER fail_audit_${actorId.replace(/\W/g, "_")} BEFORE INSERT ON audit_logs ` +
  `WHEN NEW.actor_id = '${actorId.replace(/'/g, "")}' BEGIN SELECT RAISE(ABORT, 'audit 실패 주입'); END`));

it("생성: audit 실패 시 행이 남지 않는다", async () => {
  const u = await makeUser();
  await failAuditFor(u.id);
  expect(await code(svc.createX(u, CreateXInput.parse({ title: "롤백" })))).not.toBe("OK");
  expect((await svc.listXs(u, { page: 1, pageSize: 100 })).items).toHaveLength(0);
});
```

### P17 규칙·경계값
- **언제:** 계산·기간·최대치·운영시간처럼 값의 경계가 AC에 있을 때. E2E보다 빠르고 경우의 수를 많이 넣을 수 있다.
- **확인:** 경계 바로 안쪽(허용)과 바로 바깥쪽(거부)을 짝으로 넣는다(예: 4시간 허용·4시간 30분 거부, 0 거부·1 허용).
- **방법:** zod 규칙은 `Schema.safeParse()`로, 서비스 규칙은 `code(svc.x(...))`로 오류 코드를 비교한다.
- **원본:** `tests/unit/bookings.service.test.ts` "시간 규칙", "겹치면 …"

## 6. 공통 규칙과 금지 패턴

| 해야 할 것 | 하지 말 것 |
|---|---|
| 거절 직후 재조회해서 **저장값·건수 불변** 확인 | 상태코드만 보고 끝내기 |
| 데이터는 `uniqueTitle("TC-ID")`로 만들고, 검색 `q`로 내 데이터만 보기 | 시드 데이터·다른 TC가 만든 데이터·실행 순서에 의존 |
| 오류는 `expectError(res, XErrors.CODE)`로 code·category 확인 | 메시지 문자열로 분기·비교(UI 문구 확인 P21만 예외) |
| 결과 목록은 id 배열을 정확히 비교 | `length > 0`만 확인 |
| 전역 상태는 `try/finally`로 복구(P18) | `test.only`·`skip`·`fixme`, `waitForTimeout`, `fetch`·route mock, 수동 `newContext` |
| 사용자는 `apiAs`/`pageAs`의 데모 계정. 비밀번호 변경 TC는 `user3` 전용 | user1·user2의 비밀번호·역할을 바꾸고 원복하지 않기 |

### SEC 태그 (TC 제목 끝)

| 태그 | 붙이는 경우 |
|---|---|
| `SEC-01` | 키·토큰·비밀번호가 응답·로그·감사에 없음 (base TC-AI-API-001) |
| `SEC-02` | 비로그인 거부, 로그인 실패 처리 (P03, P22 로그인 이동) |
| `SEC-03` | 타인·역할·권한 경계 (P04, P05, P08, P14, P22 권한) |
| `SEC-04` | 서버 소유 필드 주입, 크기 제한 (P06), Origin 검사 (base의 http 시험이 덮음) |
| `SEC-05` | 비밀번호 해시 저장·원문 미저장 (base `tests/unit/auth.service.test.ts`) |
| `SEC-06` | 보안 헤더·외부 https (base TC-HTTP-API-006) |
| `SEC-07` | 응답·화면 정보 최소화·마스킹 |
| `SEC-08` | 세션·쿠키·로그아웃·만료 (base TC-AUTH-API-002·003·006) |
| `SEC-09` | 반복 시도·과도한 요청 429·Retry-After (base 로그인 TC-AUTH-API-004, 익명 쓰기는 예제 TC-PUB-API-004처럼 `X-Forwarded-For`로 버킷 분리) |
| `SEC-10` | 보안 사건·변경 감사 기록과 비밀정보 미기록 (base TC-AUTH-API-005) |
| `SEC-11` | 개발·시험·운영 설정 분리, 데모 계정 노출 범위 |

번호는 주최 측 SEC-01~12(`docs/security-policy.md`) 기준이다. 공식 원문 번호가 다르면 태그를 함께 바꾼다.
