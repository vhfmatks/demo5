# AGENTS.md

<!-- BEGIN:moai-doc-contract -->

## 문서 관리

필수 문서는 제출 직전에 채우는 부록이 아니라 **프로젝트 내내 지속 관리하는 최우선 기준**이다. 계획 전 작성하고 구현·리뷰·시험 후 실제 결과에 맞춰 갱신한다.

- 팀 관리 8종 = 루트 `README.md` + `docs/`의 팀 관리 7개(project-brief·prd·arch·experience·development·security-compliance·e2e-test). `docs/security-policy.md`는 별도의 필수 주최 측 원본이다.
- 문서 작성·갱신·연결 감사는 **`moai-docs` 스킬을 사용**한다. 호출할 수 없으면 `.claude/skills/moai-docs/SKILL.md`를 읽는다. 점진적 로딩 안내에 따라 대상 문서·모드 참조만 읽고 전체 매뉴얼을 상시 import하지 않는다. 상세 정의·레이아웃·갱신 시점은 스킬의 `references/documents/`가 소유한다.
- 실제 본문은 PC1만 갱신하며 워커는 AC·TC·실제 결과·SHA·문서 영향을 보고한다. 승인된 최초 `Bootstrap: kit-init`의 기본 틀 신규 생성·PLAYBOOK 매뉴얼 링크 정합만 한정 예외다. 기존 요구·ID·결과·미커밋 변경은 보존한다.
- 주최 측 보안 정책은 모든 설계·구현·리뷰·시험에 우선하며 위반은 BLOCKING이다. 원문은 임의로 수정하지 않고 미수령·미검증은 그대로 남긴다. 비밀값·개인정보는 기록하지 않는다.
- REQ → AC → TC → 실제 근거를 연결한다. 모든 필수 TC·경계의 실제 PASS가 있어야 AC를 검증한다. 코드·시험·설정·요구·정책 변경 시 영향 항목은 미검증으로 돌려 재시험하며 과거 이력은 보존한다.
- 워커 설정·담당 영역·명령·충돌 규칙은 `docs/agents/issue-tracker.md`, 게이트는 `PLAYBOOK.md` §7–§8, 코드 규약은 기존 `CLAUDE.md`와 `docs/conventions/`의 필요한 절만 따른다.

<!-- END:moai-doc-contract -->
