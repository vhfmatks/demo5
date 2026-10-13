---
name: moai-setup
description: Prepare a hackathon repo on PC1 - check Git, gh, Node, PowerShell and tar; prepare basic docs, AGENTS.md, worker settings, loop/dashboard scripts and GitHub labels. No feature interview, prototype selection or app init. Next is moai-grill, then moai-spec; the worker runs kit init. Re-runnable.
disable-model-invocation: true
---

Run on PC1 at the repo root. Templates: `assets/` next to this file. Worker ids are `pc2`, `pc3`, … (PC1 is the human).

**레포 준비만** 수행한다. 기능 인터뷰·PRD 내용 작성·시안 선택·Next.js 앱 초기화·설치·DB 변경은 하지 않는다. 기본 흐름은 `/moai-setup` → `/moai-grill` 전체 기능 인터뷰 → `/moai-spec` 발행 → worker의 최초 foundation에서 `/moai-kit init`·구현이다.

## 1. Preconditions (fix git setup in place)

Check in order; on a gap, help fix it and re-check before moving on. Never print tokens or passwords.

1. **Tools**: `git --version`, `gh --version`, `node --version` (≥ 24; worker kit init도 같은 조건), `pwsh --version` (≥ 7; Windows PowerShell 5.1은 불가), `tar --version` (kit archive 압축 해제). Missing → have the user run `! winget install --id Git.Git -e` / `! winget install --id GitHub.cli -e` / `! winget install --id OpenJS.NodeJS -e` / `! winget install --id Microsoft.PowerShell -e`; tar가 없으면 Windows 기본 tar 또는 Git 설치 경로를 확인한다. Reopen the terminal, then re-run `/moai-setup`. Stop.
2. **gh login**: `gh auth status` fails → have the user run `! gh auth login` (interactive: GitHub.com · HTTPS · browser), then re-check. Then run `gh auth setup-git` yourself so `git push` uses the gh credentials. `gh api user --jq .login` = **my login**.
3. **Identity**: `git config user.name` / `git config user.email` empty → one AskUserQuestion with the two values, defaults `gh api user --jq '.name // .login'` and `gh api user --jq '"\(.id)+\(.login)@users.noreply.github.com"'` (Recommended; keeps the real email private). Set with `git config --global`; if the user says it's a shared PC, drop `--global` (repo only).
4. **Repo**: `git rev-parse --show-toplevel` fails → ask "여기서 `git init -b main` 할까요?" (yes · stop). Inside a repo on an unborn `master` → `git branch -m main`.
5. **Remote**: `git remote get-url origin` fails → ask (AskUserQuestion): 기존 팀 저장소 URL 입력 (typed via Other → `git remote add origin <url>`) · 새로 만들기 `gh repo create <folder name> --private --source . --remote origin` · stop. The answer is the confirmation; an org repo is typed as `<org>/<name>`.
6. `gh repo view --json nameWithOwner,viewerPermission` resolves and permission is `ADMIN`/`MAINTAIN`/`WRITE` (labels need it). Otherwise show the result and stop.

## 2. Ask (AskUserQuestion, three rounds)

질문 전에 기존 tracker의 Settings·Area ownership을 읽고 현재 값을 보여 준다. 한 라운드 최대 4문항, 선택지 2–4개이며 실제 역할을 PC 번호로 추측하지 않는다.

Round 1, 운영 설정 세 가지를 한 번에 묻는다(기능·화면 질문은 하지 않는다):

| Header | Question | Options |
|---|---|---|
| Workers | 워커 PC가 몇 대인가요? (PC1 제외) | 1 · 2 (Recommended) · 3 · 4 |
| Parallel | 워커 PC 1대가 동시에 돌릴 구현 서브에이전트 수(MAX_PARALLEL)? | 3 · 5 (Recommended) |
| Merge | 리뷰·시험 통과 시 워커가 PR을 직접 머지할까요(AUTO_MERGE)? | yes (Recommended) · no = PC1이 머지 |

