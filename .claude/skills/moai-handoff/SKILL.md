---
name: moai-handoff
description: 현재 대화를 새 세션이 이어받을 수 있게 인수인계 문서 하나로 요약해 OS 임시 폴더에 저장한다. 로컬 전용 — GitHub(이슈·댓글·PR)·레포·메모리에는 읽지도 쓰지도 않는다. `/clear` 전이나 작업 중단 때 사용.
argument-hint: "[다음 세션의 초점 한 줄]"
disable-model-invocation: true
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to the temporary directory of the user's OS (`$TMPDIR`·`%TEMP%`) - not the current workspace. File name: `moai-handoff-<YYYYMMDD-HHmm>-<slug>.md`.

**Local only**: never call `gh` or any GitHub/remote operation, and never write to the repo, `docs/`, issues, comments or memory. Local `git status`/`git log` reads are fine.

Include a "suggested skills" section in the document, naming which skills the next agent should call the Skill tool for.

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path, issue number or SHA instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information (`<REDACTED>`; demo accounts by role only).

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.

Finish by printing the saved path and one line to start the next session: `<path> 를 읽고 이어서 진행해줘`.
