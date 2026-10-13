# 사용 경험 · 효과 (experience)

> 사용자는 어떻게 경험하나요? — 구현 전 사용 순서를 정하고, 구현 후 화면·출력·저장 결과로 확인한다. 아래는 G2 계획이며 실제 결과가 아니다.

## 사용자 흐름

| FLOW | REQ·AC | 사용자 | 호출·입력·단계 | 응답·화면・저장 결과 | TC | 근거·상태 |
|---|---|---|---|---|---|---|
| FLOW-01 | REQ-02 · AC-02-1, AC-02-2 | 로그인 사용자 | `/posts` → [글쓰기] `/posts/new` → 제목·본문 입력 → 저장 | 상세 `/posts/<id>`로 이동, 목록 맨 앞에 표시. 잘못된 입력은 오류 표시·저장 안 됨 | TC-POST-API-001, TC-POST-API-008, TC-POST-UI-001, TC-POST-API-002 | 미실행 |
| FLOW-02 | REQ-03, REQ-08 · AC-03-1, AC-03-2, AC-08-1, AC-08-2 | 로그인 사용자 | `/posts` 목록 → 페이지 이동 → 검색어 입력 | 고정 글 맨 위 + 최신순 20개, 검색 결과·빈 결과 안내 | TC-POST-API-004, TC-POST-API-006, TC-POST-API-009, TC-POST-UI-003, TC-POST-API-010, TC-POST-API-011, TC-POST-UI-004, TC-POST-API-012 | 미실행 |
| FLOW-03 | REQ-09 · AC-09-1, AC-09-2 | 관리자 | `/posts` 목록 → [고정]/[해제] | 고정 글이 고정 표시로 맨 위, 해제 시 원위치. 일반 사용자에게 버튼 없음 | TC-POST-API-013, TC-POST-UI-005, TC-POST-API-014, TC-POST-UI-006 | 미실행 |
| FLOW-04 | REQ-04, REQ-10 · AC-04-1, AC-04-2, AC-10-1, AC-10-2 | 로그인 사용자 | 목록에서 글 선택 → `/posts/<id>` | 글·댓글·조회수 표시, 첫 열람 시 조회수 +1. 없는 글은 404 | TC-POST-API-015, TC-POST-UI-007, TC-POST-API-016, TC-POST-UI-008, TC-POST-API-017, TC-POST-API-018 | 미실행 |
| FLOW-05 | REQ-07 · AC-07-1, AC-07-2, AC-07-3 | 로그인 사용자·관리자 | 상세 → 댓글 입력 → [등록] / 본인 댓글 [삭제] | 댓글이 목록 끝에 표시, 삭제 후 사라짐. 타인 댓글엔 삭제 버튼 없음 | TC-COMMENT-API-001, TC-COMMENT-UI-001, TC-COMMENT-API-002, TC-COMMENT-API-003, TC-COMMENT-UI-002 | 미실행 |
| FLOW-06 | REQ-05, REQ-06 · AC-05-1, AC-05-2, AC-05-3, AC-06-1, AC-06-2, AC-06-3 | 작성자·관리자 | 상세 → [수정] `/posts/<id>/edit` → 저장 / [삭제] → 확인 | 수정 내용 반영, 삭제 시 목록으로 이동·댓글 함께 삭제. 권한 없으면 버튼 없음 | TC-POST-API-019, TC-POST-UI-009, TC-POST-API-020, TC-POST-UI-010, TC-POST-API-021, TC-POST-API-022, TC-POST-UI-011, TC-POST-API-023, TC-POST-API-024, TC-POST-UI-012 | 미실행 |
| FLOW-07 | REQ-01 · AC-01-1 | 비로그인 사용자 | `/posts` 등 게시판 주소 접속 | 로그인 화면으로 이동 | TC-POST-UI-002 | 미실행 |

## 효과

| FLOW | 비교 대상 | 확인·측정 방법 | 실제 결과 | 예상 / 관찰 / 미측정 | 근거·한계 |
|---|---|---|---|---|---|
| FLOW-01, FLOW-05 | 미정(현재 공유 방식 미확인) | 글 작성·댓글 등록까지 단계 수 | 미측정 | 예상 | 비교 대상 미정 |
| FLOW-02, FLOW-03 | 미정(현재 공유 방식 미확인) | 고정 공지·검색으로 원하는 글을 여는 단계 수 | 미측정 | 예상 | 비교 대상 미정 |

## 한계

제외 범위: 첨부파일, 좋아요, 카테고리, 대댓글, 댓글 수정, 비로그인 열람, 리치 텍스트 본문, 숨김 처리(soft delete)·복구.
