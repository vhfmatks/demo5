# 보안 준수 결과 (security-compliance)

> 보안 기준을 어떻게 지켰나요? — 정책 수령·개정, 보안 코드 변경·리뷰·시험 후 적용 여부와 실제 결과를 갱신한다.

## 정책 기준 · 수령 상태

`docs/security-policy.md`: 미수령 — 공식 준수 여부는 미확인이다. 아래 번호는 kit 시험이 쓰는 안내 번호이며 공식 원문 수령 후 대조해 고친다.

## SEC별 적용 · 검증

| SEC | 적용 여부·이유 | 코드 위치 | TC·검증 방법 | 실제 결과·근거 | 위험·예외 | 검토 상태 |
|---|---|---|---|---|---|---|
| SEC-02 사용자 인증 (공식 매핑 전) | 적용 · 로그인 사용자 전용 게시판 | kit `api()` 기본 로그인 필수, 화면 로그인 이동 (계획) | TC-POST-API-003, TC-POST-UI-002 | 미실행 | — | 미실행 |
| SEC-03 접근 권한 (공식 매핑 전) | 적용 · 작성자 수정, 작성자·관리자 삭제, 관리자 고정 | `src/features/posts/policy.ts`, `src/features/comments/policy.ts`, `src/lib/permissions.ts` (계획) | TC-POST-API-004, TC-POST-API-006, TC-POST-API-014, TC-POST-API-020, TC-POST-API-024, TC-COMMENT-API-003 | 미실행 | — | 미실행 |
| SEC-04 입력 검증 (공식 매핑 전) | 적용 · 제목·본문·댓글 길이 | `src/features/posts/schema.ts`, `src/features/comments/schema.ts` (계획) | TC-POST-API-002, TC-POST-API-021, TC-COMMENT-API-002 | 미실행 | — | 미실행 |
| SEC-10 보안 감사 기록 (공식 매핑 전) | 적용 · 글·댓글 쓰기·삭제·고정 기록 | `src/features/posts/service.ts`, `src/features/comments/service.ts` (계획) | TC-POST-API-023 | 미실행 | — | 미실행 |

## 미적용 · 해당 없음 · 예외 · 미검증

공식 정책 미수령으로 위 행 외 SEC 항목의 적용 여부는 미정이다. 정책 수령 후 SEC마다 한 행을 채운다.
