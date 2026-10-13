---
name: moai-work
description: Worker-PC orchestrator for one spec - read the task graph, explore into shared notes, create the spec integration branch, run background implementers each in its own worktree and branch on the frontier, merge each finished ticket with a merger subagent, refill the frontier, review the whole branch once (moai-review), fix in one implementer, then one verify + full E2E gate and one spec PR. Run via `pwsh scripts/moai-loop.ps1 <pc>`.
disable-model-invocation: true
---

Argument: this PC's id, a row of the `docs/agents/issue-tracker.md` ownership table (e.g. `pc2`). Missing → ask, never guess.
You are the **orchestrator**: you don't write feature code. Implementers write and commit tickets on their own branches, mergers merge them into the spec's **integration branch**, and you alone write to the tracker, push and run the final gate. Tracker ops, settings (`MAX_PARALLEL`, `EXPLORER_MODEL`, `IMPLEMENTER_MODEL`, `MERGER_MODEL`, `REVIEWER_MODEL`, `AUTO_MERGE`) and commands: `docs/agents/issue-tracker.md`. Document rules: `AGENTS.md`. A ticket with `Bootstrap: kit-init` (first init of a new repo) also follows `.claude/skills/moai-kit/references/bootstrap.md` §3.

The tickets are not a list of steps. They are a **task graph** with blocking relationships, so there is always a **frontier** of tickets ready to be grabbed. Communicate with subagents sparsely, through **context pointers** (the spec and ticket numbers, the notes directory, branch names and commits), never by pasting what they can read themselves. **Implementer subagents run in the background where possible** for maximum concurrency; react to their completion notifications, and never end the run while an implementer or merger you started is still live.

## 0. Sync and pick the spec

1. Main checkout: `git switch main && git pull --ff-only`. Uncommitted changes are OK: never `clean`/`stash`/`reset` them. If git refuses (would overwrite local changes, or not fast-forward), stop and report. List dirty files in the final summary.
2. Queue, **spec first** (tracker "specs for `<pc>`" and "spec children" ops):
   - **Spec sweep**: every open spec of `<pc>` with no open child → **Close spec** now.
   - **Current spec** = the one with resumable work (§1.3) first, otherwise the lowest-numbered published spec with an **unblocked frontier** child (§1.2). Skip a spec whose children are all blocked. Parentless issues of `<pc>` (`Parent: none`, e.g. `kind:bug`) run as a one-ticket graph (`spec-issue-<n>`) only when no spec of `<pc>` has resumable or unblocked work. Never bypass a blocker by initialising the app yourself.
   - **Publish check (before any claim)**: read the spec (`gh issue view <p> --comments`: `Tickets: N`, Problem, Solution, Decisions) and list its children. `/moai-spec` publishes the parent first and the tickets afterwards, so the spec may still be half published. **Published** = the children found equal `Tickets: N` **and** every `Parent:` / `Blocked by: #x` resolves to an existing issue. Fewer than N, or a dangling reference → claim nothing, reply `queue empty (<pc>) · spec #<p> publishing <k>/<N>` and stop: `scripts/moai-loop.ps1` waits and runs you again when the tracker changes (no sleep-polling inside the run). No `Tickets:` line, or more children than N → stop and report for a human. Work only from this published snapshot.
3. `AUTO_MERGE=no` and this PC already has an open spec PR whose `Touches` overlap the current spec → wait.
4. Nothing to do → reply `queue empty (<pc>)` and stop. `scripts/moai-loop.ps1` (or `moai-loop.sh`) runs you again (it matches that exact text).

## 1. Read the spec and tickets (the task graph)

1. Read the spec once, then every child's body and comments. Each ticket needs acceptance criteria, an approved `TDD seam` (or an explicitly approved `Test seam`), `Blocked by` and `Touches`; `Writes`/`Reads`/`Checks` are the plan that keeps merges small. Missing or contradicting the spec → **give up** on that ticket (don't claim it); never choose a seam yourself.
2. **Frontier** = open children not yet merged whose same-spec blockers are **merged** (their `issue-<n>` commit is an ancestor of `spec-<p>`: `git merge-base --is-ancestor`) and whose other-spec blockers are `COMPLETED`. A `NOT_PLANNED` blocker → give up the dependent until the user approves a scope change. Never unblock from a comment alone. Two frontier tickets that share a hotspot token (`db-schema`, `registry`, `deps`) never run at the same time (their generated files and migrations always conflict): start the lower number, the other waits.
3. **Resume** (`status:in-progress` children may be interrupted work or intentional PR waits): read the last `[moai]` phase of each child and the spec, fetch, and look at `spec-<p>`, `issue-<n>` (local and origin), the draft PR and `git worktree list --porcelain`. A worktree locked by a live process, or an unclear owner → stop and report; never start a second writer on a ticket. `merged` with a valid ancestor → skip. `implemented` (branch has the work) → go straight to the merger (§5). A dead implementer's worktree → `pwsh <CLEANER> <path>` (from the main checkout) commits its leftovers as `wip: resume (#<n>)` on `issue-<n>`; restart the implementer with the resume line. `CLEANER` = absolute path of `scripts/moai-worktree-clean.ps1` in main (before the first init lands: bootstrap.md §3). Without `pwsh` (macOS/Linux) run `bash <main>/scripts/moai-worktree-clean.sh` with the same arguments instead. Review, gate and PR phases resume at §6–§8.

