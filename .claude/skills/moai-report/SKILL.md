---
name: moai-report
description: QA(또는 누구나)가 발견한 버그·개선요청을 중복 확인 후 `status:triage` + `kind:bug|kind:improve` 이슈 하나로 접수한다. 재현·원인 분석·수정·담당 배정은 하지 않는다(PC1 triage 몫). "버그 등록", "개선 요청", "report" 라고 할 때 사용.
argument-hint: "[bug|improve] [증상 또는 요청 한 줄]"
disable-model-invocation: true
---

Goal: PC1이 분류(`/moai-diagnose` 또는 `/moai-spec`)할 수 있을 만큼 정확한 접수 이슈 하나. 라벨·전이 규칙은 `docs/agents/issue-tracker.md`의 Labels·State machine·**Report** op가 소유한다. 코드를 고치거나 실행하지 않는다.

**비밀값·개인정보 금지**: 비밀번호·토큰·쿠키·실제 개인정보는 적지 않는다(`<REDACTED>`). 계정은 역할로만 적는다(user, approver, auditor, admin).

**묻는 방법** (`/moai-grill`과 같다): 사용자의 첫 설명·`docs/prd.md`·`git`으로 정할 수 없는 것만 묻는다. 받은 답은 다시 묻지 않는다.
- 선택형 항목은 `AskUserQuestion` 한 라운드에 모은다(최대 4문항, 개수를 채우려 하지 않음). `header` 12자 이하, 선택지 2–4개, 추천안을 첫째에 두고 라벨 끝에 ` (Recommended)`. "Other"는 자동으로 붙으니 넣지 않는다.
- 자유 서술(위치·재현 절차·기대/실제·근거)은 선택지로 만들지 않는다. 빠진 것만 채팅 한 번에 모아 요청한다.
- 앞 답에 따라 달라지는 질문(예: bug일 때만 심각도)은 다음 라운드로 미룬다.

## 1. 분류

- `kind:bug`: REQ/AC와 다른 동작. 오류 응답, 권한 위반(보여선 안 되는 데이터, 막혀야 할 행위), 잘못 저장·표시된 데이터, 깨진 화면. 보안 관련이면 항상 bug.
- `kind:improve`: AC는 충족하지만 사용성·문구·속도·흐름을 바꾸자는 요청.
- 첫 설명으로 판단이 안 서면 묻는다(`header` "분류": 버그 / 개선요청). 닫힌 이슈가 고친 동작이 다시 깨졌으면 bug + `Regression of: #<n>`.

## 2. 수집 (빠진 것만 묻는다)

자유 서술 (채팅 한 번):
- 위치: 화면 경로 또는 API(`POST /api/v1/...`)
- 재현 절차: 번호 매긴 단계
- 기대 결과 vs 실제 결과 (improve는 현재 vs 제안)
- 근거: 오류 응답의 `error.code`·`traceId`, 스크린샷 파일 경로

선택형 (`AskUserQuestion`):
- 심각도 (`header` "심각도"): 차단(핵심 흐름 불가·보안) / 높음 / 보통 / 낮음. 추천안은 증상으로 고른다. `priority:hotfix`는 붙이지 않는다(PC1이 triage에서 결정)
- 계정 역할 (`header` "계정"): 데모 계정 역할 중 2–4개. `multiSelect: true`(권한 차이 버그는 여러 역할)
- REQ (`header` "관련 REQ"): `docs/prd.md`에서 위치와 맞는 후보 REQ 최대 3개 + `모름`. 후보가 하나뿐이고 확실하면 묻지 않는다

묻지 않음: 환경은 `git rev-parse --abbrev-ref HEAD`·`git rev-parse --short HEAD`로 채운다. 배포 URL에서 본 것이면 자유 서술에서 받는다.

## 3. 중복 확인

`gh issue list --state open --search "<핵심 단어>" --json number,title,labels,body` 로 `kind:bug`·`kind:improve` 열린 이슈를 본다. 증상이 같아 보이는 후보(같은 화면·같은 오류 code)가 있으면 `AskUserQuestion`(`header` "중복"): 후보마다 `#<m>에 댓글` (가장 유력한 것에 ` (Recommended)`, `preview`에 그 이슈 제목·위치·증상) + `새 이슈로 등록`. 댓글을 고르면 새 근거를 그 이슈에 댓글로 달고 번호를 알려 준 뒤 멈춘다. 후보가 없으면 묻지 않는다.

## 4. 등록

본문을 임시 파일에 쓰고 tracker **Report** 인자에 `--check`를 붙여 형식을 통과시킨 뒤, 만들기 전에 `AskUserQuestion`(`header` "등록 확인")으로 확인받는다: `등록 (Recommended)` 선택지의 `preview`에 제목·라벨·본문 전체, `수정`. 수정이면 고칠 곳을 받아 반영하고 다시 확인한다. 확인되면 tracker의 **Report** op로 이슈 하나를 만든다. 제목은 `docs/issue-format.md` 형식이다(기본 `[bug] <화면/API>: <증상>` 또는 `[improve] <화면/API>: <요청>`). 라벨은 `status:triage` + `kind:<bug|improve>`만 붙인다. `agent:*`·assignee는 붙이지 않는다.

```
Regression of: #<n> | none
REQ: <REQ-xx | 모름>
심각도: <차단 | 높음 | 보통 | 낮음>
환경: <branch@sha 또는 URL> · 계정 역할: <user | approver | ...>

<docs/issue-format.md 절. 기본: 목적 = 증상·요청 한 줄, 완료 조건 = 기대 결과(improve: 제안) 체크박스,
 담당 = 미배정 (PC1 triage), 요구사항 = 위 REQ, 구현·검증 근거 = 키만. 아래 접수 절은 목적 다음에 둔다>

## 위치
<화면 경로 또는 API>

## 재현 절차
1. ...

## 기대 결과 (improve: 제안)
...

## 실제 결과 (improve: 현재)
...

## 근거
error.code·traceId·스크린샷 경로
```

## 5. 보고

이슈 URL 한 줄과 다음 단계 한 줄: "PC1 triage 대기 (bug → `/moai-diagnose`, improve → `/moai-spec` 또는 `/moai-grill`)".
