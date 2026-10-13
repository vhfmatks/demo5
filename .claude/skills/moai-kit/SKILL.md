---
name: moai-kit
description: Next.js 16 풀스택 키트(Drizzle/SQLite·zod·KDS 20261012 UI·Playwright)로 프로젝트를 만들고 기능을 구현한다. 제공 KDS의 PC·모바일 템플릿 외관을 유지하며 init·gen·survey·검증 함수로 생성한다. 새 프로젝트, HTML 시안 비교, 도메인·CRUD·화면·API 추가 때 사용.
argument-hint: "[help|init|survey|gen|migrate|check|e2e|evidence] [매개변수]"
---

# moai-kit

`K` = `node .claude/skills/moai-kit/scripts/kit.mjs` (프로젝트 루트에서 실행). 성공하면 한 줄, 실패하면 마지막 60줄만 출력한다. 실패 시 그 출력만 보고 고친다. 코드 규칙은 프로젝트 `AGENTS.md`·`CLAUDE.md`와 `docs/conventions/`에 있으며 여기에 다시 적지 않는다.

UI 작업은 [KDS 화면 기준](references/kds.md)을 읽는다. KDS 20261012의 원본 크기·아이콘·토큰과 모바일 업무/피드·PC 기본/관리 패턴을 사용한다. 작은 PC 컨트롤·임의 shadcn 기본 색으로 바꾸지 않는다. 실행 가능한 React 기준 화면 8종은 `/design-system/kds/<templates|examples>/<이름>`이다.

## `/moai-kit` 직접 호출

인자: `$ARGUMENTS`

- 비었거나 `help` → `K help` 출력만 코드 블록으로 보여 주고 멈춘다.
- `survey`에 `--spec=`·`--advanced`가 없거나 `init`에 `--spec=`·`--example`·`--survey`가 없으면 CLI를 실행하지 않고 [채팅·HTML 3안 선택](references/chat-prototypes.md)을 따른다. 뒤의 자연어는 요구사항이고, 명시한 dir·name·title·dry-run 옵션은 선택 후 적용에도 유지한다.
- `survey --advanced` → `--advanced`만 빼고 `K survey`에 전달한다(상세 브라우저 설문). `--spec=`과 같이 주면 둘 중 하나만 고르라고 안내한다.
- 그 밖에 첫 단어가 함수명이면 `K $ARGUMENTS`를 실행하고 짧게 보고한다. `init --survey`와 고급 survey는 백그라운드로 실행하고 출력된 `설문:` URL을 안내한다.
- 자연어 요청: 프로젝트 설계·초기화·시안 비교 → [채팅·HTML 3안 선택](references/chat-prototypes.md), 도메인·이슈 구현 → 아래 구현 절차.

## 함수

| 함수 | 매개변수 | 하는 일 |
|---|---|---|
| `init` | `[dir=.] [--example] [--name=…] [--title=…] [--survey \| --spec=<file> [--dry-run]]` | 공통 scaffold + `npm ci` → `db:reset`. 프로젝트당 1회. 상세는 [cli.md](references/cli.md) |
| `survey` | `[--spec=<file>] [--dry-run]` | 이미 만든 프로젝트에 레이아웃·새 도메인 적용. 상세는 [cli.md](references/cli.md) |
| `gen` | `<entity> <라벨> [--fields=…] [--auth=required\|public] [--plural=…] [--skip-tests] [--no-migrate]` | 도메인 1개를 통째로 만든다(테이블·zod·서비스·정책·오류·API·화면 4종·API/UI 시험·nav·권한) + 마이그레이션. 필드 문법은 [fields.md](references/fields.md) |
| `migrate` | `<name>` | `db/schema.ts`를 손으로 고친 뒤 `db:generate --name` → `db:migrate` |
| `check` | `[테스트파일…] [--full]` | 파일 → 그 파일만 vitest / 없음 → lint → typecheck → test / `--full` → verify(+build·audit) |
| `e2e` | `[spec…]` | 격리 E2E(새 DB·빈 포트·근거 기록). `PORT`가 있으면 그 포트 |
| `evidence` | | 마지막 E2E 결과를 `docs/evidence/latest.md`에 기록 |
| `kds-fonts` | `<제공 KDS fonts/web 경로>` | 참가자 전용 KT Flow를 로컬 설치하고 Git에서 제외. 공개 배포본에는 포함하지 않는다 |

