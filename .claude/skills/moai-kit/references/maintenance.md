# 템플릿 구성·갱신 (스킬 관리자만)

| 경로 | 내용 |
|---|---|
| `assets/base.tgz` | 공통 scaffold. 로그인·세션·RBAC·감사로그·관리자 포털·KDS UI·생성기(`--fields`)·시험 인프라. 시드는 데모 계정만 |
| `references/examples/` | 원본 키트에서 base와 다른 파일만 모은 것. 예제 도메인과 예제판 공유 파일(db/schema·마이그레이션·nav·권한·시드·대시보드·일부 시험)이 들어 있다 |
| `scripts/kit.mjs` | 함수 진입점. `init --example`은 base 위에 `references/examples/`를 덮어쓴다. `applyChoices`는 설문의 "생성 시 적용" 선택을 `(app)/layout.tsx`·`(public)/layout.tsx`·`globals.css`에 정규식으로 패치한다. init 은 압축 해제한 템플릿(기본값→선택), `survey`는 기존 프로젝트(`currentChoices`가 읽은 현재 상태→선택, 되돌리기 포함)에 쓴다 |
| `references/chat-prototypes.md` | 스킬 기본 survey/init: 세션 요구사항 → KDS HTML 3안 → 선택 → 기존 `--spec` 적용. CLI 상세 설문은 유지하며 `--advanced`는 스킬에서만 처리한다. scaffold 변경이 아니므로 이 절차 변경만으로 base 재포장은 하지 않는다 |
| `scripts/survey/` | `init --survey` 설문. `catalog.mjs`(선택 카탈로그·spec 검증·gen 인자·문서), `server.mjs`(127.0.0.1 서버), `index.html`·`survey.js`·`survey.css`(화면·프로토타입). KDS CSS는 압축 해제한 base 의 `public/kds`를 그대로 쓴다. 시험: `node --test scripts/survey/catalog.test.mjs` |
| `scripts/migrate-kds.py` · `references/kds.md` | 제공 KDS 원본을 별도 scaffold에 동기화하고 원본 HTML 8종을 공통 React UI로 변환한다. 화면 외관·생성 규칙·폰트 제한의 적용 기준 |
| `scripts/kds-fonts.mjs` | 참가자 전용 KT Flow 로컬 설치. private 글꼴은 base 아카이브에서 제외한다 |
| `assets/kds-20261012.patch` | 기존 base 대비 검토 가능한 텍스트 변경. 바이너리 공개 폰트는 제공 원본에서 동기화한다 |

갱신 절차:

1. base판과 예제판을 각각 브랜치로 둔다.
2. 두 판을 함께 고친다.
3. 각 판에서 lint·typecheck·test·e2e를 통과시킨다.
4. 다시 묶는다.
   - base: `git archive --format=tar.gz -o assets/base.tgz <base>`
   - examples: `git diff --name-only --diff-filter=AM <base> <예제판>` 목록만 예제판에서 추출

