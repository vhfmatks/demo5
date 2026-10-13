# 구현·시험 결과 반영

## sync (G4, 변경 병합 후)

AC·TC 상태를 판정하므로 [라이프사이클](../lifecycle.md)을 읽는다. 먼저 PR·코드·실행 근거로 영향 문서를 고르고, 실제 수정할 문서의 `../documents/<문서>.md`만 한 번에 하나씩 로드한다. 아래 목록 전체를 읽으라는 뜻이 아니다.

1. 병합 PR은 `gh pr list --state merged --base main --limit 100 --json number,title,body,mergeCommit`로 찾고 필요하면 페이지를 이어 읽는다. PR이 이미 연결되어도 새 실행 근거·후속 변경·실패가 있으면 재대조한다. 같은 PR·runId·커밋의 기록은 중복 추가하지 않는다.
2. PR 본문(`/moai-work` §8)·실제 코드·커밋된 실행 근거에서 REQ→AC→Issue/PR→TC를 대조한다:
   - `docs/prd.md`: 실제 병합은 `구현(PR #m)`으로 연결한다. PASS라는 보고만으로 검증하지 않고 각 AC의 모든 필수 TC·적용 경계·후보 소스·실제 결과를 확인해 판정한다. 부족한 근거는 미검증·미실행, 실제 실패는 실패로 유지한다.
   - `docs/e2e-test.md`: 승인된 §2 계획은 임의로 바꾸지 않는다. 새 요구·TC·seam 누락은 plan/spec으로 돌리고 승인 후 반영한다. `npm run e2e:dashboard`로 현황 블록을 다시 만든다. PR의 게이트 evidence가 통합 소스에 없거나 현재 영향 범위가 재시험되지 않았으면 미검증으로 보고한다. 대시보드의 마지막 TC 결과가 현재 후보·AC 전체를 증명하는지 별도로 대조한다.
   - `docs/security-compliance.md`: security touched의 코드 위치·공식 SEC·TC·실제 정상/거부/저장값 결과를 연결한다. 변경 후 예전 SEC 결과를 현재 검증으로 쓰지 않는다.
   - `docs/development.md`: AI 사용 목적·팀원별 기여·리뷰 지적·수정 커밋·재시험 근거와 일정 기록을 runId/PR별로 남긴다(발견자: moai-review Standards/Spec 등 실제 출처).
   - `docs/project-brief.md`: PRD를 기준으로 범위별 실제 구현 상태·근거 링크를 요약한다. 일부 AC만 검증된 묶음은 전체 검증으로 표시하지 않고 상태가 다른 항목을 분리한다. 범위·역할 변경이 있으면 선택 이유·역할 변경 이유·제약도 확인된 근거로 갱신한다. 과거 G1/G2 합의 시점의 상태 문구는 이력으로 보존한다.
   - 데이터/API/구조 변경 → `docs/arch.md`, 실행 명령 변경 → `README.md`, 사용자 흐름·실제 관찰 변경 → `docs/experience.md`.
3. 사용자·PR에 이미 있는 사람의 검토·수정 답변은 재사용한다. 실제 인간 검토 사례에 꼭 필요한 사실이 없을 때만 한 번 확인하고, 확인자·문제·수정·재시험 근거를 기록한다. 답변이 없으면 미확인으로 남기며 사례를 만들어 내지 않는다.
4. 변경 문서·영향 REQ/AC·실제 실행 결과·미검증·NEEDS_HUMAN을 짧게 보고한다. 승인된 경우에만 관련 파일을 `docs: G4 sync (PR #a, #b)`로 커밋·push한다.