## 구현 절차 (이슈 1건)

1. AC를 보고 [scenarios.md](references/scenarios.md)에서 **해당 행만** 고르고 그 행의 코드·문서 절만 읽는다. 다른 feature 폴더는 열지 않는다.
2. 새 엔티티면 아래 표로 정한다. gen이면 엔티티당 `K gen … --fields='…'` 1회로 필드까지 만든다.

   | 엔티티 성격 | 결정 |
   |---|---|
   | 목록·상세·작성·수정 화면을 갖는 독립 데이터(신청·경비·공지·예약·슬롯) | `gen` (공개면 `--auth=public`, 참조는 `ref(…)`, 상태는 `status:enum(…)!`) |
   | 위 + 겹침·정원·필터 같은 규칙 | `gen` 후 수정 (scenarios.md 해당 행) |
   | 부모에 딸린 하위 데이터(댓글·공감·첨부·이력): 제목·자기 화면 없음 | 수동: `schema.ts` 테이블 + 부모 feature 또는 작은 feature에 service·API (`gen`은 `title`·화면 4종을 강제로 만든다) |
   | 관리자 포털 마스터(분류·회의실 등)·운영 설정 | 수동 (scenarios.md "관리자 화면"·"운영 설정") |
   | 기존 엔티티에 기능 추가(이력·통계·내보내기·AI·마스킹) | gen 아님. scenarios.md 해당 행 |

   애매하면 gen: 생성 후 필요 없는 화면·필드를 지우는 편이 손으로 쓰는 것보다 싸고 규칙을 지킨다.
3. 생성된 파일만 부분 수정한다. 순서: `policy.ts` → `errors.ts` → `service.ts`(규칙·tx·audit) → 컴포넌트·페이지.
4. AC마다 시험을 둔다. [test-patterns.md](references/test-patterns.md) §1 선택표에서 패턴(P01~P23)을 골라 도메인에 맞게 옮긴다. 정책을 바꿨으면 생성된 TC 기대값도 바꾼다(예: P04 → P05). 서비스 규칙은 `tests/unit/<x>.service.test.ts`, 사용자 흐름은 `tests/e2e/<x>.{api,ui}.spec.ts`, 이름은 `TC-<DOMAIN>-API|UI-NNN <설명>`. 실행은 `K e2e`로만 한다.
5. 검증은 좁게 → 넓게: `K check <파일>` → `K check` → `K e2e <spec>` → 커밋 전 `K check --full`. 실행하지 않은 시험은 "미검증"으로 보고한다.

## 병렬 워크플로(moai-work)

- 새 레포의 최초 init은 `Bootstrap: kit-init` 티켓에서만: [bootstrap.md](references/bootstrap.md). 기존 앱은 init하지 않는다.
- `gen`·`migrate`와 `server/db/schema.ts`·`app/(app)/nav.ts`·`lib/permissions.ts`·`package.json` 수정은 **foundation 이슈에서만** 한다(공유 파일).
- `docs/agents/issue-tracker.md` Commands 값: install `npm ci` · typecheck `npm run typecheck` · test `npm run test` · e2e `node .claude/skills/moai-kit/scripts/kit.mjs e2e`(`PORT`를 따른다).

## 하지 말 것

- `node_modules/`·`.next/`·`drizzle/meta/`·`data/`·`test-results/`·`package-lock.json` 읽기
- 파일 전체 재작성, lint 우회, 버전 고정 없는 의존성 추가, 생성된 TC 삭제
- 이슈 작업 중 이 스킬의 `scripts/`·`assets/`·`references/` 수정. 갱신 방법은 [maintenance.md](references/maintenance.md)