- 작업 트리에 사용자 변경이 있을 때 현재 앱 전체를 base로 묶지 않는다. 기존 base를 별도의 빈 후보 디렉터리에 풀고 검토한 공통 파일만 적용한다. 후보 base·예제 생성물을 각각 검증한 뒤 의존성·DB·실행 근거를 제외하고 재포장한다. `git archive HEAD`는 미커밋 변경을 반영하지 않는다. 이 절차를 위해 승인 없이 커밋하지 않는다.
- AI 공통 변경(`features/ai`, 공통 시험, ai.md)은 base에, 요청 수행계획 보조·version·마이그레이션·시험은 examples에 둔다. 현재 앱의 도메인과 예제의 스키마/정책을 섞지 않는다. `init` 및 `init --example` 새 생성물에서 각각 확인한다.
- 빼야 할 것: `node_modules`·`.next`·`data/*.db`·`test-results`·`docs/evidence/2*`·`docs/evidence/latest.md`
- 브랜치를 바꾼 뒤에는 `tsconfig.tsbuildinfo`·`.next` 를 지우고 검사한다. 남은 증분 정보가 타입 오류를 숨긴 적이 있다.
- 위 layout·globals.css 를 바꾸면 `init --spec=<sidebar·dark spec>` 으로 생성해 보고 `applyChoices`의 패치 문자열을 맞춘다(지점이 없으면 "레이아웃 변경 지점 없음"으로 멈춘다). 되돌리기는 켤 때 넣은 문자열(`data-nav`·`lg:flex` 래퍼·`SIDEBAR_CSS`·`DARK`)을 그대로 찾으므로 켜기·되돌리기를 함께 고친다. 생성기의 `--fields`·`catalog.mjs` 검증 규칙도 함께 맞춘다.
- Windows GNU tar 로 묶을 때는 `--force-local`(경로의 `C:` 를 원격 호스트로 해석하지 않게).
- `CLAUDE.md`는 넣지 않는다. 있으면 Claude Code 가 `AGENTS.md`를 읽지 않는다.
- `scripts/moai-worktree-clean.ps1`의 원본은 이 저장소의 같은 경로다. 고치면 다시 묶는다.
- `docs/e2e-test.md`는 판마다 다르다(base판 = 공통 TC, `references/examples/docs/e2e-test.md` = 공통 + `예시` TC). 시험 TC를 추가·변경하면 해당 판의 §2 계획 행을 맞추고 `npm run e2e:dashboard`로 현황을 다시 만든다. 어긋나면 `npm run lint:contracts`가 실패한다. `scripts/e2e-dashboard.mts`의 원본은 이 저장소의 같은 경로다.
- 필수 문서의 성격·경계·갱신 시점·레이아웃은 moai-docs의 `references/documents/`가 단일 원본이다. 스킬 인덱스로 필요한 참조만 선택하며, `AGENTS.md`와 setup asset의 관리 블록(`moai-doc-contract`)에는 최우선·안전 원칙과 스킬 사용 안내만 둔다. 상세 매뉴얼은 상시 import하거나 복제하지 않는다. 게이트는 `PLAYBOOK.md` §7을 따른다. 정의가 바뀌면 base판 README·팀 관리 docs 7개와 예제판 `docs/e2e-test.md`의 목적 요약도 맞추고 기존 프로젝트 본문·실행 이력은 초기화하지 않는다.
- `kit.mjs init`은 AGENTS가 없으면 base에서 생성하고, 있으면 문서 관리 블록을 보존한 채 빠진 코드 규약만 끝에 덧붙인다. survey의 구조 안내와 Next 자동 생성 블록도 관리 블록 바깥에 둔다. base 재포장에 setup의 워커 설정·담당자·운영 본문을 섞지 않는다.
- 줄바꿈은 LF로 맞춘다. 템플릿의 `.gitattributes`가 고정한다.

## KDS 배포 갱신

1. 기존 base를 빈 후보 디렉터리에 푼 뒤 `python scripts/migrate-kds.py --source <제공 KDS 루트> --destination <후보 scaffold>`를 실행한다. 이 명령은 현재 프로젝트의 공통 파일을 가져오지 않는다.
2. 후보의 ui·globals·생성기와 실제 문서를 새 원본에 맞춘다. 원본 CSS·HTML·예제 CSS를 보존하고, React 상태·폼 값·초점 처리만 공통 UI에 구현한다. 새 DOM 날짜 JS는 HTML 미리보기 전용이며 React에서 전역 로드하지 않는다.
3. `npm run test:e2e -- tests/e2e/kdsParity.ui.spec.ts tests/e2e/designSystem.ui.spec.ts` 및 base·예제 생성물의 gate를 실행한다. 같은 폰트 환경에서 참조 8종 전체 화면 픽셀 0 차이를 확인한다. PC 1280 경계·모바일 CTA/피드·원본 컨트롤 치수도 검사한다.
4. KDS reference의 `src/app/kds-reference.css`는 화면별 selector로 격리한다. 원문 docs의 `AGENTS.md` 참조는 제공 자료 안내로 설명하며 프로젝트 AGENTS를 KDS 문서로 덮어쓰지 않는다. `public/kds/scripts/sync-instructions.sh`는 reference 전용으로 실행을 중단한다.
5. `.kds-private/fonts`, `assets/kds-fonts.private`, `.next`·node_modules·DB·실행 근거·tsbuildinfo·검증용 생성 도메인을 제외하고 재포장한다. `kt-flow.css`는 빈 선택 설치 안내만 포함한다. 공개 폰트는 Pretendard와 OFL 라이선스뿐이다. `source-manifest.json`은 제공 원본 해시와 실제 변환 예외를 보존한다. 참가자 로컬 companion 폰트는 스킬 assets의 Git 제외 경로에만 두고 init이 자동 설치한다.

- 제한 글꼴의 CSS는 실행 환경 변수에서 응답하는 메타데이터이며 원본 public 파일을 수정하지 않는다. `.kds-private/fonts` 바이트는 127.0.0.1 전용 서버에서만 제공하고 loopback Origin·Host를 검사한다. dev/E2E 종료 시 함께 닫으며 일반 운영에서는 시작하지 않는다.