Print the whole graph in one table so the DAG is visible: `# | title | Blocked by | Touches | Model | merged/frontier/blocked/needs-human`.

## 2. Explore once into shared notes (optional)

If the tickets need codebase or external-doc exploration, spawn one `moai-explorer` (`subagent_type: "moai-explorer"`, model/effort from its definition = `EXPLORER_MODEL`) before the first implementer. It saves markdown notes (conclusions with `file_path:line`, one file per topic) in `NOTES=<abs git common dir>/moai-notes/spec-<p>/` (`git rev-parse --path-format=absolute --git-common-dir`): outside the working tree, and shared by every worktree of this repo. Every later subagent gets `NOTES` as a pointer, so implementers implement instead of exploring. Existing notes (resume) are reused, not regenerated. Don't read source files yourself.

## 3. Create the integration branch

Create the integration branch once from fetched `origin/main` in its own worktree, used only by mergers and the final gate: `git worktree add -b spec-<p> <abs repo>/.claude/worktrees/spec-<p> origin/main` (parentless `spec-issue-<n>`), or add the existing local/origin `spec-<p>` without resetting it. Run the install command there (no `package.json` yet → bootstrap.md §3). Record `SPEC_BASE` = the commit it started from.

The tracker closes work through PRs, so after the **first merge** (§5) open a **draft** PR `spec-<p>` → main (tracker "Open MR" op with `--draft`) whose body closes the spec and every child (`Closes #<p>`, `Closes #<n>` …). A branch with no commits ahead of main can't open one.

## 4. Implement the frontier (background, one worktree per ticket)

