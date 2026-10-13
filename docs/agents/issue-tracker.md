# Issue tracker: GitHub (`gh`)

All tracker operations live here. To switch to GitLab, rewrite only this file (`glab issue ...` / `glab mr ...`).
Multi-line bodies: write to a temp file and pass `--body-file <file>` (works in bash and PowerShell).

## Team workflow

- **PC1 (human)**: 신규 프로젝트는 `/moai-setup` 레포 준비 → `/moai-grill` 원하는 기능 전체 인터뷰·PRD 확인 → `/moai-spec` 발행 → worker의 최초 foundation에서 `/moai-kit init`·구현. setup은 인터뷰·시안·앱 초기화를 하지 않는다. 기존 작업은 확인된 PRD를 재사용하며 변경된 요구만 grill에서 확인한다. 시안은 요청할 때만 별도 사용한다. `/moai-diagnose`는 버그 경로다. QA(또는 누구나)는 `/moai-report`로 bug·improve를 `status:triage`에 접수하고 PC1이 분류한다(**Label → skill**). One spec and all its issues labelled one `agent:<pc>` (one PC per spec, from the ownership table).
- **Worker PCs (agents)**: `pwsh scripts/moai-loop.ps1 <pc>` (e.g. `pc2`; macOS/Linux: `bash scripts/moai-loop.sh <pc>`; manual: `--help`): a fresh `claude -p "/moai-work <pc>"` per run, model/effort from `.claude/agents/moai-worker.md` (= `WORK_MODEL`). Stop after the current run: `New-Item (Join-Path (git rev-parse --git-dir) moai-loop/STOP-<pc>)`. Each takes its own specs one at a time: background implementers build the frontier tickets, each in its own worktree and `issue-<n>` branch, a merger merges each into the spec integration branch `spec-<p>`, then one review, one final gate and one spec PR.
- **PC1 docs**: `AGENTS.md`의 필수 문서 관리 계약을 따른다. 팀 관리 문서는 PC1만 갱신하며 게이트 G0–G8(`PLAYBOOK.md` §7)을 릴리스마다 반복한다. G1 `/moai-grill`이 brief·PRD 요구 본문을 작성, G2 `/moai-spec`이 구현 계획·Issue/TC 연결을 보완하고 `/moai-docs arch | sync | freeze | final`로 실제 결과를 반영한다.
- **Security policy**: `docs/security-policy.md` (organizer's rules, read-only) binds every design, implementation, review and test. Violation = review BLOCKING.
- Tracker ops and the issue state machine: this file. Domain vocabulary: `GLOSSARY.md` (if present).

## Settings

| Key | Value | Meaning |
|---|---|---|
| MAX_PARALLEL | 5 | Max implementer subagents per wave |
| WORK_MODEL | sonnet / high | Agent `moai-worker`: main session running `/moai-work` (orchestrator), started by `scripts/moai-loop.ps1` with `--agent moai-worker` (override per PC: `pwsh scripts/moai-loop.ps1 pc2 -Model opus -Effort medium`). An issue's `Model:` header overrides `IMPLEMENTER_MODEL`, not this |
| IMPLEMENTER_MODEL | sonnet / high | Agent `moai-implementer`: implementer subagents |
| EXPLORER_MODEL | haiku / medium | Agent `moai-explorer`: read-only code lookups during planning |
| MERGER_MODEL | sonnet / medium | Agent `moai-merger`: merges finished branches into the spec integration branch, one at a time |
| REVIEWER_MODEL | opus / high | Agent `moai-reviewer`: the Standards and Spec axis subagents of the one spec review (`moai-review`) |
| (agents) | `.claude/agents/moai-*.md` | `model` / `effort` above live in each agent's frontmatter. Change both together |
| AUTO_MERGE | yes | Worker squash-merges its own PR once review + tests pass. `no` = human merges on PC1 |
| IMPLEMENTATION_PC | pc2 | 일반 기능 spec 담당 PC (Area ownership에 등록된 ID) |
| MAINTENANCE_PC | pc3 | bug·improve spec·단일 티켓·diagnose·PC1 Triage 담당 PC |

## Area ownership

워커 명단·GitHub assignee의 원본이다. PC ID가 `agent:<pc>` 라벨이며 Areas는 kickoff에서 채우는 범위 힌트다. 역할별 배정 계약(`/moai-spec`, `/moai-diagnose`, PC1 **Triage** 공통):

- 일반 기능은 `IMPLEMENTATION_PC`, bug·improve는 `MAINTENANCE_PC`. grilling·spec 승격 후에도 확인된 `Source:` 유형을 사용한다. 부모·모든 자식은 같은 PC 라벨·그 행의 assignee를 사용하고 빈 assignee는 생략한다. triage 접수에는 담당을 붙이지 않는다.
- 새 발행의 담당 우선순위: 명시적 PC override(계획 확인에 표시) → 역할 설정. 값은 아래 등록 PC만 허용한다. 누락·`미지정`·미등록 값이면 부모 생성/Create/Triage **전에** 필요한 역할을 확인한다. 등록 PC가 한 대면 그 PC, 여러 대면 사용자에게 선택받는다. 이번 발행에만 적용하며 지속 저장은 `/moai-setup`이 맡는다. 지정 PC가 바쁘다는 이유로 다른 PC를 고르지 않는다.
- **Open work**로 다른 PC의 열린 작업과 Touches를 대조한다. 겹치면 지정 PC를 자동 변경하지 않고 영향을 받는 티켓의 `Blocked by`에 실제 외부 이슈 번호를 넣어 직렬화하는 안을 PC1에게 확인한다. 다른 spec의 blocker는 main 머지 후 `COMPLETED`여야 해제된다. 누락·순환·범위가 불명확하거나 승인되지 않으면 발행을 멈춘다. 명시적 재배정도 이 검사를 생략하지 않는다.
- 재발행은 기존 부모(단일 티켓이면 그 이슈)의 실제 PC·Source를 유지한다. 설정 변경으로 재계산하지 않으며 불일치한 자식 라벨·assignee는 보고 후 중단한다. 담당 변경은 승인된 **Reassign**만 사용하고 진행 중 티켓은 자동 이동하지 않는다.

| PC | Areas (`domain:<x>` tokens, `/moai-spec` §2) | Assignee (GitHub login) |
|---|---|---|
| pc2 | domain:posts, domain:comments |  |
| pc3 | <fill at kickoff> |  |

## Commands

Fill in at kickoff. Agents run these; keep them non-interactive.

- install: `npm ci`
- lint: `npm run lint`
- typecheck: `npm run typecheck`
- test: `npm run test`
- e2e: `node .claude/skills/moai-kit/scripts/kit.mjs e2e [spec files]` (honours `PORT`; each implementer runs only its narrow spec files in its own worktree with `PORT = 3100 + SLOT`). 구현자는 moai-tdd에서 필요한 좁은 RED/GREEN·선행 위험 spec만 실행하고 일반 E2E는 유예한다. 전체 suite는 spec 통합 후보의 최종 게이트에서 정상 경로 1회 실행하며 변경·실패 후 재검증한다
- verify (before PR): `npm run verify` (lint, typecheck, test, build, audit)

## Conflict rules (every agent, every change)

- `AGENTS.md`에 정의한 팀 관리 문서는 워커가 직접 고치지 않는다. 승인된 `Bootstrap: kit-init`의 기본 문서 틀 신규 생성·PLAYBOOK의 moai-docs 매뉴얼·AGENTS 관리 원칙 링크 정합만 한정 예외이며 기존 본문·요구·결과는 보존한다. AC → TC → 실제 결과와 문서에 반영할 변경을 PR 본문에 보고하고 PC1이 갱신한다. 주최 측 보안 정책은 누구도 임의로 수정하지 않는다.
- Stay inside the issue's `Writes:` paths (`Touches:` is the coarse area marker) so parallel branches merge cleanly. A hotspot edit (`db-schema`, `registry`, `deps`, `ui-kit`) outside a ticket that owns the token → stop and report `BLOCKED` before editing; any other edit outside `Writes` stays minimal and is listed in the report.
- One worktree and branch per ticket (`issue-<n>`, based on the spec integration branch `spec-<p>`). Implementers commit there and merge the `spec-<p>` tip before reporting; they never push or open PRs. Only the merger writes `spec-<p>`, one merge at a time, and only the orchestrator pushes, writes the tracker and runs the final gate.
- Never reformat, rename or reorder code you weren't asked to touch.
- New dependencies, shared types, DB schema, route/menu registries: only in a ticket that owns them (usually a foundation ticket that blocks others).
- Registries: one file per feature + auto-discovery, or append-only at the end. Migrations: timestamp names, never sequence numbers.
- Lockfile conflict on rebase: take `origin/main`'s lockfile, re-run install, commit.

## Labels

Four groups, by prefix. An open ticket carries exactly one `status:*` and at most one `kind:*`; `status:triage` carries no `agent:*` (so no worker queue sees it), `ready`/`in-progress`/`needs-human` carry exactly one; a `kind:spec` carries only the `agent:*` of the PC that owns all its tickets; changing status = remove the old `status:*` and add the new one in the same `gh issue edit`.

| Group | Label | Meaning |
|---|---|---|
| owner | `agent:<pc>` (e.g. `agent:pc2`) | Which worker PC owns it; one per row of the `Area ownership` table in this file |
| status | `status:triage` | Reported by `/moai-report`, not yet classified by PC1. No `agent:*`; workers ignore it |
| | `status:ready` | Fully specified, workers may take it |
| | `status:in-progress` | Claimed by a worker |
| | `status:needs-human` | Worker gave up; reason is in the last comment |
| kind | `kind:spec` | Parent spec issue. Never claimed itself: its `agent:<pc>` takes all its children (`Parent: #<spec>`), one spec at a time. Closed by **Close spec** once no child is open |
| | `kind:bug` | Behaviour differs from a REQ/AC (from `/moai-report` or `/moai-diagnose`) |
| | `kind:improve` | AC met, change requested (UX, wording, speed). 단일 유형의 승격 자식에도 유지. `kind:*` 없는 자식은 부모 Source의 유형을 상속하며 Source도 none일 때만 일반 기능 |
| priority | `priority:hotfix` | `kind:bug` only, set by PC1 at triage: the owning worker takes it before its specs |

One-time setup:

```
gh label create agent:<pc> -c 1D76DB   # once per worker PC; /moai-setup does this
gh label create status:ready -c 0E8A16; gh label create status:in-progress -c FBCA04; gh label create status:needs-human -c D93F0B
gh label create kind:spec -c C5DEF5; gh label create kind:bug -c D73A4A
gh label create status:triage -c C2E0C6; gh label create kind:improve -c A2EEEF; gh label create priority:hotfix -c B60205
```

Rules:
- REQ/AC를 바꾸는 `kind:improve`의 원 triage 접수는 직접 `status:ready`로 전환하지 않는다. `/moai-grill` → `/moai-spec`에서 확인된 새 spec·자식을 발행한 뒤 원 접수를 promoted로 닫는다. 승격 자식은 `kind:improve` + `status:ready`가 가능하며 G5 제한은 그대로 적용한다.
- After G5 (feature freeze) only bug goes to `status:ready`; improve is dropped (미구현). 부모 `Source:`·자식 라벨로 개선을 확인하며 `kind:spec` 승격이나 kind 라벨 부재로 이 제한을 우회하지 않는다.
- Progress and the dashboard leave `status:triage` out of the denominator: scope is not decided yet.

## State machine

State = GitHub open/closed + `stateReason` + labels. Nothing else stores it. Progress counts only `COMPLETED`; `NOT_PLANNED` leaves the denominator.

```
 /moai-report (QA)          /moai-spec
       │                        │
       ▼                        │
    TRIAGE ──PC1: classify─────▶│
       │                        ▼
       │           ┌──────── READY ◀────────────────────┐
       │           │             │ claim                 │ PC1: fix, needs-human → ready
       │           │             ▼                       │
       │           │       IN_PROGRESS ──give up──▶ NEEDS_HUMAN
       │           │             │ PR merged             │
       │           │             ▼                       │ PC1: drop
       │           │           DONE                      │
       │ PC1:      ▼                                     ▼
       └─reject─▶ DROPPED ◀──────────────────────────────┘
```

| State | GitHub |
|---|---|
| TRIAGE | open + `status:triage` + `kind:bug` or `kind:improve`, no `agent:*`, no header yet |
| READY | open + `status:ready` + `agent:<pc>`. **Blocked** = derived, not stored: a blocker is neither COMPLETED nor same-spec `merged` (its `issue-<n>` commit is an ancestor of the integration branch `spec-<p>`; reviewed later, once per spec) |
| IN_PROGRESS | open + `status:in-progress` |
| NEEDS_HUMAN | open + `status:needs-human`, reason in last comment |
| DONE | closed, `stateReason=COMPLETED` (terminal) |
| DROPPED | closed, `stateReason=NOT_PLANNED` (terminal) |

| Transition | Who | When / how |
|---|---|---|
| → TRIAGE | `/moai-report` (QA, anyone) | after the duplicate check → **Report** |
| → READY | `/moai-spec` | published once, all at G2 |
| TRIAGE → READY | PC1 | header filled in the same issue (bug: `/moai-diagnose`; improve without REQ/AC change: single ticket), `priority:hotfix` if needed → **Triage** |
| TRIAGE → DROPPED | PC1 | not reproducible, duplicate (`duplicate of #m`), won't fix, improve after G5, or promoted (`[moai] promoted → spec #p`) → **Drop** |
| READY → IN_PROGRESS | `/moai-work` | on the frontier: blockers satisfied (same-spec `merged`, external COMPLETED), no other running ticket shares a hotspot token → **Claim** |
| IN_PROGRESS → IN_PROGRESS | `/moai-work` | stale claim from a dead run → resume |
| IN_PROGRESS → DONE | `/moai-work` (or PC1 if `AUTO_MERGE=no`) | PR with `Closes #<n>` merged → **Done** (closes it if still open) |
| IN_PROGRESS → NEEDS_HUMAN | `/moai-work` | implementer BLOCKED, merge failed twice, persistent final gate failure, or a blocker is `NOT_PLANNED` → **Give up** |
| NEEDS_HUMAN → READY | PC1 | spec/comments fixed → `gh issue edit <n> --remove-label status:needs-human --add-label status:ready` |
| READY, NEEDS_HUMAN → DROPPED | PC1 | scope cut, by G5 at the latest → **Drop** |
| spec → closed | `/moai-work`, `/moai-docs freeze` | last child of `Parent: #<p>` closed → **Close spec** |
| DONE → anything | never | reopening lowers progress. A regression is a new `kind:bug` via `/moai-report` with `Regression of: #<n>` |

### IN_PROGRESS phases

Inside IN_PROGRESS the phase is the **last `[moai]` comment**, not a label. Only the `/moai-work` orchestrator posts them (implementer, merger and reviewer subagents never touch the tracker). The trail doubles as the GitHub work history. Each ticket has its own worktree and `issue-<n>` branch based on the spec integration branch `spec-<p>`; phases record the run id, branch SHAs and merge SHAs.

```
claimed ──▶ implemented ──▶ merged ──▶ (all children merged) review on spec issue ──▶ review fixed ──▶ final gate ──▶ pr (ready) ──▶ (actual spec PR merge) DONE
                 │ merge FAILED → implementer merges the new spec-<p> tip → merger again; 2nd failure → gave up
                 └─ gate-failed → delegated fix branch → merged → final gate                                    any phase ──▶ gave up (NEEDS_HUMAN)
```

| Phase | Comment | Next | Resume from here (stale claim) |
|---|---|---|---|
| claimed | `[moai] claimed by <pc> · run=<id> · spec=spec-<p>@<sha> · branch=issue-<n> · slot <s>` | background implementer → implemented/BLOCKED | `issue-<n>` (local/origin) and a dead worktree's `wip:` commit are the work so far; a live run owning the worktree → stop |
| implemented | `[moai] implemented · branch=issue-<n>@<sha> · merged spec tip=<sha> · lint/typecheck/unit=<results> · E2E=<narrow results \| 미실행(통합 게이트 예정)>`, then changes, AC→TC and actual RED/GREEN commands/tests/failure reason | merger → merged | branch has the work: run the merger |
| merged | `[moai] merged · spec-<p>@<sha> · issue-<n>@<sha> · conflicts=<none \| files> · checks=<results>` (not reviewed yet) | unblocks same-spec dependents; review once all children are merged; stays IN_PROGRESS | verify `git merge-base --is-ancestor issue-<n> spec-<p>`; skip duplicate implementation |
| review | on the **spec issue** only, once: `[moai] review · spec-<p>@<sha> since <SPEC_BASE> · Standards <k> · Spec <k>` with both reports; then `[moai] review fixed · review-fix-<p>@<sha> merged spec-<p>@<sha>` with fixed / skipped-with-reason per finding | final gate | the comment is the review; with no `review fixed` yet, run the single fix implementer |
| gate-failed | `[moai] gate-failed · spec=<branch> · SOURCE_SHA=<sha> · MAIN_SHA=<sha> · command/test/reason=<failure>` | delegated TDD fix on `gate-fix-<p>` → merged → verify + full isolated E2E | preserve refs; never rerun unchanged failing source; unresolved child blocks shipping |
| pr | `[moai] pr #<m> · spec=<branch> · HEAD_SHA=<sha> · SOURCE_SHA=<sha> · MAIN_SHA=<sha> · verify/full E2E=<actual results>`, screenshot lines | actual MERGED → DONE; unchanged open → wait IN_PROGRESS | query PR state/head/base/mergeCommit and fetched refs; unchanged gate evidence reused; changed head/base/main → gate renewed; closed unmerged → human |
| (DONE) | `[moai] done · <commit url> · tests: <PR url>` | terminal | none |
| (NEEDS_HUMAN) | `[moai] gave up · <phase> · <one-paragraph reason>` | PC1 | none |

## Label → skill

Which skill acts on which label state. 지금 = works today (manual where noted); 추후 = planned skill change, tracked as its own issue.

| Label state | Skill | Does | Next | Status |
|---|---|---|---|---|
| (none) | `/moai-report` | QA report: duplicate check, one issue | TRIAGE | 지금 |
| `triage` + `kind:bug` | `/moai-diagnose` | repro + cause, 단일 bug 발행 → `MAINTENANCE_PC` | READY (+`hotfix`) / DROPPED | 지금 새 이슈 생성 · 같은 접수 Triage는 PC1 수동 |
| `triage` + `kind:bug`/`improve`, grilling 후 spec | `/moai-grill` → `/moai-spec` | delta interview, Source 보존 → `MAINTENANCE_PC` | report promoted (DROPPED) | 지금 |
| `triage` + `kind:improve`, no REQ/AC change | `/moai-spec` | `Parent: none` 단일 티켓 → `MAINTENANCE_PC` | READY | 지금 PC1 수동 · 추후 단일 티켓 모드 |
| `ready` + `priority:hotfix` | `/moai-work` | takes it before resuming specs | IN_PROGRESS | 추후 (지금은 parentless가 spec 뒤) |
| `ready` + `kind:bug`/`improve`, parentless | `/moai-work` | one-ticket graph `spec-issue-<n>` | IN_PROGRESS | 지금 |
| `in-progress` | `/moai-work` → `moai-tdd` → `moai-review` | implement, review, gate, PR | DONE | 지금 |
| closed `kind:bug`/`improve` | `/moai-docs sync` | regression TC row in e2e-test, prd status | — | 지금 PC1 수동 |
| DONE, QA re-check | none | `[qa] verified · main@<sha>` comment; failure → `/moai-report` regression | TRIAGE | 지금 수동 |

## Issue body header

The first lines of every ticket are machine-read by workers (a `status:triage` report has none until PC1 triages it; the report body stays below the header). Keep the exact keys. Issue titles and the body below the header follow `docs/issue-format.md` (the project's format: people edit it, agents never do), checked by **Create**/**Report**.

```
Parent: #<spec issue> | none
Source: #<report> kind:<bug|improve> | none kind:<bug|improve> | none   (Parent: none일 때; 여러 출처는 `;`로 구분)
REQ: REQ-01, REQ-02   (ids in docs/prd.md)
Blocked by: #12, #13 | none
Bootstrap: kit-init | none   (최초 foundation 하나만, 그 본문에 승인 Init spec JSON)
Touches: <area tokens from /moai-spec §2, e.g. domain:booking | db-schema, registry, deps>   (coarse PC/domain marker)
Writes: <exact paths this issue creates or edits, tests included; no broad glob>
Reads: <shared contracts it reads but never edits> | none
Checks: <narrow commands that validate this slice>
Test seam: <public interface tests go through, e.g. POST /api/login, <LoginForm/>>
TDD seam: <승인된 공개 정책/서비스 또는 API/UI>
Model: <optional; `model / effort` overriding IMPLEMENTER_MODEL for this ticket, e.g. opus / high>
```

A `kind:spec` parent starts its body with `Tickets: <N>` (the planned child count; `/moai-spec` writes it before creating any child), so a worker can tell a half-published spec from a complete one. 다음 줄 `Source:`에 확인된 접수 번호·유형을 적으며 자식은 부모 출처를 따른다. 일반 기능은 `none`, 직접 버그·개선은 `none kind:<bug|improve>`, 여러 출처는 `;`로 구분한다. 부모에는 `kind:spec`만 붙인다.

## Operations

- **Create**: `node .claude/skills/moai-setup/scripts/issue-create.mjs --title "..." --body-file <f> --label status:ready --label agent:<pc> --assignee <login>` (the PC's login from the `Area ownership` table in this file; drop `--assignee` when empty). Same arguments as `gh issue create`, which a hook blocks: it publishes only a title and body that pass `docs/issue-format.md` and lists what to fix otherwise. `--check` = check only (run it before showing a body for approval)
- **Report** (`/moai-report`): `node .claude/skills/moai-setup/scripts/issue-create.mjs --title "[bug|improve] <화면>: <요약>" --body-file <f> --label status:triage --label kind:<bug|improve>` (no `agent:*`, no assignee; checked like **Create**)
- **Triage queue** (PC1): `gh issue list --state open --label status:triage --json number,title,labels,author`
- **Triage** (PC1, header already prepended; bug·improve의 `<pc>`는 Area ownership의 `MAINTENANCE_PC` 계약): `gh issue edit <n> --remove-label status:triage --add-label status:ready --add-label agent:<pc> --add-assignee <login>` (빈 담당자는 옵션 생략; hotfix는 bug만 `--add-label priority:hotfix`)
- **Open work** (배정 전 충돌 검사): `gh issue list --state open --limit 1000 --json number,title,body,labels` (agent가 있는 작업의 Touches·Blocked by를 대조; 조회 한도에 닿으면 이어 조회, 충돌 없음으로 추정하지 않음)
- **Read**: `gh issue view <n> --comments`
- **Queue for `<pc>`**: `gh issue list --state open --label status:ready --label agent:<pc> --limit 100 --json number,title,body,labels` (one status per ticket, so no extra filter)
- **Specs for `<pc>`**: `gh issue list --state open --label kind:spec --label agent:<pc> --limit 100 --json number,title,body` (work them in ascending number)
- **Spec children**: `gh issue list --state all --limit 200 --json number,title,state,stateReason,body,labels --jq '[.[] | select(.body | test("Parent: #<p>([^0-9]|$)"))]'` (no backslashes in the regex: they break on Windows)
- **Publish check** (`/moai-work` before any claim): read the spec (`gh issue view <p> --comments`) and compare its `Tickets: N` with the **Spec children** count. Published = count equals N and every `Parent:` / `Blocked by: #x` resolves to an existing issue. Fewer → `queue empty (<pc>) · spec #<p> publishing <k>/<N>` and stop (the loop waits for a tracker change). No `Tickets:` line (older spec) = published.
- **Blocker state**: `gh issue view <n> --json state,stateReason,body,comments`. Other-spec blocker requires `COMPLETED`. Same-spec blocker may instead be `merged`: actual `git merge-base --is-ancestor issue-<n> spec-<p>` success; comments alone never unblock. `NOT_PLANNED` → Give up dependent until explicit user-approved scope revision.
- **Claim**: `gh issue edit <n> --remove-label status:ready --add-label status:in-progress --add-assignee @me` then the `[moai] claimed` comment
- **Phase**: `gh issue comment <n> --body "[moai] ..."` (formats in the phases table)
- **Current phase**: `gh issue view <n> --json comments --jq '[.comments[].body | select(startswith("[moai]"))] | last'`
- **Give up**: `gh issue edit <n> --remove-label status:in-progress --add-label status:needs-human` then the `[moai] gave up` comment
- **Reassign** (only if not `status:in-progress`): `gh issue edit <n> --remove-label agent:<from> --add-label agent:<to> --remove-assignee <from login> --add-assignee <to login>`
- **Open MR**: `gh pr create --draft --base main --head spec-<p> --title "<spec title> (#<p>)" --body-file <f>` (parentless: `spec-issue-<n>`) after the first merge into `spec-<p>`. One spec PR, `Closes #<p>` and `Closes #<n>` for every included child.
- **Ready MR**: `gh pr ready <m>` only after every in-scope child is merged, the review is fixed and verify + full isolated E2E passed on the frozen source. Unresolved children forbid shipping; scope cuts require user confirmation.
- **PR state**: `gh pr view <m> --json state,headRefOid,baseRefOid,mergeCommit,url`; compare saved gate main/source/head. Unchanged open PR waits (IN_PROGRESS), changed head/base/main requires the final gate again, closed unmerged needs human. No unchanged-source full validation repeats.
- **Merge MR**: `gh pr merge <m> --merge --match-head-commit <tested-head>`; query actual MERGED state and merge commit, fetch main and verify merge commit ancestry before Done. Preserve child commit SHAs with merge commits. Never delete any unmerged local/remote issue or spec branch. After confirmed merge + Done only, delete remote refs with `git push origin --delete <branch>` and local refs after worktree cleanup (not `--delete-branch`).
- **Done** (after merge): the `[moai] done` comment, **Evidence**, `gh issue edit <n> --remove-label status:in-progress`, then `gh issue view <n> --json state,stateReason`. Not `CLOSED` / `COMPLETED` → `gh issue close <n> --reason completed` and check again. Never finish with a merged issue still open
- **Evidence** (in **Done**; for the spec in **Close spec**): `node .claude/skills/moai-setup/scripts/issue-create.mjs --fill <n> "<키>=<값>" …` fills every post-work field of `docs/issue-format.md` (the `키:` lines it leaves empty; default `커밋 주소` = the done comment's commit URL, `테스트 명령·결과·화면 경로` = verify / full E2E command·result from the `pr` comment, this ticket's TC ids and screenshot paths under `docs/evidence/`) and changes no other line. A failure (e.g. an issue older than the format) goes in the done comment and never blocks Done
- **Close spec** (after a child closes; parents of merged/dropped issues): no **Spec children** with `state=OPEN` → **Evidence** on the spec while its post-work fields are empty (spec PR merge commit; not when every child was `NOT_PLANNED`), then `gh issue close <p> --reason completed --comment "[moai] spec done · children: #a, #b …"`; if every child was `NOT_PLANNED`, `--reason "not planned"`, then `gh issue view <p> --json state` must show `CLOSED`. Already closed → skip the close
- **Drop** (PC1 only): `gh issue close <n> --reason "not planned" --comment "<why>"`
