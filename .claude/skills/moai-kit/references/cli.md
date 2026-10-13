# kit.mjs 함수 상세

`K` = `node .claude/skills/moai-kit/scripts/kit.mjs`. 짧은 사용법은 `K help`. 이 파일은 init·survey의 동작 세부가 필요할 때만 읽는다.

## init

`init [dir=.] [--example] [--no-install] [--name=…] [--title=…] [--survey [--port=N] [--no-open] | --spec=<file> [--dry-run]]`

- 공통 scaffold(로그인·RBAC·감사로그·관리자 포털·KDS UI·생성기·시험 인프라)와 `scripts/moai-worktree-clean.ps1`을 깐다. 이어서 `npm ci` → `db:reset`. 프로젝트당 1회.
- 규칙은 `AGENTS.md` 하나에 두고 `CLAUDE.md`는 만들지 않는다. 기존 파일은 보존하고 `AGENTS.md`·`.gitignore`는 빠진 내용만 덧붙인다. 이미 있는 `CLAUDE.md`에는 `@AGENTS.md` 한 줄만 덧붙인다.
- `--example`: 예제 도메인(요청·승인, 회의실 예약, 공개 메모)까지 깐다. 첫 init에서만.
- `--name`: `package.json` name(기본 폴더명). `--title`: 화면 `<title>`(기본 name).
- `--survey`: 127.0.0.1 브라우저 설문에서 도메인(메뉴·필드·접근)·레이아웃을 조립하고 미리 본 뒤 제출하면 그 spec으로 init → 도메인별 `gen`. `project.spec.json`·`docs/project-structure.md`가 남는다.
- `--spec=<file> [--dry-run]`: 저장한 spec으로 같은 생성 / 계획만. 실패 후 다시 실행하면 이미 있는 도메인은 건너뛴다.
- 이미 init된 곳에서 `--survey`·`--spec`을 주면 `survey`로 넘어간다.

## survey

`survey [--spec=<file>] [--dry-run] [--port=N] [--no-open]` — 이미 만든 프로젝트에 설문을 적용한다.

- 현재 레이아웃·도메인(`project.spec.json`, 없으면 nav)으로 설문을 채운다. 기존 도메인은 잠겨 프로토타입·참조 대상으로만 보인다.
- 제출하면 바뀐 레이아웃(사이드바·테마, 양방향)과 새 도메인 `gen`만 반영하고 spec·`docs/project-structure.md`를 갱신한다. 설치·DB 초기화는 하지 않는다.
- `--spec`은 전체 spec과 새 도메인만 있는 spec을 모두 받는다(이름·제목·기존 도메인은 현재 것 유지).
- 레이아웃을 손으로 많이 고쳐 변경 지점이 없으면 아무것도 바꾸지 않고 멈춘다.
