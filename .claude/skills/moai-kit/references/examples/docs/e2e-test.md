# E2E 시험 안내 · 결과

시험 계획·재현·검증 문서다. 어떻게 시험했고 무엇이 확인됐는지를 다른 사람이 재현할 수 있게 REQ·AC → TC(시나리오·정상/오류/권한/재조회 경계) → 시험 파일(E2E·단위) → 실행 환경·소스 SHA·시각·PASS/FAIL/SKIP·근거 경로로 연결하고 한계를 적는다. AC 충족 판정은 [prd](prd.md)가 소유하고 상세 로그는 `docs/evidence/`에 링크한다.

작성·실행 규칙은 [E2E 표준](conventions/testing.md), API 계약은 [API 표준](conventions/api.md)이 원본이다.
§2는 kit 공통 시나리오의 계획이다. 요구 확정 후 PRD의 REQ·AC와 보안 정책(`docs/security-policy.md`)의 SEC 번호를 각 TC에 연결한다. 공통 TC의 SEC 번호는 주최 측 SEC-01~12 기준이다.
- 실행 전: §2 계획 행(시나리오 GIVEN · WHEN · THEN, 확인하는 경계, 예상 결과, 자동화 위치)과 §1 실행 명령만 있고 현황의 결과는 `미구현`/`미실행`이다.
- 실행 후: `docs/evidence/<runId>.md`(E2E)·`docs/evidence/unit-<시각>.md`(단위)에 실행 환경·소스 SHA·시각·PASS/FAIL/SKIP이 남고 `npm run e2e:dashboard`가 현황을 그 근거로 다시 만든다. 결과는 이 프로젝트에서 직접 실행한 것만 기록한다.

## 현황

<!-- e2e-dashboard:start -->
> 자동 생성 — `npm run e2e:dashboard`로 다시 만들며 직접 고치지 않는다. 근거: §2 계획 · `tests/e2e` · `docs/evidence/<runId>.md` 0건 · `docs/evidence/unit-*.md`. 결과는 TC별 마지막 실행이고 시각은 UTC, 소스 SHA는 Git SHA(`*` = 미커밋 변경 상태의 실행) · 시험 소스 SHA-256 앞 8자다.

| 계획 TC | 자동화 | 검증 | 실패 | 미검증 | 미실행 | 미구현 |
|---|---|---|---|---|---|---|
| 101 | 101 | 0 | 0 | 0 | 101 | 0 |

단위 시험(Vitest 전체): 미실행 — `npm run test:unit:evidence`로 기록한다.

REQ별 경계 확인(검증 TC/계획 TC, `없음` = 계획된 TC가 없는 경계):

| REQ | TC | 정상 | 오류 | 권한 | 재조회 |
|---|---|---|---|---|---|
| 공통 | 0/51 | 0/38 | 0/21 | 0/16 | 0/14 |
| 예시 | 0/50 | 0/34 | 0/29 | 0/13 | 0/21 |