Round 2, one question per worker (`pc2` … `pc<N+1>`): "`<pc>` 이슈의 담당자(assignee) GitHub 계정은?" Options: 비워 둠 (Recommended) · `<my login>`. A typed login is checked with `gh api repos/<owner>/<repo>/collaborators/<login>`; not a collaborator → leave it empty and say so.

Round 3, 워커가 2대 이상이면 역할 두 개를 **사용자에게 선택받는다**:

| Header | Question | 저장 키 |
|---|---|---|
| 구현 담당 | 일반 기능 구현 spec을 맡을 워커 PC는? | `IMPLEMENTATION_PC` |
| 버그·개선 담당 | bug·improve 수정 spec을 맡을 워커 PC는? | `MAINTENANCE_PC` |

각 선택지는 이번에 등록할 PC ID(`pc2`, `pc3`, …) 2–4개다. 기존 값이 유효하면 그 선택지를 첫째·` (Recommended)`로 표시하고, 없으면 역할을 추측하지 않고 선택받는다. Other 입력도 명단과 대조하며 미등록 PC는 저장하지 않는다. 동일 PC가 두 역할을 맡아도 된다. 워커가 한 대면 두 값 모두 `pc2`로 지정하고 보고한다. 재실행 때 제거된 PC의 설정은 이어받지 않는다.

## 3. Write files

Never overwrite silently: an existing file that differs from what you'd write → show the diff and ask once (keep / replace).

먼저 기존 `AGENTS.md`와 tracker를 읽는다. `AGENTS.md`는 필수 문서의 최우선 지속 관리 계약, tracker는 워커 운영 정보의 원본으로 역할을 나눈다. 프로젝트 문서 작성은 `.claude/skills/moai-docs/SKILL.md`의 점진적 로딩 인덱스로 대상 문서 참조만 선택한다. 틀 준비에는 문서별 매뉴얼만 읽고, REQ→AC→TC 연결을 다룰 때만 라이프사이클을 추가한다.

- `docs/agents/issue-tracker.md` ← `assets/issue-tracker.md`의 `{{MAX_PARALLEL}}`, `{{AUTO_MERGE}}`, `{{IMPLEMENTATION_PC}}`, `{{MAINTENANCE_PC}}`, `{{WORKER_ROWS}}`를 채운다. 워커별 행은 `| pc2 | <fill at kickoff> | <login or empty> |`다.
  - 기존 tracker의 설정·명령·담당 영역을 보존한다. 재실행은 답변받은 네 설정값·담당자·PC 행을 갱신하고 남는 PC의 영역은 유지한다. 두 역할 키가 없는 이전 tracker에는 선택받은 행을 추가한다. 구 배정 규칙이 남아 있으면 공통 Area ownership 설명·Source 헤더·Labels/Label→skill/Triage 지침만 템플릿과 diff를 보여 주고 승인받아 부분 갱신한다. 다른 설정·PC 행·운영 이력을 초기화하지 않는다. 역할 변경은 기존 Issue를 자동 재배정하지 않는다.
- `AGENTS.md` ← `assets/AGENTS.md`의 문서 계약을 사용한다. 설정 자리표시자는 여기에 넣지 않는다.
  - 파일이 없으면 템플릿으로 만든다.
  - `<!-- BEGIN:moai-doc-contract -->`·`<!-- END:moai-doc-contract -->`가 모두 있으면 그 사이의 관리 블록만 대조·갱신한다. 동일하면 변경하지 않으며 중복 삽입하지 않는다. 한쪽 마커만 있거나 여러 블록이면 임의로 덮어쓰지 말고 충돌을 보고한다.
  - 마커가 없으면 파일 제목 뒤·코드 규약 앞에 관리 블록을 한 번 넣는다. 기존 코드 규약·Next 자동 생성 블록·프로젝트 구조 안내는 보존한다.
  - 상시 블록에는 최우선 관리·안전·실제 근거 원칙과 moai-docs 사용 안내만 둔다. 문서별 정의·레이아웃은 스킬 참조로 두고 상시 import·중복 복사하지 않는다. 실제 프로젝트 문서의 본문을 setup에서 임의로 채우거나 검증 완료로 표시하지 않는다. 주최 측 보안 정책은 생성·수정하지 않는다.
