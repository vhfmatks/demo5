---
name: moai-spec
description: Turn the current conversation (after /moai-grill) into a parent spec + vertical-slice tickets, the whole spec assigned to one worker PC from the docs/agents/issue-tracker.md ownership table, with blocking edges and Touches/Writes/Reads ownership planned so that PC's parallel implementers (one worktree and branch per ticket) merge into the spec integration branch with few conflicts. PC1 only.
disable-model-invocation: true
---

Synthesise the implementation plan from the confirmed `docs/prd.md` (owned by moai-grill). Don't interview for requirements or write the PRD here: no PRD, or an open question on a requested feature, permission or AC → go back to moai-grill for just that item, then resume. HTML prototypes are not prerequisites: screens follow the confirmed flows and the KDS defaults (reuse an explicitly chosen prototype if there is one). App init is not a prerequisite either, it is **work of the first issue**: in a repo without the app (moai-setup → moai-grill → moai-spec), the first published ticket is the foundation with `Bootstrap: kit-init` (`.claude/skills/moai-kit/references/bootstrap.md` 판정·§1). Tracker ops and the ticket header format: `docs/agents/issue-tracker.md`. Areas: its ownership table. Vocabulary: `GLOSSARY.md`.

**One spec = one PC.** The spec and every ticket in it get the same `agent:<pc>`; that worker takes the whole spec and runs its frontier tickets in parallel, each in its own worktree and branch merged into the spec integration branch `spec-<p>` (`/moai-work`).

기존 발행을 먼저 찾는다: `gh issue list --state all --limit 200 --json number,title,body,labels,assignees`와 접수 Issue의 승격 댓글을 확인한다. 제목·Source가 같은 부모/단일 티켓은 새 계획 확인 전부터 기존 PC로 고정한다. 조회 한도에 닿으면 이어 조회하며 부재로 추정하지 않는다.

배정은 tracker **Area ownership** 계약을 따른다. 확인된 일반 기능은 `IMPLEMENTATION_PC`, `Source:`의 bug·improve는 `MAINTENANCE_PC`다. G5 이후에는 부모 Source·자식 라벨을 포함한 improve를 발행하지 않는다. 출처는 대화·PRD의 G1 합의·접수 Issue 라벨로 확인하고 spec 인자 `#n`도 출처로 받는다. 일반 기능과 maintenance는 별도 spec으로 나눈다. 인자 `pc3`는 명시적 override로 확인하되 등록·충돌 검사는 생략하지 않는다.

누락·미등록 담당과 다른 PC의 Touches 충돌은 **§3 확인 전에** 해결한다. 한 PC면 그 PC를 사용하고, 여러 PC면 필요한 담당만 질문한다(지속 저장은 setup). 지정 PC가 바쁘다고 부하 기준으로 우회하지 않는다. 재발행은 기존 부모의 실제 `agent:<pc>`·`Source:`를 먼저 고정하며 현재 설정으로 재계산하지 않는다.

## 1. Draft tickets