| REQ | AC | TC | 경계 | 시험 파일(E2E · 단위) | 결과 | 소스 SHA | 실행 시각(UTC) · 근거 | 실행 환경 | 이력 |
|---|---|---|---|---|---|---|---|---|---|
| 공통 | 공통 | TC-ADMIN-API-001 | 권한·재조회 | [admin.api](../tests/e2e/admin.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-ADMIN-API-002 | 정상·오류·재조회 | [admin.api](../tests/e2e/admin.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-ADMIN-API-003 | 오류 | [admin.api](../tests/e2e/admin.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-ADMIN-API-004 | 정상·권한·재조회 | [admin.api](../tests/e2e/admin.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-ADMIN-API-005 | 정상·오류·권한·재조회 | [admin.api](../tests/e2e/admin.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-ADMIN-API-006 | 정상·오류·권한·재조회 | [admin.api](../tests/e2e/admin.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-ADMIN-UI-001 | 정상·재조회 | [admin.ui](../tests/e2e/admin.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-ADMIN-UI-002 | 정상·오류 | [admin.ui](../tests/e2e/admin.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-ADMIN-UI-003 | 권한 | [admin.ui](../tests/e2e/admin.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-AI-API-001 | 정상·권한 | [ai.api](../tests/e2e/ai.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-AI-API-002 | 권한 | [ai.api](../tests/e2e/ai.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-AI-API-003 | 오류 | [ai.api](../tests/e2e/ai.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-AI-UI-001 | 정상 | [ai.ui](../tests/e2e/ai.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-AUTH-API-001 | 오류·권한 | [auth.api](../tests/e2e/auth.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-AUTH-API-002 | 오류·권한 | [auth.api](../tests/e2e/auth.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-AUTH-API-003 | 정상·권한 | [auth.api](../tests/e2e/auth.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-AUTH-API-004 | 오류·권한 | [auth.api](../tests/e2e/auth.api.spec.ts) · [auth.service](../tests/unit/auth.service.test.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-AUTH-API-005 | 정상·재조회 | [auth.api](../tests/e2e/auth.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-AUTH-API-006 | 오류·재조회 | [auth.api](../tests/e2e/auth.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-AUTH-UI-001 | 정상·오류·재조회 | [auth.ui](../tests/e2e/auth.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-AUTH-UI-002 | 정상·오류 | [auth.ui](../tests/e2e/auth.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-DENSITY-UI-004 | 정상 | [density.ui](../tests/e2e/density.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-DESIGN-UI-003 | 정상 | [designSystem.ui](../tests/e2e/designSystem.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-DESIGN-UI-004 | 정상 | [designSystem.ui](../tests/e2e/designSystem.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-DESIGN-UI-005 | 정상 | [designSystem.ui](../tests/e2e/designSystem.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-DESIGN-UI-006 | 정상 | [designSystem.ui](../tests/e2e/designSystem.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-DESIGN-UI-001 | 정상 | [designSystem.ui](../tests/e2e/designSystem.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-DESIGN-UI-002 | 오류 | [designSystem.ui](../tests/e2e/designSystem.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-DESIGN-UI-007 | 정상 | [designSystem.ui](../tests/e2e/designSystem.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-HTTP-API-001 | 오류 | [http.api](../tests/e2e/http.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-HTTP-API-002 | 정상·오류·재조회 | [http.api](../tests/e2e/http.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-HTTP-API-003 | 오류·권한 | [http.api](../tests/e2e/http.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-HTTP-API-004 | 오류·권한 | [http.api](../tests/e2e/http.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-HTTP-API-005 | 정상 | [http.api](../tests/e2e/http.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-HTTP-API-006 | 정상 | [http.api](../tests/e2e/http.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-RBAC-API-001 | 정상·오류·권한·재조회 | [rbac.api](../tests/e2e/rbac.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-RBAC-API-002 | 정상·권한·재조회 | [rbac.api](../tests/e2e/rbac.api.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-RBAC-UI-001 | 정상·권한·재조회 | [rbac.ui](../tests/e2e/rbac.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-RBAC-UI-002 | 정상·재조회 | [rbac.ui](../tests/e2e/rbac.ui.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-BOOKING-API-001 | 정상·재조회 | [bookings.api](../tests/e2e/bookings.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-BOOKING-API-002 | 오류·재조회 | [bookings.api](../tests/e2e/bookings.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-BOOKING-API-003 | 오류·권한 | [bookings.api](../tests/e2e/bookings.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-BOOKING-API-004 | 정상·권한·재조회 | [bookings.api](../tests/e2e/bookings.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-BOOKING-API-005 | 정상·오류 | [bookings.api](../tests/e2e/bookings.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-BOOKING-UI-001 | 정상·오류 | [bookings.ui](../tests/e2e/bookings.ui.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-BOOKING-UI-002 | 정상 | [bookings.ui](../tests/e2e/bookings.ui.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-BOOKING_SERIES-API-001 | 정상 | [bookingsRecurring.api](../tests/e2e/bookingsRecurring.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-BOOKING_SERIES-API-002 | 오류·재조회 | [bookingsRecurring.api](../tests/e2e/bookingsRecurring.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-BOOKING_SERIES-API-003 | 정상·오류 | [bookingsRecurring.api](../tests/e2e/bookingsRecurring.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-BOOKING_SERIES-API-004 | 재조회 | [bookingsRecurring.api](../tests/e2e/bookingsRecurring.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-BOOKING_SERIES-UI-001 | 정상·재조회 | [bookingsRecurring.ui](../tests/e2e/bookingsRecurring.ui.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-BOOKING_SERIES-UI-002 | 정상·오류·재조회 | [bookingsRecurring.ui](../tests/e2e/bookingsRecurring.ui.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-PUB-API-001 | 정상 | [publicNotes.api](../tests/e2e/publicNotes.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-PUB-API-002 | 오류·재조회 | [publicNotes.api](../tests/e2e/publicNotes.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-PUB-API-003 | 오류 | [publicNotes.api](../tests/e2e/publicNotes.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-PUB-API-004 | 오류·재조회 | [publicNotes.api](../tests/e2e/publicNotes.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-PUB-UI-001 | 정상·재조회 | [publicNotes.ui](../tests/e2e/publicNotes.ui.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-PUB-UI-002 | 정상·오류 | [publicNotes.ui](../tests/e2e/publicNotes.ui.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-API-001 | 정상·재조회 | [requests.api](../tests/e2e/requests.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-API-002 | 정상·오류·재조회 | [requests.api](../tests/e2e/requests.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-API-003 | 오류·권한 | [requests.api](../tests/e2e/requests.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-API-004 | 정상·오류·권한·재조회 | [requests.api](../tests/e2e/requests.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-API-005 | 오류·재조회 | [requests.api](../tests/e2e/requests.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-API-006 | 정상·오류·권한·재조회 | [requests.api](../tests/e2e/requests.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-API-007 | 오류·권한 | [requests.api](../tests/e2e/requests.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-API-008 | 오류·재조회 | [requests.api](../tests/e2e/requests.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-API-009 | 오류·권한 | [requests.api](../tests/e2e/requests.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-API-010 | 정상 | [requests.api](../tests/e2e/requests.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-API-011 | 정상·오류 | [requests.api](../tests/e2e/requests.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-API-012 | 오류·권한 | [requests.api](../tests/e2e/requests.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-API-013 | 정상·오류·권한 | [requests.api](../tests/e2e/requests.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-API-014 | 정상·오류·권한 | [requests.api](../tests/e2e/requests.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-API-015 | 정상·오류 | [requests.api](../tests/e2e/requests.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-UI-001 | 정상·재조회 | [requests.ui](../tests/e2e/requests.ui.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-UI-002 | 오류·재조회 | [requests.ui](../tests/e2e/requests.ui.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-UI-003 | 정상·권한 | [requests.ui](../tests/e2e/requests.ui.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-UI-004 | 정상 | [requests.ui](../tests/e2e/requests.ui.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-UI-005 | 권한 | [requests.ui](../tests/e2e/requests.ui.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-UI-006 | 정상 | [requests.ui](../tests/e2e/requests.ui.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-UI-007 | 정상·오류 | [requests.ui](../tests/e2e/requests.ui.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-UI-008 | 정상 | [requests.ui](../tests/e2e/requests.ui.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-UI-009 | 정상·재조회 | [requests.ui](../tests/e2e/requests.ui.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-UI-010 | 정상·오류·재조회 | [requests.ui](../tests/e2e/requests.ui.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-UI-011 | 정상 | [requests.ui](../tests/e2e/requests.ui.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-REQ-UI-012 | 정상 | [requests.ui](../tests/e2e/requests.ui.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-ROOM-API-001 | 정상·오류 | [rooms.api](../tests/e2e/rooms.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-ROOM-API-002 | 권한·재조회 | [rooms.api](../tests/e2e/rooms.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-ROOM-API-003 | 정상·오류 | [rooms.api](../tests/e2e/rooms.api.spec.ts) | 미실행 | — | — | — | — |
| 예시 | 예시 | TC-ROOM-UI-001 | 정상 | [rooms.ui](../tests/e2e/rooms.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-KDS-UI-001 | 정상 | [kdsParity.ui](../tests/e2e/kdsParity.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-KDS-UI-002 | 정상 | [kdsParity.ui](../tests/e2e/kdsParity.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-KDS-UI-003 | 정상 | [kdsParity.ui](../tests/e2e/kdsParity.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-KDS-UI-004 | 정상 | [kdsParity.ui](../tests/e2e/kdsParity.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-KDS-UI-005 | 정상 | [kdsParity.ui](../tests/e2e/kdsParity.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-KDS-UI-006 | 정상 | [kdsParity.ui](../tests/e2e/kdsParity.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-KDS-UI-007 | 정상 | [kdsParity.ui](../tests/e2e/kdsParity.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-KDS-UI-008 | 정상 | [kdsParity.ui](../tests/e2e/kdsParity.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-KDS-UI-010 | 정상·오류 | [kdsParity.ui](../tests/e2e/kdsParity.ui.spec.ts) · [date-values](../tests/unit/date-values.test.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-KDS-UI-009 | 정상 | [kdsParity.ui](../tests/e2e/kdsParity.ui.spec.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-DESIGN-UI-008 | 정상·오류 | [designSystem.ui](../tests/e2e/designSystem.ui.spec.ts) · [date-values](../tests/unit/date-values.test.ts) | 미실행 | — | — | — | — |
| 공통 | 공통 | TC-KDS-API-001 | 정상·오류 | [kdsFonts.api](../tests/e2e/kdsFonts.api.spec.ts) · [kds-fonts](../tests/unit/kds-fonts.test.ts) | 미실행 | — | — | — | — |
<!-- e2e-dashboard:end -->

## 1. 재현 환경 · 명령

Node 24 또는 26 이상, npm 11 이상. UI 실행에는 Playwright Chromium 또는 설치된 Edge/Chrome이 필요하다.

```powershell
npm ci
npm run lint
npm run typecheck
npm run test:e2e:api       # 실제 HTTP·DB·세션, 브라우저 불필요
$env:PW_CHANNEL = "msedge"
npm run test:e2e          # API + UI 전체
npm run test:unit:evidence # 단위 시험 전체 + docs/evidence/unit-<시각>.md 기록
npm run evidence         # 마지막 실행 근거 재생성, 시험 재실행 없음
```

각 명령의 종료코드를 확인한다. runner가 새 runId·포트·DB를 만들고 migration·합성 seed·production build·서버 기동·시험을 수행하며 종료 시 서버 프로세스를 정리한다. 직접 서버를 띄우거나 종료·정리할 필요가 없고 개발 서버와 DB를 재사용하지 않는다.
한 작업 폴더에서 동시 build는 피한다. 사용하는 계정과 데이터는 `tests/e2e/helpers.ts`, `scripts/db-seed.mts`의 합성 데이터뿐이다.

## 2. 시나리오

각 TC는 다른 TC의 데이터·순서에 의존하지 않는다. API는 공통 응답 assertion으로 HTTP 상태·봉투·trace·캐시 정책도 함께 검사한다. 이 절은 계획의 원본이다. 표는 `TC | REQ | AC | 경계 | GIVEN · WHEN · THEN | 예상 결과 | 자동화 위치` 7칸이다. REQ는 AC 번호의 REQ(AC-01-1 → REQ-01, 공통 TC는 `공통`), 경계는 이 TC가 확인하는 `정상`·`오류`·`권한`·`재조회`(저장 후 재조회·거부 뒤 저장값 불변) 중 하나 이상을 `·`로 적는다. 자동화 위치는 E2E spec 1개와 같은 AC를 확인하는 `tests/unit` 파일을 `·`로 적는다. TC ID·자동화 위치는 실제 `test("TC-…")` 제목·파일과 같아야 하며 `npm run lint:contracts`가 REQ·경계·파일까지 대조한다. 상태는 표에 적지 않고 위 현황 블록이 근거에서 계산한다.

요구 확정 후 REQ·AC별 절(`### 2.1 …`)을 추가하고 각 TC의 AC 칸에 PRD의 AC ID를 적는다.

### 공통 시나리오

| TC | REQ | AC | 경계 | GIVEN · WHEN · THEN | 예상 결과 | 자동화 위치 |
|---|---|---|---|---|---|---|
| TC-ADMIN-API-001 (SEC-02) | 공통 | 공통 | 권한·재조회 | — | 비로그인 401·일반/승인자 403, 설정값 불변 | tests/e2e/admin.api.spec.ts |
| TC-ADMIN-API-002 | 공통 | 공통 | 정상·오류·재조회 | — | 설정 변경·재조회·감사로그 기록, 잘못된 입력 400·값 불변 | tests/e2e/admin.api.spec.ts |
| TC-ADMIN-API-003 | 공통 | 공통 | 오류 | — | 점검 모드: 일반 쓰기 503·읽기/로그인 허용·관리자 쓰기 허용 | tests/e2e/admin.api.spec.ts |
| TC-ADMIN-API-004 (SEC-03) | 공통 | 공통 | 정상·권한·재조회 | — | 역할 변경 즉시 적용·감사로그, 본인 변경 403 | tests/e2e/admin.api.spec.ts |
| TC-ADMIN-API-005 (SEC-08) | 공통 | 공통 | 정상·오류·권한·재조회 | — | 세션 유지 시간 설정이 새 로그인 쿠키 만료에 적용 | tests/e2e/admin.api.spec.ts |
| TC-ADMIN-API-006 (SEC-03) | 공통 | 공통 | 정상·오류·권한·재조회 | — | 부서 지정·감사로그·내 정보 반영, 잘못된 값 400·권한 없는 역할 403 | tests/e2e/admin.api.spec.ts |
| TC-ADMIN-UI-001 | 공통 | 공통 | 정상·재조회 | — | 관리자가 공지 배너 저장 → 사용자 화면 표시 → 감사로그 확인 → 해제 | tests/e2e/admin.ui.spec.ts |
| TC-ADMIN-UI-002 | 공통 | 공통 | 정상·오류 | — | 잘못된 설정값은 필드 오류·저장 안 됨 | tests/e2e/admin.ui.spec.ts |
| TC-ADMIN-UI-003 (SEC-03) | 공통 | 공통 | 권한 | — | 관리자 외 사용자는 포털 404·메뉴 미노출 | tests/e2e/admin.ui.spec.ts |
| TC-AI-API-001 (SEC-01) | 공통 | 공통 | 정상·권한 | — | 공급자 연결 시험 → 등록(키 비공개) → 모델 시험 → 등록·기본 지정 → 삭제 | tests/e2e/ai.api.spec.ts |
| TC-AI-API-002 (SEC-03) | 공통 | 공통 | 권한 | — | ai.manage 없는 역할 403·비로그인 401 | tests/e2e/ai.api.spec.ts |
| TC-AI-API-003 (SEC-06) | 공통 | 공통 | 오류 | — | 주소 규칙: 외부 http·계정 포함 주소 400, 리다이렉트는 따라가지 않음 | tests/e2e/ai.api.spec.ts |
| TC-AI-UI-001 | 공통 | 공통 | 정상 | — | 관리자: 공급자 연결 테스트 → 등록 → 모델 제안·시험 → 등록(기본) → 행 시험 → 공급자 삭제 | tests/e2e/ai.ui.spec.ts |
| TC-AUTH-API-001 (SEC-02) | 공통 | 공통 | 오류·권한 | — | 잘못된 비밀번호·없는 계정은 같은 공개 오류 | tests/e2e/auth.api.spec.ts |
| TC-AUTH-API-002 (SEC-08) | 공통 | 공통 | 오류·권한 | — | 로그인 쿠키·현재 사용자·로그아웃 후 세션 거부 | tests/e2e/auth.api.spec.ts |
| TC-AUTH-API-003 (SEC-08) | 공통 | 공통 | 정상·권한 | — | 비밀번호 변경: 현재 비밀번호·규칙 검증, 다른 세션 폐기·새 비밀번호로만 로그인 | tests/e2e/auth.api.spec.ts |
| TC-AUTH-API-004 (SEC-09) | 공통 | 공통 | 오류·권한 | — | 같은 이메일 반복 실패 → 429·Retry-After, 다른 계정은 로그인 가능 | tests/e2e/auth.api.spec.ts · tests/unit/auth.service.test.ts |
| TC-AUTH-API-005 (SEC-10) | 공통 | 공통 | 정상·재조회 | — | 로그인 실패·로그아웃 감사 기록, 이메일 원문·비밀번호 미기록 | tests/e2e/auth.api.spec.ts |
| TC-AUTH-API-006 (SEC-08) | 공통 | 공통 | 오류·재조회 | — | 만료된 세션은 보호 API 401, 거부된 쓰기는 저장되지 않음 | tests/e2e/auth.api.spec.ts |
| TC-AUTH-UI-001 | 공통 | 공통 | 정상·오류·재조회 | — | 데모 계정 선택 로그인 → 내 정보 확인 → 비밀번호 규칙 오류·세션 유지 | tests/e2e/auth.ui.spec.ts |
| TC-AUTH-UI-002 | 공통 | 공통 | 정상·오류 | — | 로그인 입력 오류는 요청 전에 필드에 표시 | tests/e2e/auth.ui.spec.ts |
| TC-DENSITY-UI-004 | 공통 | 공통 | 정상 | — | 360·1280 에서 목록 화면 가로 넘침 없음, PC FilterBar 항목 세로 정렬 일치 | tests/e2e/density.ui.spec.ts |
| TC-DESIGN-UI-003 | 공통 | 공통 | 정상 | — | 탭 키보드·아코디언·팝오버·툴팁 | tests/e2e/designSystem.ui.spec.ts |
| TC-DESIGN-UI-004 | 공통 | 공통 | 정상 | — | 모바일 시트·팝업·토스트·스낵바 닫기와 포커스 | tests/e2e/designSystem.ui.spec.ts |
| TC-DESIGN-UI-005 | 공통 | 공통 | 정상 | — | 날짜·선택·범위는 키보드와 폼 값으로 동작 | tests/e2e/designSystem.ui.spec.ts |
| TC-DESIGN-UI-006 | 공통 | 공통 | 정상 | — | AI 입력·첨부·중지·문서 페이지·차트 | tests/e2e/designSystem.ui.spec.ts |
| TC-DESIGN-UI-001 | 공통 | 공통 | 정상 | — | 모바일·태블릿 메뉴·현재 위치·Escape·PC 전환 | tests/e2e/designSystem.ui.spec.ts |
| TC-DESIGN-UI-002 | 공통 | 공통 | 오류 | — | 필드 오류 연결·삭제 모달 포커스 격리와 복원 | tests/e2e/designSystem.ui.spec.ts |
| TC-DESIGN-UI-007 | 공통 | 공통 | 정상 | — | 로그인·관리자 모바일/태블릿 메뉴 이동 | tests/e2e/designSystem.ui.spec.ts |
| TC-HTTP-API-001 | 공통 | 공통 | 오류 | — | 잘못된 JSON 400·지원하지 않는 Content-Type 415 | tests/e2e/http.api.spec.ts |
| TC-HTTP-API-002 (SEC-04) | 공통 | 공통 | 정상·오류·재조회 | — | JSON 64KiB 초과 413·저장값 불변 | tests/e2e/http.api.spec.ts |
| TC-HTTP-API-003 (SEC-04) | 공통 | 공통 | 오류·권한 | — | Origin 누락·잘못된 형식 거부 | tests/e2e/http.api.spec.ts |
| TC-HTTP-API-004 (SEC-04) | 공통 | 공통 | 오류·권한 | — | 같은 host여도 다른 scheme·port 거부 | tests/e2e/http.api.spec.ts |
| TC-HTTP-API-005 | 공통 | 공통 | 정상 | — | UUID 경로·unknown 필드 검증과 query 보정 | tests/e2e/http.api.spec.ts |
| TC-HTTP-API-006 (SEC-06) | 공통 | 공통 | 정상 | — | 화면·API 응답 보안 헤더, 서버 정보 비노출 | tests/e2e/http.api.spec.ts |
| TC-RBAC-API-001 (SEC-03) | 공통 | 공통 | 정상·오류·권한·재조회 | — | 감사 담당은 감사로그만 조회, 설정·사용자·역할 변경·결재는 거부 | tests/e2e/rbac.api.spec.ts |
| TC-RBAC-API-002 (SEC-03) | 공통 | 공통 | 정상·권한·재조회 | — | 역할 변경 즉시 권한 반영: 일반→감사 담당→일반 | tests/e2e/rbac.api.spec.ts |
| TC-RBAC-UI-001 (SEC-03) | 공통 | 공통 | 정상·권한·재조회 | — | 감사 담당 포털: 권한 있는 메뉴만 표시, 권한 없는 화면 404, 권한 매트릭스 확인 | tests/e2e/rbac.ui.spec.ts |
| TC-RBAC-UI-002 | 공통 | 공통 | 정상·재조회 | — | 관리자 포털 메뉴 전체 표시·역할 선택지에 감사 담당 포함 | tests/e2e/rbac.ui.spec.ts |

### 예제 도메인 시나리오

예제판(`init --example`)의 참고 도메인 시험이다. 예제 도메인을 지울 때 시험 파일과 이 행을 함께 지운다.

| TC | REQ | AC | 경계 | GIVEN · WHEN · THEN | 예상 결과 | 자동화 위치 |
|---|---|---|---|---|---|---|
| TC-BOOKING-API-001 | 예시 | 예시 | 정상·재조회 | — | 예약·날짜 목록·조회·시간 변경·취소 후 재조회 | tests/e2e/bookings.api.spec.ts |
| TC-BOOKING-API-002 | 예시 | 예시 | 오류·재조회 | — | 시간·인원·과거·필드 검증 400과 건수 불변 | tests/e2e/bookings.api.spec.ts |
| TC-BOOKING-API-003 (SEC-02) | 예시 | 예시 | 오류·권한 | — | 비로그인 거부 | tests/e2e/bookings.api.spec.ts |
| TC-BOOKING-API-004 (SEC-03) | 예시 | 예시 | 정상·권한·재조회 | — | 일정은 공유 조회(메모는 예약자만), 타인 수정·취소 403·값 불변, 관리자 취소 허용 | tests/e2e/bookings.api.spec.ts |
| TC-BOOKING-API-005 | 예시 | 예시 | 정상·오류 | — | 겹침 409·경계 허용·다른 회의실 허용, 같은 슬롯 동시 요청은 1건만 성공 | tests/e2e/bookings.api.spec.ts |
| TC-BOOKING-UI-001 | 예시 | 예시 | 정상·오류 | — | 타임라인 빈 칸 → 예약 → 블록 표시 → 다른 사용자 충돌 안내 → 취소 후 블록 제거 | tests/e2e/bookings.ui.spec.ts |
| TC-BOOKING-UI-002 | 예시 | 예시 | 정상 | — | 달력: 월 보기 칸에 예약 표시 → 주 보기 전환 → 다음 달 이동 → 날짜 → 그날 타임라인 | tests/e2e/bookings.ui.spec.ts |
| TC-BOOKING_SERIES-API-001 | 예시 | 예시 | 정상 | — | 미리보기는 저장하지 않고 확정은 전체 회차를 저장한다 | tests/e2e/bookingsRecurring.api.spec.ts |
| TC-BOOKING_SERIES-API-002 | 예시 | 예시 | 오류·재조회 | — | 미리보기 이후 중간 일정 선점은 409와 전체 롤백 | tests/e2e/bookingsRecurring.api.spec.ts |
| TC-BOOKING_SERIES-API-003 | 예시 | 예시 | 정상·오류 | — | 동시 확정은 한 묶음만 성공하고 다른 묶음은 전체 거부 | tests/e2e/bookingsRecurring.api.spec.ts |
| TC-BOOKING_SERIES-API-004 | 예시 | 예시 | 재조회 | — | 인증과 횟수·간격·시간·unknown 필드 검증 후 건수 불변 | tests/e2e/bookingsRecurring.api.spec.ts |
| TC-BOOKING_SERIES-UI-001 | 예시 | 예시 | 정상·재조회 | — | 일정 확인·입력 변경 시 재확인·전체 확정 후 새로고침 유지 | tests/e2e/bookingsRecurring.ui.spec.ts |
| TC-BOOKING_SERIES-UI-002 | 예시 | 예시 | 정상·오류·재조회 | — | 충돌 날짜 표시·확정 차단·미리보기 후 선점 시 오류와 입력 유지 | tests/e2e/bookingsRecurring.ui.spec.ts |
| TC-PUB-API-001 | 예시 | 예시 | 정상 | — | 익명 생성·목록·조회·수정·삭제 | tests/e2e/publicNotes.api.spec.ts |
| TC-PUB-API-002 | 예시 | 예시 | 오류·재조회 | — | 오래된 version 수정·삭제 거부와 값 불변 | tests/e2e/publicNotes.api.spec.ts |
| TC-PUB-API-003 | 예시 | 예시 | 오류 | — | 빈 값·version 누락·없는 대상 처리 | tests/e2e/publicNotes.api.spec.ts |
| TC-PUB-API-004 (SEC-09) | 예시 | 예시 | 오류·재조회 | — | 익명 쓰기는 주소당 분당 60회, 초과 시 429·Retry-After·저장값 불변 | tests/e2e/publicNotes.api.spec.ts |
| TC-PUB-UI-001 | 예시 | 예시 | 정상·재조회 | — | 익명 생성·수정·새로고침·삭제 후 목록 확인 | tests/e2e/publicNotes.ui.spec.ts |
| TC-PUB-UI-002 | 예시 | 예시 | 정상·오류 | — | 공백 제목은 요청 전 거부하고 수정 후 저장 | tests/e2e/publicNotes.ui.spec.ts |
| TC-REQ-API-001 | 예시 | 예시 | 정상·재조회 | — | 생성·목록·조회·PATCH 생략 필드 유지·삭제 | tests/e2e/requests.api.spec.ts |
| TC-REQ-API-002 | 예시 | 예시 | 정상·오류·재조회 | — | 검증 오류의 필드·규칙 상세와 저장값 불변 | tests/e2e/requests.api.spec.ts |
| TC-REQ-API-003 (SEC-02) | 예시 | 예시 | 오류·권한 | — | 비로그인 CRUD 거부 | tests/e2e/requests.api.spec.ts |
| TC-REQ-API-004 (SEC-03) | 예시 | 예시 | 정상·오류·권한·재조회 | — | 타인 조회·수정·삭제·목록 노출 거부와 값 불변 | tests/e2e/requests.api.spec.ts |
| TC-REQ-API-005 | 예시 | 예시 | 오류·재조회 | — | 역할·상태 전이·재처리·확정 후 수정 거부와 값 불변 | tests/e2e/requests.api.spec.ts |
| TC-REQ-API-006 (SEC-04) | 예시 | 예시 | 정상·오류·권한·재조회 | — | 외부 Origin 쓰기 거부와 저장값 불변 | tests/e2e/requests.api.spec.ts |
| TC-REQ-API-007 (SEC-03) | 예시 | 예시 | 오류·권한 | — | 관리자도 자기 요청 승인 거부 | tests/e2e/requests.api.spec.ts |
| TC-REQ-API-008 (SEC-04) | 예시 | 예시 | 오류·재조회 | — | 서버 소유 필드 주입·빈 PATCH 거부와 값 불변 | tests/e2e/requests.api.spec.ts |
| TC-REQ-API-009 | 예시 | 예시 | 오류·권한 | — | 보기 필터: 결재 대기는 타인의 대기 요청만, 일반 사용자는 빈 목록·분류 필터 | tests/e2e/requests.api.spec.ts |
| TC-REQ-API-010 (SEC-04) | 예시 | 예시 | 정상 | — | CSV 내보내기: 첨부 헤더·BOM·필터·조회 범위·수식 주입 무력화 | tests/e2e/requests.api.spec.ts |
| TC-REQ-API-011 (SEC-04) | 예시 | 예시 | 정상·오류 | — | 가져오기: CSV·XLSX 일괄 생성, 행 오류 시 전부 거부, 형식·크기 거부 | tests/e2e/requests.api.spec.ts |
| TC-REQ-API-012 (SEC-03) | 예시 | 예시 | 오류·권한 | — | 부서장: 같은 부서 요청만 목록·상세·통계·내보내기, 결재·수정 거부 | tests/e2e/requests.api.spec.ts |
| TC-REQ-API-013 (SEC-04) | 예시 | 예시 | 정상·오류·권한 | — | AI 분류 추천: 미등록 503 → 등록 후 추천, AI 출력이 분류 밖이면 502, 입력 검증·비로그인 | tests/e2e/requests.api.spec.ts |
| TC-REQ-API-014 (SEC-04) | 예시 | 예시 | 정상·오류·권한 | — | 수행계획 저장: version 증가·빈 값 삭제·오래된 version 409·검증(2000자·누락·주입)·타인 404·비로그인·외부 Origin·확정 후 거부 | tests/e2e/requests.api.spec.ts |
| TC-REQ-API-015 (SEC-06) | 예시 | 예시 | 정상·오류 | — | AI 수행계획 초안: 무저장·DB 제목/내용만 전송·거부는 AI 호출 전·형식 오류 502·미등록 503 | tests/e2e/requests.api.spec.ts |
| TC-REQ-UI-001 | 예시 | 예시 | 정상·재조회 | — | 등록·다른 역할 승인·새로고침 후 저장 상태 확인 | tests/e2e/requests.ui.spec.ts |
| TC-REQ-UI-002 | 예시 | 예시 | 오류·재조회 | — | 필수값 누락 시 필드 오류·입력 화면 유지 | tests/e2e/requests.ui.spec.ts |
| TC-REQ-UI-003 (SEC-02) | 예시 | 예시 | 정상·권한 | — | 비로그인 보호 화면은 로그인으로 이동 | tests/e2e/requests.ui.spec.ts |
| TC-REQ-UI-004 | 예시 | 예시 | 정상 | — | 승인자 대시보드 결재 대기 → 결재함 → 반려 → 양쪽 처리 이력 확인 | tests/e2e/requests.ui.spec.ts |
| TC-REQ-UI-005 (SEC-03) | 예시 | 예시 | 권한 | — | 일반 사용자는 결재함 404·메뉴 미노출 | tests/e2e/requests.ui.spec.ts |
| TC-REQ-UI-006 | 예시 | 예시 | 정상 | — | 대시보드 차트·처리율 표시 | tests/e2e/requests.ui.spec.ts |
| TC-REQ-UI-007 | 예시 | 예시 | 정상·오류 | — | 가져오기 화면: 행 오류 목록 → 고친 파일 → 목록에 반영 | tests/e2e/requests.ui.spec.ts |
| TC-REQ-UI-008 | 예시 | 예시 | 정상 | — | AI 분류 추천: 버튼 → 분류 선택지 채움·이유 표시 → 사용자가 등록 | tests/e2e/requests.ui.spec.ts |
| TC-REQ-UI-009 | 예시 | 예시 | 정상·재조회 | — | AI 수행계획: 초안 미리보기(자동 반영 없음) → 명시 가져오기 → 수정 → 저장 → 새로고침 유지 | tests/e2e/requests.ui.spec.ts |
| TC-REQ-UI-010 | 예시 | 예시 | 정상·오류·재조회 | — | AI 형식 오류에도 직접 입력·저장 가능, 다른 화면이 먼저 저장하면 거부하고 새로고침 후 최신 계획 확인 | tests/e2e/requests.ui.spec.ts |
| TC-REQ-UI-011 | 예시 | 예시 | 정상 | — | 늦게 도착한 AI 초안은 편집 중인 글을 덮어쓰지 않고 가져오기는 명시 동작 | tests/e2e/requests.ui.spec.ts |
| TC-REQ-UI-012 | 예시 | 예시 | 정상 | — | 수행계획 편집 화면: 모바일 360·375 / PC 1280 가로 넘침 없이 입력·저장 | tests/e2e/requests.ui.spec.ts |
| TC-ROOM-API-001 | 예시 | 예시 | 정상·오류 | — | 등록·목록·수정·이름 중복 409·입력 검증 400 | tests/e2e/rooms.api.spec.ts |
| TC-ROOM-API-002 (SEC-03) | 예시 | 예시 | 권한·재조회 | — | room.manage 없는 역할 403·비로그인 401·값 불변 | tests/e2e/rooms.api.spec.ts |
| TC-ROOM-API-003 | 예시 | 예시 | 정상·오류 | — | 예정 예약이 있으면 중지·인원 축소 409, 취소 후 중지하면 예약 불가·재개 가능 | tests/e2e/rooms.api.spec.ts |
| TC-ROOM-UI-001 | 예시 | 예시 | 정상 | — | 관리자 다크 포털에서 회의실 등록 → 사용 중지 → 예약 화면에서 숨김 → 재개 | tests/e2e/rooms.ui.spec.ts |
### KDS 20261012 화면 계약

| TC | REQ | AC | 경계 | GIVEN · WHEN · THEN | 예상 결과 | 자동화 위치 |
|---|---|---|---|---|---|---|
| TC-KDS-UI-001 | 공통 | 공통 | 정상 | 같은 폰트·viewport에서 원본과 React 화면 | templates/mobile-task 전체 화면 픽셀 0 차이 | tests/e2e/kdsParity.ui.spec.ts |
| TC-KDS-UI-002 | 공통 | 공통 | 정상 | 같은 폰트·viewport에서 원본과 React 화면 | templates/mobile-feed 전체 화면 픽셀 0 차이 | tests/e2e/kdsParity.ui.spec.ts |
| TC-KDS-UI-003 | 공통 | 공통 | 정상 | 같은 폰트·viewport에서 원본과 React 화면 | templates/pc-page 전체 화면 픽셀 0 차이 | tests/e2e/kdsParity.ui.spec.ts |
| TC-KDS-UI-004 | 공통 | 공통 | 정상 | 같은 폰트·viewport에서 원본과 React 화면 | templates/pc-admin 전체 화면 픽셀 0 차이 | tests/e2e/kdsParity.ui.spec.ts |
| TC-KDS-UI-005 | 공통 | 공통 | 정상 | 같은 폰트·viewport에서 원본과 React 화면 | examples/mobile 전체 화면 픽셀 0 차이 | tests/e2e/kdsParity.ui.spec.ts |
| TC-KDS-UI-006 | 공통 | 공통 | 정상 | 같은 폰트·viewport에서 원본과 React 화면 | examples/mobile-pay-method 전체 화면 픽셀 0 차이 | tests/e2e/kdsParity.ui.spec.ts |
| TC-KDS-UI-007 | 공통 | 공통 | 정상 | 같은 폰트·viewport에서 원본과 React 화면 | examples/mobile-benefit 전체 화면 픽셀 0 차이 | tests/e2e/kdsParity.ui.spec.ts |
| TC-KDS-UI-008 | 공통 | 공통 | 정상 | 같은 폰트·viewport에서 원본과 React 화면 | examples/pc 전체 화면 픽셀 0 차이 | tests/e2e/kdsParity.ui.spec.ts |
| TC-KDS-UI-010 | 공통 | 공통 | 정상·오류 | 제어 입력·onChange·FormData·윤년·min/max·읽기 전용 | ISO 값 1개·부모 변경/지우기·이벤트 1회·경계 거부 | tests/e2e/kdsParity.ui.spec.ts · tests/unit/date-values.test.ts |
| TC-KDS-UI-009 | 공통 | 공통 | 정상 | 360·768·1279·1280·1920 viewport 전환 | KDS 원본 입력 52/GNB 52·72 및 아이콘·메뉴 경계 | tests/e2e/kdsParity.ui.spec.ts |
| TC-DESIGN-UI-008 | 공통 | 공통 | 정상·오류 | 제어·비제어 달력과 키보드·값·날짜 경계 | min/max·닫기·초점·ISO FormData 유지 | tests/e2e/designSystem.ui.spec.ts · tests/unit/date-values.test.ts |


| TC | REQ | AC | 경계 | GIVEN · WHEN · THEN | 예상 결과 | 자동화 위치 |
|---|---|---|---|---|---|---|
| TC-KDS-API-001 | 공통 | 공통 | 정상·오류 | 로컬/공개 폰트 환경·weight 경계·정적 경로 | 로컬 가드 및 운영 환경 미제공, static404·잘못된 weight400 | tests/e2e/kdsFonts.api.spec.ts · tests/unit/kds-fonts.test.ts |

## 3. 실행 결과

미실행 — G6에서 기록한다. kit 개발 중의 실행은 이 프로젝트의 증적이 아니다.

기록 항목: 시험 대상 Git SHA(전체 40자) · 시작/종료 시각(UTC) · 환경(Node·npm·OS·브라우저) · 실행 명령과 종료코드 · PASS/FAIL/SKIP/FLAKY/미실행 건수 · 증적 링크(`docs/evidence/<runId>.md`) · 한계·미검증.
TC별 결과는 위 현황 블록이 계산하며, 실패한 실행도 runId별로 보존한다. 부분 선택 실행은 선택한 범위만 증명한다.

## 4. 근거 보관과 한계

- `docs/evidence/<runId>.md`: 실행 당시 Git SHA/파일 SHA-256·명령·시각·종료코드·TC 결과.
- `test-results/runs/<runId>/`: manifest·JSON·HTML·스크린샷·실패 trace. runId별로 분리하며 이전 결과를 지우지 않는다.
- 릴리스 근거로 필요한 원본 보고서·화면을 `docs/evidence/<runId>/`에 복사하고 문서의 링크를 갱신한다. 임시 결과 경로만 근거로 남기지 않는다.
- Git이 없는 작업 폴더에서는 커밋 SHA 대신 실제 소스 SHA-256을 기록한다. Git 저장소에서는 시험 SHA와 릴리스 SHA의 관계도 확인한다.
- 이 시나리오는 순차 상태 전이·오래된 version 거부를 확인한다. 실제 동시 경합·감사 실패 롤백·세션 만료·로그인 호출 제한·운영 HTTPS의 Secure 쿠키·5xx 장애 주입은 별도 검증이 필요하다.
- 단위 시험은 `docs/evidence/unit-<시각>.md`에 전체 결과(파일 수·PASS/FAIL/SKIP·실패 시험)만 남긴다. AC와는 §2 자동화 위치의 `tests/unit` 파일로 연결하며 시험별 상태는 추적하지 않는다.
- 공식 보안 정책 준수·KDS 시각적 일치 판정은 이 E2E 결과에 포함하지 않는다.
