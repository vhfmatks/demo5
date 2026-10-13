# 시험 계획 · 결과 (e2e-test)

> 어떻게 시험했고, 무엇이 확인됐나요? — 구현 전 요구별 시나리오를 적고, 시험 후 명령·소스 SHA·실제 결과·근거 경로를 채운다. AC 판정은 [prd](prd.md)가 소유한다.

## 현황

<!-- e2e-dashboard:start -->
미실행
<!-- e2e-dashboard:end -->

## 1. 재현 환경 · 명령

미정 — kit init(#1) 후 확정한다. 계획: 단위 `npm run test`, 격리 E2E `node .claude/skills/moai-kit/scripts/kit.mjs e2e [spec]`(새 DB·빈 포트·합성 데이터), 제출 전 `npm run verify`.

## 2. 시나리오

TC-POST-API-001–004·006, TC-POST-UI-001은 `gen`이 만드는 시험이며 이 계획에 맞게 기대값을 고친다. 새 TC는 생성 범위와 겹치지 않게 008부터 쓴다.

| TC | REQ | AC | 경계 | GIVEN · WHEN · THEN | 예상 결과 | 자동화 위치 |
|---|---|---|---|---|---|---|
| TC-POST-UI-002 비로그인 화면 접근은 로그인으로 이동 (SEC-02) | REQ-01 | AC-01-1 | 권한 | GIVEN 비로그인 WHEN 목록·작성·상세 화면을 연다 THEN 로그인 화면으로 이동 | 글 제목·본문이 화면에 없음 | tests/e2e/posts.ui.spec.ts |
| TC-POST-API-003 비로그인 거부 (SEC-02) | REQ-01 | AC-01-2 | 권한 | GIVEN 비로그인 WHEN 게시글 목록·상세·작성·수정·삭제 API를 호출 THEN 거부 AND 저장값 불변 | 401, 응답에 자료 없음, 글 수·내용 불변 | tests/e2e/posts.api.spec.ts |
| TC-POST-API-001 생성·목록·조회·수정·삭제 | REQ-02 | AC-02-1 | 정상·재조회 | GIVEN 로그인 사용자 WHEN 제목·본문으로 작성 후 상세·목록 조회 THEN 같은 내용 | 201, 재조회 시 같은 제목·본문·작성자·작성 시각 | tests/e2e/posts.api.spec.ts |
| TC-POST-API-008 작성자·고정·조회수는 서버가 정함 | REQ-02 | AC-02-1 | 정상 | GIVEN 로그인 사용자 WHEN 작성 요청에 ownerId·pinned·viewCount를 넣는다 THEN 무시 | 작성자 = 요청자, pinned false, 조회수 0 | tests/e2e/posts.api.spec.ts |
| TC-POST-UI-001 작성·상세·새로고침 | REQ-02 | AC-02-1 | 정상·재조회 | GIVEN 로그인 WHEN 작성 화면에서 저장 THEN 상세로 이동 AND 새로고침해도 같음 | 상세·목록 맨 앞(고정 제외)에 표시 | tests/e2e/posts.ui.spec.ts |
| TC-POST-API-002 입력 검증·저장값 불변 (SEC-04) | REQ-02 | AC-02-2 | 오류 | GIVEN 로그인 WHEN 빈 제목·101자 제목·빈 본문·5,001자 본문으로 작성 THEN 거부 | 400 fieldErrors, 글 수 불변 | tests/e2e/posts.api.spec.ts · tests/unit/posts.service.test.ts |
| TC-POST-API-004 타인 글 조회 허용·수정·삭제 거부 (SEC-03) | REQ-03 | AC-03-1 | 정상·권한 | GIVEN 사용자 A의 글 WHEN 사용자 B가 목록·상세 조회, 수정·삭제 THEN 조회는 허용, 쓰기는 거부 | 조회 200, 쓰기 403, 값 불변 | tests/e2e/posts.api.spec.ts · tests/unit/posts.policy.test.ts |
| TC-POST-API-006 부서와 무관하게 전체 글 조회 (SEC-03) | REQ-03 | AC-03-1 | 정상 | GIVEN 다른 부서 사용자의 글 WHEN 부서장·일반 사용자가 목록 조회 THEN 모두 보임 | 전체 글 포함 | tests/e2e/posts.api.spec.ts |
| TC-POST-API-009 최신순 20개 페이지 | REQ-03 | AC-03-1 | 정상·재조회 | GIVEN 글 21개 WHEN 1·2페이지 조회 THEN 최신순 20개·1개 | 행에 제목·작성자·작성 시각·조회수 | tests/e2e/posts-list.api.spec.ts |
| TC-POST-UI-003 목록 화면·페이지 이동·빈 상태 | REQ-03 | AC-03-1 | 정상 | GIVEN 글 없음/21개 WHEN 목록을 연다·다음 페이지 THEN 빈 상태 안내/페이지 이동 | 행 표시·빈 상태 문구 | tests/e2e/posts-list.ui.spec.ts |
| TC-POST-API-010 고정 글은 페이지마다 맨 위 | REQ-03 | AC-03-2 | 정상·재조회 | GIVEN 고정 글 2개·일반 글 21개 WHEN 1·2페이지 조회 THEN 고정 글이 각 페이지 맨 위 | 고정 글 최신순, 일반 글 페이지 수에 미포함 | tests/e2e/posts-list.api.spec.ts |
| TC-POST-API-011 제목·본문 부분 일치 검색 | REQ-08 | AC-08-1 | 정상·오류 | GIVEN 제목·본문에 키워드가 있는 글과 없는 글 WHEN q로 검색 THEN 일치 글만 | 최신순 일치 글, 없는 키워드는 빈 목록 | tests/e2e/posts-list.api.spec.ts |
| TC-POST-UI-004 검색·빈 결과 안내 | REQ-08 | AC-08-1 | 정상 | GIVEN 글 목록 WHEN 검색어 입력 THEN 결과·빈 결과 안내 | 일치 글만 표시 | tests/e2e/posts-list.ui.spec.ts |
| TC-POST-API-012 검색 결과의 고정 글 | REQ-08 | AC-08-2 | 정상 | GIVEN 일치·불일치 고정 글 WHEN 검색 THEN 일치 고정 글만 맨 위 | 불일치 고정 글 없음 | tests/e2e/posts-list.api.spec.ts |
| TC-POST-API-013 관리자 고정·해제 | REQ-09 | AC-09-1 | 정상·재조회 | GIVEN 관리자 WHEN 고정 후 해제 THEN 목록 맨 위 → 일반 위치 | 재조회 시 고정 상태 유지 | tests/e2e/posts-list.api.spec.ts |
| TC-POST-UI-005 관리자 고정 버튼 | REQ-09 | AC-09-1 | 정상·재조회 | GIVEN 관리자 로그인 WHEN 고정 버튼 THEN 고정 표시로 맨 위 AND 새로고침 유지 | 고정 표시 | tests/e2e/posts-list.ui.spec.ts |
| TC-POST-API-014 비관리자 고정 거부 (SEC-03) | REQ-09 | AC-09-2 | 권한 | GIVEN 일반 사용자·비로그인 WHEN 고정·해제 API 호출 THEN 거부 | 403/401, pinned 불변 | tests/e2e/posts-list.api.spec.ts |
| TC-POST-UI-006 비관리자에게 고정 버튼 없음 | REQ-09 | AC-09-2 | 권한 | GIVEN 일반 사용자 WHEN 목록을 연다 THEN 고정·해제 버튼 없음 | 버튼 미표시 | tests/e2e/posts-list.ui.spec.ts |
| TC-COMMENT-API-001 댓글 작성·오래된 순 재조회 | REQ-07 | AC-07-1 | 정상·재조회 | GIVEN 글 WHEN 댓글 2개 작성 후 조회 THEN 오래된 순 | 작성자·작성 시각 포함, 재조회 유지 | tests/e2e/comments.api.spec.ts · tests/unit/comments.service.test.ts |
| TC-COMMENT-UI-001 상세에서 댓글 작성 | REQ-07 | AC-07-1 | 정상·재조회 | GIVEN 상세 화면 WHEN 댓글 입력·등록 THEN 목록 끝에 표시 AND 새로고침 유지 | 댓글 표시 | tests/e2e/comments.ui.spec.ts |
| TC-COMMENT-API-002 댓글 입력 검증 (SEC-04) | REQ-07 | AC-07-2 | 오류 | GIVEN 글 WHEN 빈·501자 댓글, 없는 글에 작성 THEN 거부 | 400/404, 댓글 수 불변 | tests/e2e/comments.api.spec.ts |
| TC-COMMENT-API-003 댓글 삭제 권한 (SEC-03) | REQ-07 | AC-07-3 | 정상·권한·재조회 | GIVEN 사용자 A의 댓글 WHEN A·관리자·B가 삭제 THEN A·관리자 성공, B 거부 | B 403·댓글 남음, 성공 후 재조회에 없음 | tests/e2e/comments.api.spec.ts |
| TC-COMMENT-UI-002 댓글 삭제 버튼 | REQ-07 | AC-07-3 | 권한·재조회 | GIVEN 본인·타인 댓글 WHEN 상세를 연다·본인 댓글 삭제 THEN 타인 댓글엔 버튼 없음 | 삭제 후 새로고침해도 없음 | tests/e2e/comments.ui.spec.ts |
| TC-POST-API-015 상세 응답 | REQ-04 | AC-04-1 | 정상 | GIVEN 글·댓글 WHEN 상세 조회 THEN 필드 포함 | 제목·본문·작성자·작성/수정 시각·조회수 | tests/e2e/posts-detail.api.spec.ts |
| TC-POST-UI-007 상세 화면 | REQ-04 | AC-04-1 | 정상 | GIVEN 댓글 있는 글 WHEN 상세를 연다 THEN 글과 댓글 목록 표시 | 글·댓글 표시 | tests/e2e/posts-detail.ui.spec.ts |
| TC-POST-API-016 없는·삭제된 글 404 | REQ-04 | AC-04-2 | 오류 | GIVEN 없는 id·삭제된 글 WHEN 상세 조회 THEN 404 | 자료 없음 | tests/e2e/posts-detail.api.spec.ts |
| TC-POST-UI-008 없는 글 화면 404 | REQ-04 | AC-04-2 | 오류 | GIVEN 없는 id WHEN 상세 화면을 연다 THEN 찾을 수 없음 | 404 화면 | tests/e2e/posts-detail.ui.spec.ts |
| TC-POST-API-017 사용자당 1회 조회수 | REQ-10 | AC-10-1 | 정상·재조회 | GIVEN 작성자 WHEN 상세를 두 번 조회 THEN 조회수 1 | 재열람에도 1 | tests/e2e/posts-detail.api.spec.ts · tests/unit/posts.service.test.ts |
| TC-POST-API-018 다른 사용자 조회수 증가 | REQ-10 | AC-10-2 | 정상·재조회 | GIVEN 조회수 1인 글 WHEN 다른 사용자가 조회 THEN 2 | 목록·상세 같은 값 | tests/e2e/posts-detail.api.spec.ts |
| TC-POST-API-019 작성자 수정 | REQ-05 | AC-05-1 | 정상·재조회 | GIVEN 작성자 WHEN 제목·본문 수정 THEN 재조회 시 변경 | 수정 시각 갱신 | tests/e2e/posts-edit.api.spec.ts |
| TC-POST-UI-009 수정 화면 | REQ-05 | AC-05-1 | 정상·재조회 | GIVEN 작성자 WHEN 수정 화면에서 저장 THEN 상세에 반영 AND 새로고침 유지 | 변경 내용 표시 | tests/e2e/posts-edit.ui.spec.ts |
| TC-POST-API-020 타인·관리자 수정 거부 (SEC-03) | REQ-05 | AC-05-2 | 권한 | GIVEN 사용자 A의 글 WHEN B·관리자가 수정 THEN 거부 | 403, 값 불변 | tests/e2e/posts-edit.api.spec.ts |
| TC-POST-UI-010 타인에게 수정 버튼 없음 | REQ-05 | AC-05-2 | 권한 | GIVEN 타인·관리자 WHEN 상세를 연다 THEN 수정 버튼 없음 | 버튼 미표시 | tests/e2e/posts-edit.ui.spec.ts |
| TC-POST-API-021 수정 입력 검증 (SEC-04) | REQ-05 | AC-05-3 | 오류 | GIVEN 작성자 WHEN 빈 제목·5,001자 본문으로 수정 THEN 거부 | 400, 값 불변 | tests/e2e/posts-edit.api.spec.ts |
| TC-POST-API-022 작성자 삭제·댓글 함께 삭제 | REQ-06 | AC-06-1 | 정상·재조회 | GIVEN 댓글 있는 본인 글 WHEN 삭제 THEN 목록에 없음 AND 상세 404 | 댓글·조회 기록도 없음 | tests/e2e/posts-edit.api.spec.ts |
| TC-POST-UI-011 삭제 흐름 | REQ-06 | AC-06-1 | 정상·재조회 | GIVEN 작성자 WHEN 상세에서 삭제 THEN 목록으로 이동 AND 글 없음 | 새로고침해도 없음 | tests/e2e/posts-edit.ui.spec.ts |
| TC-POST-API-023 관리자 삭제·감사로그 (SEC-10) | REQ-06 | AC-06-2 | 정상·재조회 | GIVEN 타인 글 WHEN 관리자가 삭제 THEN 삭제 AND 감사로그 기록 | 감사로그에 행위자·대상 | tests/e2e/posts-edit.api.spec.ts |
| TC-POST-API-024 삭제 권한 거부 (SEC-03) | REQ-06 | AC-06-3 | 권한 | GIVEN 사용자 A의 글·댓글 WHEN B가 삭제 THEN 거부 | 403, 글·댓글 남음 | tests/e2e/posts-edit.api.spec.ts |
| TC-POST-UI-012 타인에게 삭제 버튼 없음 | REQ-06 | AC-06-3 | 권한 | GIVEN 타인 WHEN 상세를 연다 THEN 삭제 버튼 없음 | 버튼 미표시 | tests/e2e/posts-edit.ui.spec.ts |

## 3. 실제 실행 결과

미실행 — G6에서 기록한다.

| 실행 ID | 명령·범위 | 실행 환경 | 소스 SHA | 실행 시각 | PASS/FAIL/SKIP | 미실행·미검증 | 근거 경로 |
|---|---|---|---|---|---|---|---|

## 4. 근거 보관과 한계

로그·화면은 `docs/evidence/`에 두고 링크한다. 실패·SKIP·미실행은 그대로 적고, 이 프로젝트에서 직접 실행한 결과만 기록한다.