- 기존 `CLAUDE.md`가 있으면 `@AGENTS.md` 독립된 줄이 없을 때만 추가한다. 기존 규약은 보존하고 문서 계약을 중복 복사하지 않는다. 파일이 없으면 새 CLAUDE.md를 만들지 않는다.
- 기본 문서: 없는 `README.md`와 팀 관리 `docs/` 7종은 `.claude/skills/moai-docs/SKILL.md`에서 해당 `references/documents/<문서>.md`만 순차 선택해 제공 레이아웃·표 열을 유지한 빈 틀만 만든다. 목적·작성 시점과 `미정`·`미실행`만 표시하며 기능·REQ·AC·효과·시험 결과는 채우지 않는다. 기존 본문은 보존한다. `docs/security-policy.md`는 주최 측 원본이므로 부재만 보고하고 만들지 않는다. 앱의 `package.json`·src·DB는 만들지 않는다.
- `scripts/moai-loop.ps1` ← `assets/moai-loop.ps1` (최초 init 전에는 없는 정리 스크립트를 건너뛰고, worker의 init이 설치한 뒤부터 사용한다)
- `scripts/moai-dashboard.ps1` ← `assets/moai-dashboard.ps1`, `scripts/moai-dashboard.html` ← `assets/moai-dashboard.html`
- macOS·Linux 짝(`pwsh` 없이 실행): `scripts/moai-loop.sh`, `scripts/moai-dashboard.sh`, `scripts/moai-worktree-clean.sh` ← 같은 이름의 `assets/*.sh`. 사용법은 각 스크립트의 `--help`(한글)
- `docs/issue-format.md` ← `assets/issue-format.md`, 없을 때만 `cp -n`으로 복사한다(아래 deny가 Write 도구를 막는다). 있으면 프로젝트 형식이므로 비교·덮어쓰기 하지 않는다. 형식은 사람만 고치며 발행 검증은 tracker **Create**가 한다.
- `.gitignore`: `/.claude/worktrees/` 독립된 줄이 없을 때만 덧붙인다(파일이 없으면 이 줄로 만든다). implementer worktree가 main의 git 상태에 잡히지 않게 한다. lint·typecheck·test는 kit 기본 설정(`biome.json` `!!.claude`, `.oxlintrc.json` `.claude/**`, `tsconfig.json` exclude `.claude`, vitest `tests/unit/**`)이 이미 worktree를 제외하므로 setup에서 고치지 않는다.
- `.claude/settings.json`: 없는 항목만 병합하고 기존 항목은 보존한다. `permissions.deny`에 `Edit(./docs/issue-format.md)`, `hooks.PreToolUse`에 `{"matcher": "Bash|PowerShell", "hooks": [{"type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/skills/moai-setup/scripts/issue-create.mjs\" --hook"}]}`(gh issue create 직접 실행 차단). 파일이 없으면 kit 기본(`tar -xzOf .claude/skills/moai-kit/assets/base.tgz .claude/settings.json`)에 더해 만든다(나중 init은 기존 파일을 보존한다).

나중에 worker의 kit init이 AGENTS 끝에 코드 규약·프로젝트 구조 안내를 덧붙일 수 있다. setup은 그 영역을 관리 블록으로 오인하지 않는다. init 이후 보존 확인은 `.claude/skills/moai-kit/references/bootstrap.md`가 맡는다.

## 4. Labels

`gh label create <name> -c <color> -d "<desc>" --force` (idempotent):

