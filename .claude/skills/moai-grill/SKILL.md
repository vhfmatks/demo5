---
name: moai-grill
description: Interview all requested project features, scope, permissions, flows and acceptance criteria after moai-setup; own project-brief, PRD and GLOSSARY. PC1 only. Once the full interview is confirmed, hand off directly to moai-spec to publish tickets; the worker runs kit init.
disable-model-invocation: true
---

초기화 전에도 실행한다. `docs/project-brief.md`·`docs/prd.md`가 없어도 중단하거나 setup으로 되돌리지 않는다. 기존 문서·세션 요구사항이 있으면 재사용하고 없으면 요구를 받은 뒤 만든다. 이 단계에서는 init·설치·DB 변경·Issue 발행을 하지 않는다.

시작할 때 앱 유무를 `.claude/skills/moai-kit/references/bootstrap.md` 판정으로 직접 확인한다(묻지 않음). 세 marker가 모두 없고 `Bootstrap: kit-init` 이슈도 없으면 **신규 레포**다. 이번 spec의 첫 foundation이 kit init을 맡으므로 프로젝트명(Init spec `title`)을 인터뷰 항목에 넣는다. brief에 이미 있으면 재사용하고, `name`은 레포명으로 정한다. 일부 marker만 있으면 불완전 초기화이므로 사용자에게 보고하고 spec으로 넘기지 않는다.

사용자와 기능에 대한 이해가 같아질 때까지 인터뷰한다. 결정 하나에서 그 결정에 달린 결정들이 가지를 치는 **결정 트리**로 정리한다.

접수 Issue에서 시작하면 `gh issue view <n> --json number,state,labels,body,comments`로 번호·`kind:bug|improve`를 확인한다. 일반 기능은 `Source: none`, 접수는 `Source: #<n> kind:<bug|improve>`, 직접 전달한 버그·개선은 `Source: none kind:<bug|improve>`로 유지한다. 여러 접수는 번호·유형 쌍을 `;`로 나열한다. 제목의 '개선' 같은 단어로 추측하지 않으며 유형이 불명확하면 확인한다. 이미 승격된 접수는 연결된 spec을 재사용한다. G5 이후 improve는 tracker의 제외 규칙을 따른다.

## 라운드

사용자가 설명한 기능과 제공된 과제·요구 문서를 읽고 요청 목록을 만든다. 요구가 없으면 사용자·핵심 작업·기능 전체를 채팅으로 설명해 달라고 한 번 안내한다. **frontier**는 선행 결정이 정해진 미해결 사항이다. 코드·기존 답변·합리적인 기본값으로 정할 수 없는 것만 `AskUserQuestion`으로 묻는다. 업무 화면·이동 흐름도 묻되 시각 스타일은 KDS 기본값을 쓴다. HTML 시안은 사용자가 요청할 때만 비교한다.

- 한 번에 최대 4문항이지만 개수를 채우려 하지 않는다. 받은 답을 다시 묻지 않는다.
- 문항마다 `header` 12자 이하, 구체적 선택지 2–4개. 추천안을 첫째에 두고 라벨 끝에 ` (Recommended)`. "Other"는 자동으로 붙으니 넣지 않는다.
- 배타적이지 않은 선택(예: 처리할 실패 경우)은 `multiSelect: true`.
- 구체적 산출물(화면 목업·데이터 형태·엔드포인트 시그니처)을 비교할 때는 `preview`.
- 이번 라운드에 아직 열린 질문에 의존하는 질문은 다음 라운드로 미룬다.

사실 확인은 내 몫, 결정은 사용자 몫이다. 코드·환경에서 알 수 있는 사실은 직접 찾고(큰 검색은 서브에이전트) 사용자에게 묻지 않는다.

기능마다 **필수·추가·제외**를 확인해 누락 없이 기록한다. 작게 만들자고 제안할 수는 있지만 사용자가 원한 기능을 임의로 빼거나 미루지 않는다. 다룰 항목:

- 누가 쓰고 주요 흐름은 어떤 단계인가
- 데이터: 무엇을, 어디에, 어떤 형태로 저장하나
- 공개 인터페이스: 엔드포인트·화면·CLI. 이것이 **test seam**이 된다
- 이번에 처리할 실패 경우. 나머지는 명시적으로 범위 밖
- 코드의 어느 영역을 건드리나(`Touches:`와 PC 배정, `docs/agents/issue-tracker.md` 영역 표)
- 기능별 권한·필수/고유/참조 필드·상태 전이·완료 기준·외부 연동·운영 제약. 기술 구현은 spec에서 계획하되 사용자 판단이 필요한 미정 계약은 남기지 않는다.

인터뷰 완료 = 요청 목록의 모든 항목이 포함/제외와 이유로 정리되고, 포함 기능의 사용자·데이터·흐름·권한·오류·AC에 **미해결 사항**이 없을 때. 필수 기능에 미정 계약이 있으면 spec으로 넘기지 않는다.

## 용어집

사용자가 모호하거나 충돌하는 용어("account": Customer인가 User인가?)를 쓰면 짚고 정식 용어 하나를 제안한다. 정해지면 바로 `GLOSSARY.md`에 쓴다(첫 용어 때 파일 생성):

```md
**Order**:
그것이 무엇인지 한두 문장.
_Avoid_: Purchase, transaction
```

프로젝트 고유 용어만, 구현 세부 없이. 워커가 이 파일로 이름을 맞춘다.

## 완료

frontier가 비면 `Source:`, 신규 레포일 때 `Bootstrap: kit-init (name·title)`, 결정을 15개 이하 bullet로 요약하고 `AskUserQuestion`(Confirm / Revise)으로 확인받는다. 유형을 재분류했다면 새 유형도 확인받는다.

확인되면 **G1 요구사항 기준선**을 쓴다(`PLAYBOOK.md` §7). `.claude/skills/moai-docs/references/documents/project-brief.md`·`prd.md`와 `references/lifecycle.md`만 읽고 그 레이아웃을 따른다. 기존 문서는 부분 수정, 없는 문서는 생성한다. 기존 REQ·합의·Issue 연결·이력은 보존한다. G1 시점 값:

- **brief**: 범위 표의 신규 포함 항목은 `미실행`, 제외는 `미구현(제외)`(제외 항목에 REQ를 만들지 않는다). 효과 표의 관찰한 가치는 `미검증(관찰·측정 미실행)`. 팀 역할 표의 최초 배정은 `초기 배정`, 미확인 제약은 `미정`(사용자가 없다고 확인했을 때만 `없음`). 선택 이유는 합의·요구 원문 근거만, 추정하지 않는다. 빈칸을 남기지 않는다.
- **prd**(grill 소유): 요구 1개 = REQ 1개. 기존 최고 번호 다음부터 `REQ-NN`·`AC-NN-k`. 연결 칸(Issue·PR·TC)은 비우고 상태 `미실행`. `## AC별 연결·판정` 표에 AC마다 한 행(FLOW `미정`, Issue/PR·TC 비움, 상태 `미실행`, 판정 근거 `—`)을 함께 쓴다. AC는 조건 → 관찰 가능한 결과이며 거부 시 저장값 불변까지 적는다. 역할·행위별 권한(역할 비교 구현을 지시하지 않고 `docs/conventions/rbac.md`), 데이터·필수/고유/참조 필드, 상태·허용 전이, 핵심 흐름·제외 범위를 기록한다. 미확인은 `미정`. 해당 G1 합의 문단에 `Source:`와 관련 REQ/AC를 적는다. 기존 출처 열(`주제`/`팀`)은 접수 유형으로 바꾸지 않는다.

문서 확인과 git 공개는 별개다. 미커밋 변경을 보존하고 관련 파일만 다룬다. 커밋·push는 명시적으로 승인받은 범위에서만 한다.

확인 후 `Source:`와 Bootstrap 판정(신규 레포면 확인된 name·title)을 인계하고 `.claude/skills/moai-spec/SKILL.md`를 읽어 같은 흐름에서 구현 계획·TC 연결·spec 발행으로 이어간다. 일반 기능과 bug·improve는 역할별로 spec을 분리하고, bug·improve는 tracker의 `MAINTENANCE_PC`로 배정한다. 발행 승인 전에는 GitHub에 쓰지 않는다. 이후 시안 등에서 기능·권한·AC가 바뀌면 해당 PRD 항목만 grill에서 다시 확인한다.