**Vertical slices**: each ticket owns one observable user behaviour end to end (service → API → UI → tests on the foundation's tables), can be demoed on its own, and fits one agent context. A horizontal split (API-only / UI-only ticket for the same behaviour) is forbidden. No code; `Writes`/`Reads` paths come from the real repo or the generation plan, never invented.

Use the REQ, AC and source ids moai-grill fixed in `docs/prd.md` verbatim; never renumber or redefine requirements, permissions or data while splitting work. Gaps or contradictions go back to grill. Every AC belongs to exactly one ticket. This is the traceability chain reviewers follow: REQ → AC → Issue → TC → result.

For each ticket decide:

- **REQ**: the REQ ids it covers
- **Acceptance criteria**: checkboxes prefixed with their AC id, observable behaviour only
- **Test seam**: the public API/UI boundary that finally verifies it
- **TDD seam**: the public policy/service function or API/UI where moai-tdd runs real RED/GREEN. Say which ACs the fast seam observes and which only the final E2E checks. Both seams are confirmed with the plan in step 3; never a private seam.
- **Touches**: §2 tokens it edits (coarse PC/domain marker)
- **Writes**: the exact paths (files, or a narrow directory only this slice edits) it creates or edits, including its own tests (`tests/unit/<x>*`, `tests/e2e/<x>.*`). Real or planned-generated paths; no broad glob (`src/**`, `**/*`)
- **Reads**: shared contracts it reads but never edits (schema, service, permissions, fixtures, registry …) or `none`
- **Checks**: the narrow commands that validate this slice (e.g. `npx vitest run tests/unit/<x>.test.ts`). Global lint/typecheck/build/gen/migrate are run by the coordinator, not listed as slice checks
- **Blocked by**: only tickets that genuinely gate it, cross-spec ones by real number. A same-spec blocker clears when merged into the integration branch; another spec's only when `COMPLETED` after its main merge.
- **Bootstrap**: `kit-init | none`. Judge with bootstrap.md 판정 (`package.json`·`src/app/(app)/layout.tsx`·`src/server/db/schema.ts`): none of them and no existing `Bootstrap: kit-init` issue (open or closed) → the foundation gets `kit-init` plus its Init spec JSON (bootstrap.md §1); every other ticket `none`; name·title come from the grill handoff (missing → back to grill, don't interview here). The ticket's Checks name `K init --spec` (bootstrap.md §2); never plan init as copying or extracting kit files. Partial → stop and report, don't plan.
- **Model** (difficulty → `model / effort`), by its rows in `.claude/skills/moai-kit/references/scenarios.md`; take the highest tier that applies:
  | Tier | When | Model |
  |---|---|---|
  | easy | only `gen`, `예제` or `기존` rows; ≤4 ACs; no `db-schema`/`registry` token; no security AC | `haiku / max` |
  | normal | a `gen 후 수정` (overlap, capacity, concurrency) or `수동` (admin, settings) row; a hotspot token; a security AC (auth, RBAC, Origin); or 5+ ACs | `sonnet / high` |
  | hard | foundation ticket; or no row fits (new integration, AI, algorithm) | `opus / high` |

  Split a big ticket before upgrading it.

## 2. Plan ownership so parallel branches merge cleanly

Each frontier ticket runs in its own worktree and branch, and a merger merges them into `spec-<p>` one at a time. Merges are cheap when tickets own disjoint paths and expensive (or impossible, for migrations) when they don't, so plan that ownership by name.

**Hotspots** (`npm run gen` and `migrate` write all of them):

| Token | Files |
|---|---|
| `db-schema` | `src/server/db/schema.ts`, `drizzle/**` (numbered SQL + `meta/_journal.json` snapshot chain: two migrations made in parallel always conflict) |
| `registry` | `src/app/(app)/nav.ts`, `src/lib/permissions.ts` (+ `roles.ts`), `tests/e2e/samples.ts`, `scripts/db-seed.mts` |
| `deps` | `package.json`, lockfile |
| `ui-kit` | `src/components/ui/**`, `src/components/app/**` |

**Touches vocabulary.** `Touches` stays the coarse PC/domain marker, written only with these tokens plus `domain:<x>` = that domain's own dirs (`src/features/<x>/`, `src/app/(app)/<x>/`, `src/app/api/v1/<x>/`, `tests/e2e/<x>.*`, `tests/unit/<x>*`). `admin` = `src/app/admin/**`. Same token = overlap hint across PCs. Inside the spec, `Writes`/`Reads` decide what may run together.

- **Foundation = every hotspot, once.** One foundation ticket creates **every** entity in the prd data table, each the way the decision table in `.claude/skills/moai-kit/SKILL.md` (구현 절차 2) says: `gen` with fields, refs, enums, `--auth` for standalone entities; hand-written tables for child data (comments, likes) and admin masters. Name the choice per entity in the ticket. It migrates once, adds all permissions/roles, nav entries and seed data, any new dependency, and the common schema / service contract / fixtures later slices read. It's mostly generated code, so it's fast. Touches: `db-schema, registry, deps` + every `domain:<x>`. It blocks every other ticket. If a smaller prior base ticket is enough, use that; don't widen it. New repo → this foundation also runs `moai-kit init` first (`Bootstrap: kit-init`), so it exists even when the spec has a single slice, and a spec in a repo without the app never starts with a ticket that isn't it.
- **Slices own a behaviour, not a whole domain.** After foundation, a slice edits only its own `Writes`, never runs `gen` or `migrate`, and lists what it merely reads in `Reads` (another domain's service or API is a read, not a touch). The same domain is fine with disjoint `Writes`, e.g. a list screen and a cancel action with separate route, component and test files. A flow spanning two domains belongs to the domain whose state changes; if both change, split it into two slices joined by `Blocked by`.
- **Same file → serialise.** If a later slice must edit the same `service.ts`, schema, route file or fixture, chain it with `Blocked by`. Don't invent a facade or abstraction just to split a file.
- **Late schema change** (a column found missing mid-run): its own small ticket with `db-schema` in Touches. All such tickets share the token, so they serialise automatically. Never fold a schema change into a feature slice.
- **Solo wave**: a generator (`gen`), migration, `deps` / lockfile or global-typegen change, or a shared fixture each run alone (`/moai-work` never runs two tickets sharing a hotspot token at once).
- **Never in one wave**: `Writes` that overlap (same path, prefix, glob); one slice's `Writes` inside another's `Reads` or test inputs; a broad glob; missing or unclear `Writes`/`Reads`; a transitive dependency you can't confirm. Confirm transitive ones by reading the files' existing imports (no import analyzer); unsure → serialise.
- **Across PCs**: 역할 담당을 유지하되 다른 PC와 겹치는 티켓은 tracker 배정 계약에 따라 승인된 외부 `Blocked by`로 직렬화한다. 다른 spec은 `COMPLETED` 후 시작하며 토큰을 동시에 쓰게 하지 않는다.
- **Within the spec**: no per-domain ticket cap; the limits are behaviour and file ownership. If no independent slices exist, say so and run serially. Don't force parallelism.

Check before step 3: new repo → exactly one ticket (the foundation, first in publish order) has `Bootstrap: kit-init` + Init spec, and every other ticket is blocked by it. List every hotspot token in the plan. Any ticket other than foundation (or a dedicated `db-schema` ticket) holding one → move that work into foundation. Every AC is in exactly one ticket, every ticket has `Writes`/`Reads`/`Checks`, and no two tickets of one wave overlap.

## 3. Confirm once

담당·Source·충돌 blocker를 발행 전에 확인한다. 선택된 PC와 근거를 표 위에 표시하고 granularity·edges·PC를 한 번 확인한다. 누락 담당 또는 미승인 충돌이 있으면 §4–§5로 진행하지 않는다.

```
Spec → pc3 (<assignee login>) · MAINTENANCE_PC · Source: #n kind:improve
Bootstrap: kit-init on #1 (Init spec: name·title·choices) | none (app exists / reused #k)
| # | Title | Behaviour | Blocked by | Touches | Writes | Reads | Test/TDD seam | Model | Wave* |
```
*Wave = what will likely run in parallel on the frontier: unblocked slices with disjoint `Writes`/`Reads` and no solo trigger, at most `MAX_PARALLEL`. Mark solo waves (gen, migration, deps) explicitly.

Apply the user's edits (e.g. "→ pc3", "merge 4 and 5") and re-show only if the structure changed.

## 4. Gate G2 docs (before any issue exists)

Write the G2 docs with moai-docs plan mode: read `.claude/skills/moai-docs/references/modes/plan.md` (its G2 section), `references/lifecycle.md`, and only the `references/documents/` manuals of the docs you actually change. Gates: `PLAYBOOK.md` §7. This step only links approved requirements to tickets and tests; it doesn't run the full docs gate.

**Self-check, fix before committing:**
- Every AC: in exactly one ticket, ≥1 TC; prd AC-table TC cell = every e2e §2 id covering that AC (full ids) and FLOW cell = an experience `FLOW-NN` or `—`; `npm run lint:contracts` passes; every TC maps to an AC; ids unique and not clashing with existing ones.
- Every role in the permission table is in the brief; every prd entity and API appears in arch.
- `grep -nE "예시|\(예:|teamNN|○○" docs/prd.md docs/e2e-test.md docs/security-compliance.md docs/experience.md docs/arch.md docs/project-brief.md` and empty table rows in those files → none left (`미정` instead). Only these files: `docs/security-policy.md` is the organizer's original (never edit) and `docs/project-structure.md` is generated by the kit.

Commit and push only the related docs, within the approved git scope (`docs: G2 implementation plan·scenarios`). Keep uncommitted work; `git pull --ff-only` only on a clean tree. Approval of the docs is not approval to publish issues or push: ask for publish approval and don't run §5 before it.

## 5. Publish

1. If ≥2 tickets: create a parent issue titled per `docs/issue-format.md` (default `Spec: <요약>`), labelled `kind:spec` + `agent:<pc>` and that PC's assignee if filled (no status label; one ticket → no parent, `Parent: none`). Body: first line `Tickets: <N>` (the exact count; `/moai-work` waits for N children), next `Source:` from grill (`none`, `#n kind:bug|improve`, or `none kind:bug|improve`; multiple sources separated by `;`), then the `docs/issue-format.md` sections (default: 목적 = Problem + Solution, 완료 조건 = a checkbox per REQ, 담당자 / 연결 문서 = the PC and PRD link) plus `## Decisions` and `## Out of scope`. Create the parent **before** any ticket; a worker never starts a spec with fewer than N children. 단일 티켓에는 Parent 다음 Source를 쓰고 자식은 부모의 Source를 따른다.
2. Create tickets **in dependency order** (blockers first) so `Blocked by` can cite real numbers. Title per `docs/issue-format.md` (default `[REQ-01] <요약>`, several REQs `[REQ-25·26] …`). Labels: `status:ready` + the spec's `agent:<pc>` (+ `kind:bug` or `kind:improve` for one confirmed source kind; mixed kinds inherit Source, never two kind labels). Assignee: that PC's login from the `docs/agents/issue-tracker.md` ownership table, if filled.
3. Fill the Issue columns of the REQ and AC tables in `docs/prd.md` and 주요 Issue in the `docs/project-brief.md` 팀 역할 table (one row per PC: spec, issue numbers); add a `docs/development.md` 일정 기록 row (`G2 · REQ n / AC m / Issue k 발행`). Commit `docs: G2 link issues`, push.

Ticket body:

````
Parent: #<spec> | none
Source: #<report> kind:<bug|improve> | none kind:<bug|improve> | none  (Parent: none only)
REQ: REQ-01, REQ-02
Blocked by: #.. | none
Bootstrap: kit-init | none
Touches: ...
Writes: <exact owned paths, tests included>
Reads: <shared contracts read, not edited> | none
Checks: <narrow commands>
Test seam: ...
TDD seam: ...
Model: opus / high   (tier from step 1; always written)

<docs/issue-format.md sections. Default: 목적 = what to build (end-to-end behaviour, user's view),
 완료 조건 = - [ ] AC-01-1 ..., 담당 = agent:<pc> (login), 요구사항 = REQ ids, 구현·검증 근거 = keys only>

## Init spec          (Bootstrap: kit-init ticket only, the JSON confirmed in step 3)
```json
{ "version": 1, "name": "project-name", "title": "프로젝트명", "example": false, "choices": {}, "domains": [] }
```
````

**Re-run safe**: 새 생성 전에 기존 부모·단일 티켓의 본문·라벨·assignee와 원 접수의 승격 링크를 확인한다. 이미 발행된 Source·PC를 유지하며 빠진 티켓만 같은 PC로 생성한다. 현재 설정·override와 다르면 차이를 보고하고 기존 PC 유지에 대한 PC1 확인 전에는 멈춘다. 확인 후에는 기존 PC로 누락 티켓만 발행한다. 기존 자식의 PC·assignee가 불일치하면 보고 후 중단하며 승인된 Reassign으로 정합화하기 전에는 재개하지 않는다. Source 없는 이전 spec은 확인받되 기존 PC는 유지한다. 동일 제목·출처는 재사용하며 이미 승격된 접수로 새 spec을 만들지 않는다.

Issues are created once, here. Adding issues later lowers the progress rate, so get granularity right in step 3. If the plan changes mid-publish, fix `Tickets: N` in the parent body first (`gh issue edit <p> --body-file <f>`).
Before finishing, count the children (`Spec children` op in the tracker doc): they must equal N, or publish the missing ones (re-run safe) and count again.
접수 승격은 발행 개수·PC·Source 확인이 모두 끝난 뒤에만 승인된 tracker **Drop**으로 `[moai] promoted → spec #<p>`(단일 티켓이면 `issue #<n>`)를 남긴다. 원문은 지우지 않는다. 같은 접수를 단일 티켓으로 Triage했으면 닫지 않는다. 이미 승격됐으면 중복 종료·생성하지 않는다.
Finish with `spec #<p> → <pc>: #a, #b, … (N/N published)`.