| Name | Color | Description |
|---|---|---|
| `agent:<pc>` per worker | `1D76DB`, `5319E7`, `0E7490`, `6F42C1` in order | `owner: worker <PC>` |
| `status:ready` | `0E8A16` | `status: fully specified, workers may take it` |
| `status:in-progress` | `FBCA04` | `status: claimed by a worker` |
| `status:needs-human` | `D93F0B` | `status: worker gave up, reason in last comment` |
| `kind:spec` | `C5DEF5` | `kind: parent spec, its agent:<pc> takes all children` |
| `kind:bug` | `D73A4A` | `kind: AC 불일치 버그 (QA /moai-report 또는 /moai-diagnose)` |
| `status:triage` | `C2E0C6` | `status: QA 접수, PC1 분류 전 (worker 무시)` |
| `kind:improve` | `A2EEEF` | `kind: AC는 충족, 개선 요청` |
| `priority:hotfix` | `B60205` | `priority: kind:bug 전용, 다음 worker run 최우선` |

`agent:pc*` labels left over from an earlier run with more workers: don't delete, list them for the user.

## 5. Next

- **준비 파일 공개**: worker가 clone·worktree를 만들려면 준비 파일이 커밋된 `origin/main`이 필요하다. 변경 경로를 보여 주고 첫 커밋·push를 별도로 확인한다(Recommended: 준비 파일만 커밋·push / 아직 공개하지 않음). 운영 설정 답변을 공개 승인으로 간주하지 않는다. 승인한 경우 setup이 만든 파일과 worker에 필요한 `.claude/agents/`·`.claude/skills/`(kit 스크립트·`assets/base.tgz`·references 포함)만 확인·stage한다. 다른 미커밋 작업·비밀·실행 산출물은 포함하지 않는다. 커밋은 `chore: G0 moai setup`; main이 아니면 승인 없이 기존 브랜치를 main으로 바꾸거나 덮어쓰지 않는다. 공개하지 않으면 worker 시작 불가 사유와 남은 공개 단계를 보고한다.
- **다음 단계 안내**: `/moai-grill`에서 원하는 기능 전체를 인터뷰하고 확정한 뒤 `/moai-spec`으로 발행한다. setup은 여기서 멈추며 인터뷰·spec 발행을 자동 실행하지 않는다. Next.js 앱 초기화는 발행된 최초 foundation 티켓의 worker가 맡는다.
- **Dashboard** ("모아이의 하루"): `origin/main` 준비 후 상황판 PC에서 `pwsh scripts/moai-dashboard.ps1 [-Ai]` → `http://localhost:8787`(그 PC의 `gh` 로그인으로 읽기, 토큰 발급 불필요). 토큰을 쓸 수 있으면 `scripts/moai-dashboard.html`을 직접 열어 읽기 전용 fine-grained 토큰을 입력해도 된다. `-Ai`는 Next 코치·중계 에이전트(`claude -p`, 도구 없음)를 더한다. It writes nothing to GitHub.

## 6. Report

How to open the board (`pwsh scripts/moai-dashboard.ps1`, any PC with repo access), one table `pc | label | assignee | 역할`(일반 구현 / bug·improve / 둘 다 / 미배정), then the steps for each worker PC:

```
gh auth login; gh auth setup-git
git clone <repo url>; cd <repo>
git config --global user.name "<name>"; git config --global user.email "<id>+<login>@users.noreply.github.com"   # if unset
pwsh scripts/moai-loop.ps1 <pc>
```

Remind: 모든 PC에 Git·gh·Node 24+·PowerShell 7+·tar·Claude Code가 필요하다. 선택한 두 담당을 확인하고 PC1은 moai-docs 계약으로 brief·development의 팀 역할·변경 이유를 반영한다(기존 Issue 배정 이력 보존). 다음은 PC1의 `/moai-grill` 전체 기능 인터뷰이며 `/moai-spec` 전에 tracker의 영역 열을 채운다. 인터뷰 완료·spec 발행 후 worker가 최초 foundation에서 init(설치·합성 DB 준비 포함)을 수행하므로 clone 직후에는 npm 설치를 요구하지 않는다. `AGENTS.md`의 필수 문서는 프로젝트 내내 최우선으로 관리하고, 실제 시험·근거 없는 항목은 미검증으로 남긴다.
