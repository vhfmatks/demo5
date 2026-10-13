---
name: moai-docs
description: 팀 관리 문서 8종의 작성·REQ→AC→단위/E2E TC→실제 결과·재시험 라이프사이클 매뉴얼. 대상 문서·plan/arch/sync/audit/freeze/final에 필요한 참조만 점진적으로 읽는다. setup·grill·spec의 문서 작성에도 이 인덱스를 사용한다. PC1만 실제 본문을 갱신하며 주최 측 보안 정책 원문은 수정하지 않는다.
disable-model-invocation: true
argument-hint: "plan | arch | sync | audit | freeze | final [문서 경로 | REQ-xx | Issue/PR | 변경 범위]"
---

# 프로젝트 문서 작성·라이프사이클 매뉴얼

팀 관리 8종 = README + docs의 brief·PRD·arch·experience·development·security-compliance·e2e-test. `docs/security-policy.md`는 별도의 주최 측 원본이다. 문서별 목적·필수 내용·경계·레이아웃은 아래 `references/documents/`가 단일 원본이다. `AGENTS.md`에는 최우선 관리·안전 원칙과 이 스킬 사용 안내만 둔다. 게이트는 `PLAYBOOK.md` §7–§8, Issue 운영은 `docs/agents/issue-tracker.md`를 필요한 절만 읽는다.

## 공통 실행 원칙

- 실제 본문은 PC1이 갱신한다. moai-grill은 요구·AC, moai-spec은 승인된 Issue·시험 계획 연결을 소유한다. 워커는 결과·SHA·문서 영향을 보고하고 요구를 재정의하지 않는다. 승인된 최초 kit init의 기본 문서 틀 신규 생성·PLAYBOOK 계약 링크 정합만 AGENTS의 한정 예외를 따른다.
- 근거 없는 값은 미정·미실행·미검증·예상·미측정으로 남긴다. 주최 측 원본은 생성·수정하지 않는다. 합성 데이터만 쓰고 비밀값·개인정보를 문서·AI 기록·로그에 넣지 않는다.
- 영향 문서만 부분 수정하고 기존 ID·결정·실행 이력·자동 마커를 보존한다. 상세는 소유 문서, 긴 로그·화면은 `docs/evidence/`에 두고 나머지는 링크한다. 같은 실행·PR 기록은 중복 추가하지 않는다.
- AC 상태는 `미실행 → 구현(PR #m) → 검증(<sha7>) | 실패 | 미검증 | 미구현`, 실행 결과는 PASS/FAIL/SKIP로 구분한다. 모든 필수 TC·경계의 실제 근거가 있어야 검증한다. 단위 PASS·과거 결과·PR 머지·HTTP 200·파일 존재로 전체 E2E·AC 검증을 대신하지 않는다. 변경 후 영향 항목은 미검증으로 돌려 재시험한다.
- `git status --short`로 미커밋 변경을 확인·보존한다. 자동 switch·pull·stash·reset·rebase하지 않는다. 커밋·push·태그·Issue 발행/종료는 명시적 승인 범위에서만 한다.

## 점진적 로딩

1. 요청에서 **모드·대상 문서·변경 범위**를 고른다. 인자가 없으면 `audit`으로 읽기 전용 연결 감사를 한다. 이미 받은 범위를 다시 묻지 않는다.
2. 모드를 실행할 때만 아래 모드 파일 **하나**를 읽는다. 대상 문서만 지정되면 문서 매뉴얼만 선택한다. 다른 스킬에서 작성 매뉴얼만 참조한다면 모드 실행을 시작하지 않는다.
3. 문서 작성·레이아웃 대조는 해당 문서 매뉴얼 **하나**부터 읽는다. 관련 사실·링크만 확인할 때 다른 문서 매뉴얼까지 읽지 않는다.
4. REQ·AC·TC 연결·상태 판정·변경 영향·재시험에는 [라이프사이클](references/lifecycle.md)을 추가한다. 레이아웃·문서 틀만 정리할 때는 생략한다.
5. 작업 중 새 영향이 확인되면 그 문서·모드 참조만 추가한다. **필요한 파일만** 읽고 이미 읽은 파일은 변경되지 않았다면 재로딩하지 않는다. 전체 매뉴얼·폴더를 한 번에 읽지 않는다. 최종 제출도 문서마다 순차 확인한다.

## 모드 선택

| 모드 | 읽을 절차 | 범위 |
|---|---|---|
| plan | [plan](references/modes/plan.md) | 구현 전·범위 변경의 문서·AC/TC 계획 |
| arch | [arch](references/modes/arch.md) | 실제 설계·코드·배포 대조 |
| sync | [sync](references/modes/sync.md) | PR·실행 근거의 영향 문서 반영 |
| audit | [audit](references/modes/audit.md) | 읽기 전용 누락·추적성 감사 |
| freeze | [freeze](references/modes/freeze.md) | 범위 동결·실제 제공 범위·관찰 가치 |
| final | [final](references/modes/final.md) | 최종 시험 C → 문서·근거 D → 승인된 제출 |

## 문서별 매뉴얼 선택

새 문서는 **제공된 문서 레이아웃**의 제목 → 질문·작성 시점 → 본문 항목 → 상태·근거로 배치한다. 사실 없는 예시 행은 채우지 않는다. 기존 문서는 빠진 부분만 보완하고 전체를 재작성하지 않는다. 표 열·시나리오 상세는 아래 필요한 참조에만 있다.

| 대상 문서 | 읽을 매뉴얼 |
|---|---|
| `README.md` | [readme](references/documents/readme.md) |
| `docs/project-brief.md` | [project-brief](references/documents/project-brief.md) |
| `docs/prd.md` | [prd](references/documents/prd.md) |
| `docs/arch.md` | [arch](references/documents/arch.md) |
| `docs/experience.md` | [experience](references/documents/experience.md) |
| `docs/development.md` | [development](references/documents/development.md) |
| `docs/security-policy.md` | [원문 보존만](references/documents/security-policy.md) |
| `docs/security-compliance.md` | [security-compliance](references/documents/security-compliance.md) |
| `docs/e2e-test.md` | [e2e-test](references/documents/e2e-test.md) |

예: README 레이아웃 → readme만. grill의 요구 작성 → brief·prd + 라이프사이클. TC 계획 → e2e-test + 라이프사이클. 명시적 `sync REQ-xx` → sync + 라이프사이클을 읽고 실제 영향 문서만 추가한다. 기본 틀 준비도 빠진 문서별로 하나씩 처리한다.