For each frontier ticket, up to `MAX_PARALLEL` implementers live at once: **Claim** it (claim comment: run id, `spec-<p>@<sha>`, slot, branch `issue-<n>`), then spawn one implementer with `subagent_type: "moai-implementer"` and `isolation: "worktree"`, in the background (model/effort from its definition = `IMPLEMENTER_MODEL`; a ticket's `Model: <model> / <effort>` header overrides via the Agent `model` / `effort` params, a missing half falls back). Its procedure is its agent definition; send pointers only:

```
Issue #<n>.
INTEGRATION=spec-<p>  NOTES=<abs notes dir>  SLOT=<1..MAX_PARALLEL>  (PORT = 3100 + SLOT)
<resume: branch issue-<n> already exists (local or origin); continue from it>
```

You are the only one who writes to the tracker: post each ticket's `[moai]` phase as soon as it is reached (`implemented`, `merged`, `gate-failed`, `pr`, `gave up`). The `implemented` comment copies the implementer's `changes:` bullets and AC lines, so a human sees what was built without opening the diff.

- `DONE` whose `tdd:` lines lack a real RED and GREEN command/result per behaviour (or claim PASS for a test that only was written) → SendMessage the implementer to run them and report again; don't merge it yet.
- Implementer `BLOCKED` → **give up**, with its reason as the comment.
- **Haiku escalation**: a `haiku` implementer that reports `BLOCKED` or fails its merge twice → one fresh `moai-implementer` on `IMPLEMENTER_MODEL` (no override) with the resume line, before giving up. Note `escalated haiku → <model>` in the next phase comment.

## 5. Merge each finished ticket, then refill the frontier

1. When an implementer reports `DONE`, post `implemented`, then spawn one merger (`subagent_type: "moai-merger"`, model/effort from its definition = `MERGER_MODEL`): `Merge issue-<n> into spec-<p>. INTEGRATION_WORKTREE=<abs path> CHECKS=<the ticket's Checks> INSTALL=<install command when the ticket touches deps, otherwise none>`. Mergers write the integration worktree, so **one merger at a time**; queue the others in completion order.
2. `MERGED <sha>` → push `spec-<p>` (`git -C <integration worktree> push -u origin spec-<p>`), post `merged`, and after the first merge open the draft PR (§3). `FAILED` (conflict it can't resolve, or checks red after the merge) → SendMessage that implementer to merge the new `spec-<p>` tip into `issue-<n>` and report again, then one more merger; a second failure → **give up**.
3. A merge changes the **frontier**: recompute it (§1.2) and immediately start implementers for newly ready tickets (§4), so implementation and merging overlap.

Keep going until every in-scope child is merged. A stuck child (needs-human) prevents shipping the spec; never silently drop it. Scope reduction needs explicit user approval and tracker updates.

## 6. Review the whole branch once, fix in one implementer

1. Only when every in-scope child is merged: call the Skill tool with `moai-review` on the integration branch — fixed point `SPEC_BASE`, head `spec-<p>@<sha>` (pinned), spec `#<p>`. It runs the Standards and Spec axes as parallel subagents and returns both reports. Post them on the **spec issue** as one `[moai] review` comment. Tickets are never reviewed one by one.
2. Any finding → fix **all** of them in a single implementer: one `moai-implementer` (`isolation: "worktree"`) with `Review-fix mode for spec #<p>. INTEGRATION=spec-<p> NOTES=<dir> FINDINGS=<spec issue comment url> BRANCH=review-fix-<p>`. Then the merger merges `review-fix-<p>` (§5). Post `[moai] review fixed` on the spec issue with the merge SHA and, per finding, fixed or skipped-with-reason. No findings → say so in the same comment. The review runs once; the final gate is what catches a regression from the fix.

## 7. Final gate (verify + one full E2E)

1. A merger merges the latest `origin/main` into `spec-<p>` (`Merge main into spec-<p>. INTEGRATION_WORKTREE=<abs> CHECKS=npm run typecheck`); record `MAIN_SHA`. Freeze `SOURCE_SHA` = that merge commit and its source hash (use the input set of `scripts/lib/e2e.mts` and the runner manifest; never invent a hash rule or read `.env`).
2. In the integration worktree run `npm run verify`, `npm run test:unit:evidence` (unit result line), then **one full isolated E2E** (`node .claude/skills/moai-kit/scripts/kit.mjs e2e`, no file filters), once per spec, not once per ticket. Record commands, exits/counts, main/source SHA. Commit and push the evidence: `docs/evidence/unit-<time>.md`, the full E2E's `docs/evidence/<runId>.md` (failed gate runs included, `latest.md` excluded) and screenshots. These files are the history source of `docs/e2e-test.md`. An evidence-only commit keeps the source hash; any other change after the gate means verify + full E2E again.
3. Fail → post `gate-failed` (command, test, reason, source SHA) on the affected children, delegate the fix to one `moai-implementer` (`Gate-fix mode for spec #<p>. INTEGRATION=spec-<p> NOTES=<dir> FAILING=<command · test> BRANCH=gate-fix-<p>`), merge it (§5), and rerun the gate. An unchanged failing source is not a fresh attempt. Persistent failure → needs-human; preserve all branches and worktrees; never ship a partial spec. An unrecorded result is 미검증.

## 8. Mark the PR ready and close the work

1. Re-fetch main and the PR head/base. Main moved since the gate → back to §7.1. Update the draft PR body: `Closes #<n>` for **every included child** and the spec, REQ, per-child AC→TC table, RED/GREEN evidence, verify/full-E2E source/main/results, the review findings and their fixes, security touched, and screenshot links to the pushed evidence. Then `gh pr ready <m>` and post `pr` on every child.
2. `AUTO_MERGE=no` → leave the PR open and the children IN_PROGRESS, finish with `queue empty (<pc>)` plus the waiting PR. A later run reads the actual PR state: unchanged open → wait; merged → Done; head/base/main changed → §7; closed unmerged → human decision.
3. `AUTO_MERGE=yes` → merge only the tested head (`gh pr merge <m> --merge --match-head-commit <head>`), confirm the actual `MERGED` state and that fetched main contains the merge commit, then **Done** each included child and **Close spec**. No Done before the actual merge.

## 9. Clean up

- Free every implementer worktree once its branch is merged: `pwsh <CLEANER> <path> …` from the main checkout (§1.3; also sweeps dead `agent-*` worktrees). Report `kept <path>` for anything it keeps.
- The integration worktree stays until the spec PR is actually merged and Done; then `git worktree remove <path>` (no force). Delete `issue-<n>`, `review-fix-<p>`, `gate-fix-<p>` and `spec-<p>` branches (local and remote) only after that merge; never delete an unmerged branch.
- Summarize: spec PR merged / open PR waiting / needs-human, ticket numbers, kept paths and dirty main files.

**Give up** = tracker op with reason; it blocks shipping the spec. PR-wait children intentionally remain `status:in-progress` across runs.
