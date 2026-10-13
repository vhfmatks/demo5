---
name: moai-review
description: "This repo's two-axis review (use it instead of the generic code-review here): Standards — this repo's documented standards and the organizer security policy (docs/security-policy.md) — and Spec — the originating issue/spec, PRD AC and TC plan — on the diff since a fixed point, as parallel moai-reviewer sub-agents. /moai-work runs it once per spec integration branch; also use it to review a branch, PR or work-in-progress here."
---

Two-axis review of the diff between `HEAD` and a fixed point the user supplies:

- **Standards**: does the code conform to this repo's documented coding standards?
- **Spec**: does the code faithfully implement the originating issue / spec?

Both axes run as **parallel sub-agents** so they don't pollute each other's context, then this skill aggregates their findings.

The issue tracker is `docs/agents/issue-tracker.md` (GitHub via `gh`).

## Process

### 1. Pin the fixed point

Whatever the caller said is the fixed point (a commit SHA, branch name, tag, `main`, `HEAD~5`, etc.). `/moai-work` passes `SPEC_BASE` and a pinned head `spec-<p>@<sha>`: use that SHA instead of `HEAD`, so a merge landing meanwhile can't change what is reviewed. If no fixed point was given, ask for it.

Capture the diff command once: `git diff <fixed-point>...<head>` (three-dot, so the comparison is against the merge-base). Also note the list of commits via `git log <fixed-point>..<head> --oneline`.

Before going further, confirm the fixed point resolves (`git rev-parse <fixed-point>`) and the diff is non-empty. A bad ref or empty diff should fail here, not inside two parallel sub-agents.

### 2. Identify the spec source

Look for the originating spec, in this order:

1. Issue references in the commit messages (`#123`, `Closes #45`, `Refs #45`) and the spec issue `/moai-work` passed, fetched via the tracker doc (`gh issue view <n> --comments`), with each child's acceptance criteria and its `Parent:` spec.
2. A path the caller passed as an argument.
3. A spec file under `docs/` (`docs/prd.md` REQ·AC, `docs/e2e-test.md` §2 TC plan), `specs/`, or `.scratch/` matching the branch name or feature.
4. If nothing is found, ask the user where the spec is. If they say there isn't one, the **Spec** sub-agent will skip and report "no spec available". (`/moai-work` always has one.)

### 3. Identify the standards sources

Search the repo for every file that documents how code should be written. When `CODING_STANDARDS.md` or `CONTRIBUTING.md` exists, it must be on the list. In this repo that is at least `CLAUDE.md`, `AGENTS.md`, `docs/conventions/*.md`, `docs/design-system/README.md`, `GLOSSARY.md` if present, and **`docs/security-policy.md`** (the organizer's policy: `CLAUDE.md` makes a violation review-BLOCKING, so a breach is always a hard violation citing its SEC number).

The Standards reviewer also applies a fixed **smell baseline** (Fowler code smells) defined in `.claude/agents/moai-reviewer.md`; a documented repo standard overrides it, and every smell is a judgement call.

### 4. Spawn both sub-agents in parallel

Issue both sub-agent calls together, in the foreground, with `subagent_type: "moai-reviewer"` (read-only; model/effort from its definition = `REVIEWER_MODEL`), and aggregate the reports they return.

**Standards sub-agent prompt** should include:

- The full diff command and commit list.
- The list of standards-source files you found in step 3.
- The brief: "Report, per file/hunk where relevant, (a) every place the diff violates a documented standard: cite the standard (file + the rule); and (b) any baseline smell you spot: name it and quote the hunk. Distinguish hard violations from judgement calls: documented-standard breaches can be hard, but baseline smells are always judgement calls, and a documented repo standard overrides the baseline. Skip anything tooling enforces. Under 400 words."

**Spec sub-agent prompt** should include:

- The diff command and commit list.
- The path or fetched contents of the spec.
- The brief: "Report: (a) requirements the spec asked for that are missing or partial; (b) behaviour in the diff that wasn't asked for (scope creep); (c) requirements that look implemented but where the implementation looks wrong. Quote the spec line for each finding. Under 400 words."

If the spec is missing, skip the Spec sub-agent and note this in the final report.

### 5. Aggregate

Present the two reports under `## Standards` and `## Spec` headings, verbatim or lightly cleaned. Do **not** merge or rerank findings, because the two axes are deliberately separate (see _Why two axes_).

End with a one-line summary: total findings per axis, and the worst issue _within each axis_ (if any). Don't pick a single winner across axes: that's the reranking the separation exists to prevent.

## Why two axes

A change can pass one axis and fail the other:

- Code that follows every standard but implements the wrong thing → **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions → **Spec pass, Standards fail.**

Reporting them separately stops one axis from masking the other.
