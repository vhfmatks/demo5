---
name: moai-diagnose
description: Pin down a bug with a red-capable repro and a ranked cause, then publish it as a bug issue for a worker PC. PC1 only. Use when the user says "diagnose" or reports something broken.
disable-model-invocation: true
---

Goal: a bug issue precise enough for an AFK agent to fix. The agent implements the fix on a worker PC, not here, unless the user says "fix it here".

**Redact secrets** in every command and output you show (`<REDACTED>`). Keep credentials in env vars.

## 1. Build a feedback loop (most of the effort goes here)

Get **one command** that goes red on *this* symptom. In order of preference: failing test at a public seam → curl/HTTP script against the dev server → CLI with fixture diffed against expected → Playwright script → replayed captured payload → throwaway harness.

Done when you have run it and shown the output, and it is:
- red on the user's exact symptom (not "didn't crash")
- deterministic (flaky bugs: loop it until the repro rate is high)
- seconds, not minutes

No command, no hypotheses. If you can't build one, say what you tried and ask the user for access, a log, or a HAR.

## 2. Minimise

Cut inputs, steps and config one at a time, re-running after each cut, until every remaining element is load-bearing.

## 3. Hypothesise

Write down 2–4 ranked, falsifiable hypotheses: "If X is the cause, changing Y makes it go green." Show them to the user. If a cheap probe confirms the top one, run it: tag debug logs with `[DEBUG-xxxx]` and delete them afterwards (grep the tag).

## 4. Publish

**Duplicate check first**: `gh issue list --state open --label kind:bug --json number,title,body`. 현재 진단의 원 접수 번호는 중복 후보에서 제외한다. Same symptom or same failing AC/TC as another open bug → add this repro and evidence as a comment there, tell the user the number, and stop.

Otherwise fill the header below (field meanings: `docs/agents/issue-tracker.md`; the `Model` tier table: `.claude/skills/moai-spec/SKILL.md` §1). 배정은 tracker **Area ownership**의 `MAINTENANCE_PC`를 사용한다. 접수 Issue가 있으면 `Source: #<n> kind:bug`, 직접 진단이면 `Source: none kind:bug`로 보존한다. Create 전에 누락 담당·Touches 충돌을 해결하고 본문·PC·assignee·blocker를 PC1에게 확인받는다. 승인 없이는 발행하지 않는다. Publish **one** issue with the tracker **Create** op, titled per `docs/issue-format.md` (default `[bug] <화면/API>: <증상>`), labels `kind:bug` + `status:ready` + `agent:<pc>` (without the last two no worker picks it up):

```
Parent: none
Source: #<report> kind:bug | none kind:bug
REQ: <REQ id of the broken behaviour, or none>
Blocked by: #<external blocker> | none
Touches: ...
Writes: <exact paths the fix and its regression test edit>
Reads: <shared contracts read, not edited> | none
Checks: <narrow commands>
Test seam: <where the regression test belongs>
Model: <model / effort tier from /moai-spec §1>

<docs/issue-format.md sections. Default: 목적 = symptom (exact, redacted), 완료 조건 = the two checkboxes below,
 담당 = agent:<pc> (login), 요구사항 = the REQ or none, 구현·검증 근거 = keys only; Repro and Likely cause go after 목적>

## Repro
<the command> → current output vs expected

## Likely cause
<top hypothesis + evidence; other hypotheses ruled out>

- [ ] Repro command goes green
- [ ] Regression test at the test seam fails before the fix, passes after
```

If no seam can catch it, say so in the issue. That is a finding in its own right.
