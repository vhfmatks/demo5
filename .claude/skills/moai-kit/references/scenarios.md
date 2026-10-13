# 시나리오 → 따라할 코드 · 읽을 문서

해당하는 행 하나만 고르고, 그 행의 코드와 문서 절만 읽는다.

- 경로는 `src/` 기준이다. 문서는 프로젝트의 `docs/conventions/` 기준이다.
- 예제 코드(`requests`·`bookings`·`publicNotes`·`rooms`, `approvals`, 예제판 `server/db/schema.ts`·`(app)/page.tsx`)가 프로젝트에 없을 수 있다(`--example` 없이 init한 경우). 그때는 **`.claude/skills/moai-kit/references/examples/` 아래 같은 경로**에서 읽는다. 이 폴더는 읽기 전용 참고본이다.

| 상황 | 시작 | 따라할 코드 | 문서(절) |
|---|---|---|---|
| 로그인 사용자 CRUD(본인 소유) | `gen` | 생성 결과 그대로. 원형 `features/requests/service.ts` | communication.md §4 |
| 익명 공유 CRUD·version 충돌 | `gen --auth=public` | `features/publicNotes/service.ts` | communication.md §5 |
| 상태 전이·승인·결재함 | `gen` + `status:enum(…)!` | `requests/policy.ts` `TRANSITIONS`·`allowedActions` → `requests/service.ts` `transitionRequest` → `app/api/v1/requests/[id]/transition/route.ts` → `RequestActions.tsx` · `(app)/approvals/page.tsx` | errors.md §2 (INVALID_STATE=409) |
| 처리 이력·감사로그 | 기존 | `requests/service.ts` `getRequestHistory`, `RequestHistory.tsx`, `server/audit.ts` | data.md |
| 시간 범위·겹침 충돌·동시성 | `gen` 후 수정 | `bookings/schema.ts` `slotRules`·`kstDate`, `bookings/service.ts`(겹침 검사와 쓰기를 같은 tx에서) | data.md, errors.md §2 |
| 다른 엔티티 참조(FK·선택) | `gen` + `xId:ref(xs)` | 생성 결과 그대로(FK·존재 확인·선택지·표시값·시험). 손으로 만든 테이블 참조는 예제판 bookings.`roomId`·`BookingForm.tsx` | [fields.md](fields.md) ref, data.md |
| 일정·타임라인 화면 | 예제 | `bookings/components/BookingTimeline.tsx`, `(app)/bookings/page.tsx` | ui.md |
| 반복·일괄 생성(미리보기 → 전체 확정, 하나라도 충돌하면 전체 롤백) | 예제 | 예제판 `bookings/schema.ts` `RecurringBookingInput`·`expandRecurringBookings`, `bookings/service.ts` `previewRecurringBookings`(쓰기 없음)·`createRecurringBookings`(한 tx 안에서 회차별 검사·쓰기·감사로그) → `api/v1/bookings/recurring{,/preview}` → `BookingForm recurring` · TC-BOOKING_SERIES-API-001~004·UI-001~002 | data.md, errors.md §2 |
| 월·주 달력(예약·일정·상담 시간) | 예제 | `components/ui` `Calendar` + `lib/calendar`(`CalendarQuery`·`visibleDays`·`gridRange`), 예제판 `bookings/service.ts` `bookingCalendar` → `(app)/bookings/calendar/page.tsx` · TC-BOOKING-UI-002. gen `datetime` 열은 ui.md 코드 그대로 | ui.md "달력" |
| AI 기능(요약·분류·추출·초안) | 기존 | 관리자 포털 > AI 에서 공급자 시험·등록 → 모델 시험·등록. 기능은 service 에서 `aiJson`(zod 검증)·`aiComplete` (`@/features/ai/service`), 화면은 `aiAvailable()` 로 버튼 표시. 예제판 `requests/service.ts` `suggestRequestCategory` → `api/v1/requests/suggest` → `RequestForm` [AI 분류 추천] · TC-REQ-API-013·UI-008. 시험은 `tests/ai-mock.ts` `startMockAi`·`registerMockModel` | ai.md |
| 안전한 AI 초안 → 사람 검토·저장 | 예제 | 예제판 requests의 수행계획: DB 입력·version 기준 생성(업무 저장 없음) → 별도 미리보기 → 명시 반영·수정 → 권한/상태/version 조건부 저장 + 같은 tx 감사. AI 미설정·실패는 수동 작성 유지. 기존 앱 요청과 예제판의 상태·필드 차이를 먼저 확인한다 | ai.md "안전한 수행계획 예제" |
| 관리자 화면·마스터 관리 | 수동 | `app/admin/rooms/**`, `features/rooms/**`, `app/admin/nav.ts`, `api/v1/admin/rooms/**` | admin.md "새 관리 화면 추가" |
| 운영 설정 값 | 수동 | `features/settings/**` | admin.md "운영 설정 추가" |
| 부서 단위 조회·부서장·부서별 집계 | `gen` | 생성 결과 그대로(policy `listScope` dept·`canView` 같은 부서, service `ownerScope`, `TC-<X>-API-006`). 손으로 만든 기능은 예제판 `requests/policy.ts` `sameDept`·`service.ts` `ownerScope` · TC-REQ-API-012. 부서 지정 = 관리자 포털 사용자 화면 | rbac.md "부서 범위" |
| 권한 추가·역할 부여 | 기존 | `lib/permissions.ts` `PERMISSIONS`·`ROLE_DEFINITIONS` (예제판에 request·booking 권한 예시) | rbac.md "변경 방법" |
| 대시보드·통계·차트 | 예제 | `requests/service.ts` `requestStats`(groupBy)·`requestInsights`(분류×상태, KST 월별 `strftime`), 예제판 `(app)/page.tsx` `Stat`·`BarChart`·`LineChart`·`Progress`(구성비는 `DonutChart`) | ui.md "차트" |
| CSV 내보내기 | 예제 | `requests/service.ts` `exportRequestsCsv`(목록 재사용·`toCsv`·`maskName`) → `app/api/v1/requests/export/route.ts`(`download`) → `(app)/requests/page.tsx` 버튼(`download` 속성) · TC-REQ-API-010 | api.md "내보내기" |
| 엑셀·CSV 가져오기(업로드·정제·일괄 등록) | 예제 | `requests/service.ts` `importRequests`(`readTable`→`parseRows`, `fromLabel`, 일괄 insert + 감사 1건) → `app/api/v1/requests/import/route.ts`(`upload`) → `(app)/requests/import/page.tsx`(`components/app/ImportForm`) · TC-REQ-API-011·UI-007 | api.md "가져오기", §3 파일 업로드 |
| 정원(capacity)·좌석 | `gen` 후 수정 | 세기와 쓰기를 같은 쓰기 tx 에서 (data.md 코드). 동시성 시험은 E2E `Promise.all` (예제 TC-BOOKING-API-005) | data.md "정원 검사" |
| 민감 필드·개인정보 마스킹·담당자 열람 | 기존 | `lib/mask.ts` `omitUnless`·`maskName/Phone/Email` 을 service `toDto` 에서, 두 당사자 열람은 policy `canView`·`listScope` | rbac.md "민감 필드" |
| 목록 필터·검색 | `gen` 후 수정 | `requests/components/RequestFilters.tsx`(검색은 `SearchField`), `ListRequestQuery` | ui.md "Server / Client 경계", api.md §3 목록 query |
| 새 오류 원인 | - | `features/<x>/errors.ts` `defineErrors` | errors.md §1 |
| 어떤 시험을 쓸지·어떻게 쓸지 | - | [test-patterns.md](test-patterns.md) 선택표 → 패턴 카드 | testing.md §2·§3 |
| 화면·KDS 컴포넌트 | - | `components/ui/index.ts`(사용 가능한 부품 목록), 모달·시트·탭·날짜/시간·AI 입력 등 특정 화면용은 `/design-system` 예제 | ui.md, `docs/design-system/components.md` |
| lint 오류 | - | 해당 규칙 | lint.md (끄거나 우회 금지) |
