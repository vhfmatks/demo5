# 구조 (arch)

> 어떻게 구성했나요? — 설계할 때 선택 이유를 적고, 구현·배포 후 코드와 실제 흐름에 맞춘다.
> **초안 — G3에서 코드와 대조**

## 구성 · 기술 선택 이유

- moai-kit(Next.js 16 · Drizzle/SQLite · zod · KDS UI · Playwright) 단일 앱. 팀 공통 키트라 로그인·권한(RBAC)·감사로그·시험 도구를 그대로 쓴다.
- 게시글은 `gen post 게시글`로 만든다(목록·상세·작성·수정 화면을 갖는 독립 데이터). 기본 `memo` 필드를 본문으로 쓴다(필수, 1–5,000자).
- 댓글·조회 기록은 게시글에 딸린 하위 데이터라 `schema.ts`에 직접 테이블을 만든다(kit 결정표 "부모에 딸린 하위 데이터").

## 흐름 · 소스

| REQ·FLOW | 입력 | 처리 | 저장 | 응답 | 소스 위치 |
|---|---|---|---|---|---|
| REQ-02 · FLOW-01 | `POST /api/v1/posts` 제목·본문 | zod 검증 → 작성자 = 세션 사용자 → tx 안에서 저장·감사 | posts | 201 + 게시글 | `src/features/posts/service.ts` (계획) |
| REQ-04, REQ-10 · FLOW-04 | `GET /api/v1/posts/:id`, 상세 화면 | 조회 → (게시글, 사용자) 조회 기록이 없으면 추가 | post_views | 게시글 + 조회수 | `src/features/posts/service.ts` (계획) |

## 데이터 · API · 권한 경계

데이터: `posts`(id, title, memo=본문, ownerId → users, pinned, createdAt, updatedAt, version) · `comments`(id, postId → posts cascade, ownerId → users, body, createdAt) · `post_views`(postId → posts cascade, userId → users, 고유(postId, userId)). 조회수 = post_views 수.

| 데이터·API·화면 | 권한 경계 | 실제 / mock | 관련 REQ | 소스 위치 |
|---|---|---|---|---|
| `GET /api/v1/posts?q=&page=` 목록·검색 | 로그인 | 실제 | REQ-03, REQ-08 | `src/app/api/v1/posts/route.ts` (계획) |
| `POST /api/v1/posts` 작성 | 로그인 | 실제 | REQ-02 | `src/app/api/v1/posts/route.ts` (계획) |
| `GET /api/v1/posts/:id` 상세·조회 기록 | 로그인 | 실제 | REQ-04, REQ-10 | `src/app/api/v1/posts/[id]/route.ts` (계획) |
| `PATCH /api/v1/posts/:id` 수정 | 작성자 | 실제 | REQ-05 | `src/app/api/v1/posts/[id]/route.ts` (계획) |
| `DELETE /api/v1/posts/:id` 삭제 | 작성자 또는 `post.manage.any` | 실제 | REQ-06 | `src/app/api/v1/posts/[id]/route.ts` (계획) |
| `POST /api/v1/posts/:id/pin` 고정·해제 `{ pinned }` | `post.pin` (관리자) | 실제 | REQ-09 | `src/app/api/v1/posts/[id]/pin/route.ts` (계획) |
| `GET`·`POST /api/v1/posts/:id/comments` 댓글 목록·작성 | 로그인 | 실제 | REQ-07 | `src/app/api/v1/posts/[id]/comments/route.ts` (계획) |
| `DELETE /api/v1/posts/:id/comments/:commentId` 댓글 삭제 | 작성자 또는 `comment.delete.any` | 실제 | REQ-07 | `src/app/api/v1/posts/[id]/comments/[commentId]/route.ts` (계획) |
| 화면 `/posts` 목록·검색·고정 | 로그인 | 실제 | REQ-03, REQ-08, REQ-09 | `src/app/(app)/posts/page.tsx` (계획) |
| 화면 `/posts/new` 작성 | 로그인 | 실제 | REQ-02 | `src/app/(app)/posts/new/page.tsx` (계획) |
| 화면 `/posts/[id]` 상세·댓글 | 로그인 | 실제 | REQ-04, REQ-07, REQ-10 | `src/app/(app)/posts/[id]/page.tsx` (계획) |
| 화면 `/posts/[id]/edit` 수정 | 작성자 | 실제 | REQ-05 | `src/app/(app)/posts/[id]/edit/page.tsx` (계획) |

비로그인 요청은 모든 API에서 401, 화면은 로그인으로 이동한다(REQ-01).

## 의존성 · 배포 · 복구

| 의존성·배포 단계 | 실행·재시작·복구 방법 | 선택 이유 | 제약 |
|---|---|---|---|
| kit init(#1) | 미정 — init 후 기록 | 팀 공통 키트 | 미정 |

## 제약

미정
