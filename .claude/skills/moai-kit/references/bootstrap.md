# 최초 kit init (`Bootstrap: kit-init`)

앱이 없는 새 레포에서 한 번만 일어난다. 티켓에 `Bootstrap: kit-init`이 있거나 그 티켓을 계획·병합할 때만 이 파일을 읽는다. 순수 init 결과는 **생성 baseline 검증**이며 RED/GREEN이라고 하지 않는다. init 이후 기능은 moai-tdd의 실제 RED/GREEN을 그대로 따른다.

## 판정

- `package.json`·`src/app/(app)/layout.tsx`·`src/server/db/schema.ts`가 모두 있으면 기존 앱이다. init을 계획·실행하지 않는다.
- 일부만 있거나 다른 앱의 src·package.json이 있으면 **불완전 초기화**다. 덮어쓰거나 survey·`db:reset`으로 복구하지 않고 BLOCKED로 보고한다.

## 1. 계획 (moai-spec)

- 열린·종료 이슈 전체에서 기존 `Bootstrap: kit-init` 티켓을 먼저 찾는다. 있으면 재사용하고 중복 티켓을 만들지 않는다. 종료됐는데 main에 앱이 없으면 불일치로 보고하고 멈춘다.
- 없을 때만 **첫 foundation 티켓 하나**에 `Bootstrap: kit-init`을 붙이고, 그 spec을 먼저 발행한다. foundation은 기존 REQ·AC·Test/TDD seam을 그대로 가지며 도메인 `gen` 전에 init만 추가한다.
- 같은 spec의 다른 티켓과 다른 spec의 시작 티켓은 이 foundation을 `Blocked by`로 참조한다. 다른 PC는 최초 spec PR이 main에 머지되고 COMPLETED가 될 때까지 기다린다. 별도 잠금·bootstrap PR은 만들지 않는다.
- foundation 본문에 **Init spec**을 넣고 계획 승인에 포함한다. name은 2~48자 영문 소문자·숫자·하이픈, title은 확인된 프로젝트명(미정이면 레포명), choices는 확인된 선택 또는 `{}`:

  ```json
  { "version": 1, "name": "project-name", "title": "프로젝트명", "example": false, "choices": {}, "domains": [] }
  ```

- Writes: `K init`이 만드는 경로. `tar -tzf .claude/skills/moai-kit/assets/base.tgz` 목록은 **대조용**이며 그중 없는 파일 생성만 + `project.spec.json`·`docs/project-structure.md` + 기존 `AGENTS.md`·`.gitignore`·`.gitattributes`·`CLAUDE.md`에 빠진 규칙 덧붙이기. 팀 관리 문서는 **기본 문서 틀** 신규 생성만 허용한다.
- Checks: init 종료 코드 0, 삭제 0건·허용 경로만 변경, `AGENTS.md`의 `moai-doc-contract` 블록 1개, tracker 설정·PRD·brief 보존.

## 2. 구현자

install 전에, 자기 worktree에서 수행한다.

**init은 moai-kit의 init 함수(`K init --spec=<파일>`)로만 한다.** base.tgz를 `tar -x`로 풀거나, kit 배포 폴더·다른 레포·`references/examples/`에서 파일을 복사·붙여넣기하거나, init이 만들 파일을 손으로 쓰지 않는다. `/moai-kit init`을 `--spec` 없이 부르면 시안 대화로 넘어가므로 쓰지 않는다. init이 실패하면 파일을 직접 채워 복구하지 않고 BLOCKED로 보고한다.

1. 재개 시 앱 marker가 있으면 재초기화하지 않는다. 이 티켓이 만든 앱이면 완료된 `chore: kit init (#<n>)` 커밋이 있는지 확인한다. 없으면 설치 중 실패한 잔여물일 수 있으므로 BLOCKED다.
2. Init spec을 저장소 밖 임시 JSON에 쓰고 `example: false`·`domains: []`를 확인한다.
3. `K init --spec=<파일> --dry-run`으로 승인 계획과 대조한 뒤 `K init --spec=<파일>`을 실행한다(`K` = `node .claude/skills/moai-kit/scripts/kit.mjs`). 종료 코드 0과 설치·합성 DB 준비를 확인한다. 실패하면 비밀 값을 노출하지 않고 잔여 파일·실패 단계를 보존해 BLOCKED로 보고한다. 이미 설치했으므로 install은 다시 하지 않는다.
4. 변경 경로를 base.tgz 목록 + `project.spec.json`·`docs/project-structure.md`와 대조한다. 기존 파일 수정은 위 덧붙이기뿐, 삭제 0건이어야 한다. 비밀·`data/`·`node_modules`·실행 산출물은 stage하지 않는다.
5. 승인된 init 경로만 `chore: kit init (#<n>)`으로 따로 커밋한 뒤 foundation의 `gen`·TDD를 이어간다. init 커밋만으로 DONE이나 AC PASS를 선언하지 않는다. 보고의 `baseline:` 줄에 init 결과와 문서 보존 확인을 적는다.

## 3. 오케스트레이터 (moai-work)

- 통합 worktree에 `package.json`이 없으면 install을 보류한다. 승인된 bootstrap 티켓이 frontier에 있으면 그 구현자 하나만 **solo**로 시작하고, 없으면 BLOCKED로 보고한다. 오케스트레이터는 직접 init하지 않는다.
- bootstrap 병합은 `deps`를 소유하므로 merger에 `INSTALL=<install command>`를 넘긴다. 이 병합이 끝나야 후속 구현자를 시작한다.
- `CLEANER`(`scripts/moai-worktree-clean.ps1`)가 main에 아직 없으면 통합 worktree에 설치된 같은 스크립트를 쓴다. 둘 다 없으면 worktree를 강제로 정리하지 않고 보존한다.
