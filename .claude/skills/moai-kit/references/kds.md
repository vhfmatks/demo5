# KDS 20261012 화면 기준

UI 원본은 `assets/base.tgz`의 `public/kds`다. tokens·아이콘 130종·Pretendard·라이선스·날짜 JS·templates 4종·examples 4종과 CSS·자산 생성 스크립트를 함께 배포한다. 원문 docs는 `docs/design-system/reference`, 실제 React API는 `docs/design-system/components.md`와 `@/components/ui` export다. 비공개 KDS React 패키지를 설치하지 않는다.

## 화면 선택

| 요구 | 기준 화면 | 구현 |
|---|---|---|
| 모바일 입력·신청·납부 | `public/kds/templates/mobile-task.html`, `examples/mobile*.html` | TopNavigation → InfoBand → Section·Divider band → CtaBar. 테두리 카드를 쌓지 않는다 |
| 모바일 홈·혜택·AI | `templates/mobile-feed.html`, `examples/mobile-benefit.html` | agent 모드, FeedSection·FeedCard·HorizontalScroll, PromptTextField·BottomNavigation |
| PC 콘텐츠·상품 목록 | `templates/pc-page.html`, `examples/pc.html` | 72px Gnb → Breadcrumb → 1080 콘텐츠, 36px 페이지 제목, 3열 카드, Pagination·Footer |
| PC 표·관리·예약 | `templates/pc-admin.html` | 요약·SearchField·DateRangePicker·Select → ResultCount → DataTable → Pagination, 차트·TimeSlotPicker |

React 기준 화면은 `/design-system/kds/templates/mobile-task`처럼 같은 이름으로 제공한다. 원본 HTML은 `/kds/templates/mobile-task.html`이다. 요구 기능·권한·업무 데이터는 세션에 맞게 연결하며 참조 화면의 합성 서비스 내용과 자리표시자 링크를 제품 기능으로 간주하지 않는다.

## 지켜야 할 외관

- PC 전환은 1280. moai-kit이 Tailwind `lg=1280`을 설정하므로 `lg:`를 사용한다. 제공 원문에서 `lg=1024`라고 설명한 부분은 Tailwind 설정이 없는 원본 HTML에만 해당한다.
- 입력 52, 검색 48, 버튼 xsmall/small/medium/large 32/40/44/48, 표 머리/행 44/56, 페이지 번호 40, PC GNB 72. 화면 밀도 선택은 배치·표시 정보만 바꾸며 컨트롤을 32/36으로 줄이지 않는다.
- 타이포: 모바일 제목 22, PC 제목 36, 카드 제목 20. 기본 Pretendard, 큰 제목에만 요청에 따라 `font-brand`. 원본 CSS는 그대로 두고 통합 동작만 `kit-*`로 확장한다. Tailwind Preflight는 원본 HTML의 기본 여백을 바꾸므로 사용하지 않는다.
- 아이콘은 `Icon` 또는 원본 `ic-*` 클래스. 다색 alarm_unread·k_logo_red·loading은 SVG 이미지로 유지한다. 미제공 아이콘은 필요한 Lucide SVG만 추가하고 24 자리 안에 22 크기로 표시한다.
- 날짜는 KDS 달력, 화면 `YYYY.MM.DD`, 폼/API는 ISO `YYYY-MM-DD`. `gen date`는 DatePicker를 사용한다. readonly DOM 스크립트를 React 앱에 전역 초기화하지 않는다.
- 차트 계열은 `--data-visual-default-teal/yellow/blue/purple/red`, 비교 기준은 gray. 넓은 업무 면을 teal로 칠하지 않는다. 모드별 대비는 변경 후 실제 재확인한다.

## 글꼴과 검증

Pretendard와 OFL 라이선스를 공개 배포한다. KT Flow 파일은 해커톤 참가자 전용이라 `base.tgz`에 포함하지 않는다. 스킬 로컬 `assets/kds-fonts.private`에 참가자 폰트가 있으면 init이 자동으로 프로젝트의 private 경로에 설치한다. 이 companion 자산은 Git에서 제외한다. 다른 환경에서는 `K kds-fonts <KDS fonts/web>`로 제공 폰트와 같은 로컬 제목을 설치한다. 프로젝트의 `.kds-private/fonts`와 `kt-flow.css`도 Git에서 제외하며 외부 공유·공개 배포하지 않는다. 설치하지 않은 환경은 Pretendard로 표시된다.

`npm run test:e2e -- tests/e2e/kdsParity.ui.spec.ts tests/e2e/designSystem.ui.spec.ts`로 격리 검증한다. 참조 8종은 같은 브라우저·폰트·viewport·데이터에서 전체 화면 픽셀 차이 0을 검사한다. 기능 화면은 동일 공통 UI와 해당 패턴을 사용하되 데이터가 다른 화면의 픽셀 일치를 주장하지 않는다. 배포 갱신 절차는 [maintenance](maintenance.md)를 따른다.

운영 빌드는 제한 폰트를 제공하지 않는다. 파일은 public 바깥 `.kds-private/fonts`에 있고, 글꼴 바이트는 `npm run dev`·격리 E2E가 시작하는 별도 127.0.0.1 서버에서만 제공한다. 공개 Next 서버는 CSS 주소만 전달하며 글꼴 바이트 경로는 404다. 선택 날짜는 입력 안 지우기 버튼으로 빈 ISO 값을 제출할 수 있으며, 목록·상세 날짜도 점 표기로 표시한다.
