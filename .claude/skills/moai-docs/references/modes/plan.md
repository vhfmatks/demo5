# 구현 전 문서·추적 계획

## plan (G1–G2, 구현 전·범위 변경 시)

REQ·AC·FLOW·TC 연결을 다루면 [라이프사이클](../lifecycle.md)을 읽는다. 문서 틀만 준비한다면 읽지 않는다. 아래 절차에서 실제 작성·변경할 문서의 `../documents/<문서>.md`만 한 번에 하나씩 로드한다.

1. 관련 brief·PRD·GLOSSARY·정책과 기존 Issue·TC 계획을 읽는다. REQ·AC가 없거나 권한·거부·저장 조건이 미정이면 해당 항목만 grill로 돌린다. 이 스킬에서 새 요구를 추정하지 않는다.
2. 확인된 AC별 FLOW·공개 경계·정상/오류/권한/재조회 시나리오·예상 결과·TC·자동화 위치를 대조한다. 새로운 Issue·TC 배정 또는 seam 변경은 spec의 승인 절차로 처리한다. 승인된 계획만 반영하며 기존 연결·실행 이력을 초기화하지 않는다.
3. 구현 전인 흐름은 experience에 계획, arch에는 초안, SEC에는 적용·검증 계획으로 적는다. README 실행 안내와 development의 팀 역할·AI 사용 방식을 준비한다. 실제 시험 없이 검증으로 올리지 않는다.
4. 누락·변경한 REQ/AC·TC·문서와 이유, 아직 결정되지 않은 사항만 보고한다. 이 모드는 시험·설치·Issue 발행·커밋·push를 자동 실행하지 않는다.

## G2 (moai-spec이 티켓 계획 직후 호출)

입력만 쓴다: brief(G1)·GLOSSARY·PRD·`docs/security-policy.md`·확인된 티켓 계획·대화. 근거 없는 값은 `미정`, 상태는 `미실행`(TC·SEC)·`예상`(효과). GLOSSARY 용어를 그대로 쓴다.

- **초기화 전**: 앱·tests·conventions가 아직 없으면 부재를 실패로 보지 않는다. `.claude/skills/moai-kit/references/examples/docs/conventions/`와 생성 계획으로 경로·TC를 계획한다. 시험 검색과 `npm run e2e:dashboard`는 해당 경로·스크립트가 있을 때만 실행하고, 아직 실행하지 않은 앱 명령을 README·development에 검증으로 쓰지 않는다.
- **kit 잔여물 정리**: 실제 요구·실행 이력은 지우지 않는다. `예시`·`kit 대응 예시` 행, 예제 도메인 행(요청·승인, 공개 메모, 회의실 예약 …), 이 레포에 없는 템플릿 TC ID·evidence 링크를 지운다(TC ID는 `tests/e2e` Grep, evidence는 Glob으로 확인). 존재하는 공통 TC(AUTH, HTTP, RBAC, ADMIN)는 `공통`으로 남긴다. e2e §2의 `예시` 행은 그 시험 파일을 함께 지울 때만 지운다(남으면 `npm run lint:contracts`가 실패한다).
- **prd**: grill의 REQ·AC·권한·데이터는 재작성하지 않는다. AC별 연결·판정 표의 FLOW·TC와 발행 후 Issue/PR 연결만 보완한다([prd](../documents/prd.md)). 끝나면 `npm run lint:contracts`(스크립트가 있을 때).
- **e2e-test**: §2에 AC마다 TC를 계획한다([e2e-test](../documents/e2e-test.md) "시험 계획과 결과 연결"). §1 명령은 유지하고 §3은 `미실행 — G6에서 기록`(kit 실행은 이 프로젝트의 근거가 아니다), §4는 일반 규칙만 남긴다. 끝나면 `npm run e2e:dashboard`.
- **security-compliance**: [security-compliance](../documents/security-compliance.md)의 "G2 계획" 절.
- **experience**: [experience](../documents/experience.md)의 표 열을 그대로 쓴다. brief의 사용자 흐름마다 흐름 표 한 행(새 `FLOW-NN`, 관련 REQ·AC, 사용자, 단계 순서·계획 화면 경로, 예상 화면·저장 결과, 계획 TC, 근거·상태 `미실행`)을 쓰고 PRD AC 표의 FLOW 열에 연결한다(흐름 없는 서버 규칙 AC는 `—`). 효과 표는 brief의 기대 효과에서: FLOW, 비교 대상 = 지금 하는 방식, 확인·측정 방법은 구체적으로(단계 수, 소요 시간 …), 실제 결과 비움, 상태 `예상`, 근거·한계. 남은 한계 = brief의 제외 범위.
- **arch**: `초안 — G3에서 코드와 대조`로 표시한다. kit 구성·계층·기술 선택은 유지하고 데이터(엔티티·FK), API 목록(`METHOD /api/v1/<path>` · 목적 · 권한 · REQ, `docs/conventions/api.md`), 화면 목록(경로 · 역할 · REQ), 핵심 흐름 1–2개를 단계별로 적는다.
- **brief**: grill이 연결한 범위별 REQ를 유지하고 발행 후 담당 PC·Issue 연결만 보완한다.
