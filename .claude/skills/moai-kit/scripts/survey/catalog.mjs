// 설문 카탈로그·spec 검증. kit.mjs(init --survey|--spec)와 설문 화면이 같이 쓴다. 의존성 없음.
//   apply: true  = 생성 시 코드에 반영 (kit.mjs applyChoices)
//   apply: false = 구현 지침. docs/project-structure.md 에 기록하고 이후 이슈 구현이 따른다.
const v = (group, key, label, values, apply = false) => {
  const options = values.split("|").map((pair) => pair.split(":"));
  return { group, key, label, options, default: options[0][0], apply };
};

// 지침 항목은 hackathon-kit project-spec.ts 의 variation 을 따른다(생성 시 적용 항목과 겹치는 navigation·theme 제외).
export const VARIATIONS = [
  v("생성 시 적용", "navigation", "주 메뉴", "top:상단 GNB|sidebar:좌측 사이드바(PC)", true),
  v("생성 시 적용", "theme", "사용자 화면 테마", "light:밝게|dark:어둡게", true),
  v("전체 구조", "areas", "서비스 영역", "single:단일 앱|admin:사용자·관리자 분리|public:공개 사이트·로그인 앱"),
  v("전체 구조", "home", "시작 화면", "dashboard:대시보드|list:작업 목록|recent:최근 작업|role:권한별 시작 화면"),
  v("전체 구조", "width", "콘텐츠 폭", "fixed:고정 최대 폭|fluid:전체 폭|per-page:목록 전체·폼 고정"),
  v("전체 구조", "density", "화면 밀도", "normal:기본|comfortable:여유롭게|compact:고밀도"),
  v("전체 구조", "auxiliary", "보조 영역", "none:없음|panel:우측 정보 패널|collapsible:접는 작업 패널"),
  v("전체 구조", "sticky", "고정 영역", "none:일반 스크롤|header:헤더 고정|actions:액션 하단 고정"),
  v("이동", "menuDepth", "메뉴 계층", "flat:단일|grouped:그룹|nested:다단계"),
  v("이동", "location", "현재 위치", "active:메뉴 강조|breadcrumb:경로 표시|both:둘 다"),
  v("이동", "switching", "작업 전환", "pages:페이지 이동|tabs:작업 탭|recent:최근 방문"),
  v("이동", "spaces", "작업 공간", "single:단일 공간|project:프로젝트 선택|workspace:여러 workspace"),
  v("이동", "globalSearch", "전역 검색", "none:없음|page:검색 페이지|header:헤더 검색|command:명령 팔레트"),
  v("반응형", "compactMenu", "좁은 화면 메뉴", "drawer:옆 drawer|inline:펼침 목록|bottom:하단 메뉴"),
  v("반응형", "trigger", "햄버거 위치", "left:왼쪽|right:오른쪽"),
  v("반응형", "mobileScope", "모바일 기능", "all:전체 기능|primary:주요 기능|read:조회 전용"),
  v("반응형", "actionPlacement", "주요 액션", "top:상단|bottom:하단 고정|floating:플로팅 버튼"),
  v("반응형", "mobileAuxiliary", "모바일 보조 정보", "merge:본문 합치기|collapse:접기|page:별도 화면"),
  v("반응형", "mobileData", "복잡한 데이터", "scroll:가로 스크롤|essential:중요 필드|expand:항목 펼치기"),
  v("목록·탐색", "list", "PC 목록 형태", "table:표|card:카드|list:목록"),
  v("목록·탐색", "compactList", "모바일 목록 형태", "list:목록|card:카드|table:표"),
  v("목록·탐색", "search", "검색 실행", "submit:검색 버튼|instant:입력 중|enter:Enter"),
  v("목록·탐색", "filterPlacement", "필터 위치", "top:상단|side:사이드 패널|overlay:팝오버·sheet"),
  v("목록·탐색", "filterApply", "필터 적용", "button:적용 버튼|instant:즉시|builder:조건 빌더"),
  v("목록·탐색", "searchState", "검색 조건 유지", "url:URL|session:세션|saved:저장된 검색"),
  v("목록·탐색", "sort", "정렬", "fixed:최신순 고정|single:사용자 선택|multi:다중 필드"),
  v("목록·탐색", "paging", "추가 조회", "pagination:페이지 번호|more:더 보기|infinite:무한 스크롤"),
  v("목록·탐색", "views", "보기 개인화", "fixed:고정|columns:컬럼·순서·밀도|saved:저장된 보기"),
  v("목록·탐색", "group", "그룹화", "none:없음|status:상태별|date:날짜별|user:사용자 선택"),
  v("목록·탐색", "bulk", "일괄 작업", "none:없음|selected:선택 항목|query:검색 결과 전체"),
  v("목록·탐색", "quick", "빠른 작업", "detail:상세에서만|row:행 액션|inline:인라인 수정|context:컨텍스트 메뉴"),
  v("상세·입력", "detail", "상세 조회", "page:별도 페이지|modal:모달|drawer:drawer|split:목록 옆 상세"),
  v("상세·입력", "editor", "등록·수정 위치", "page:별도 페이지|modal:모달|drawer:drawer"),
  v("상세·입력", "formLayout", "폼 구성", "single:단일|sections:섹션|tabs:탭|wizard:단계별"),
  v("상세·입력", "formReuse", "생성·수정 관계", "shared:공용|separate:별도|simple:생성은 간단하게"),
  v("상세·입력", "save", "저장 방식", "explicit:저장 버튼|auto:자동 저장|draft:임시 저장 후 제출"),
  v("상세·입력", "validation", "검증 시점", "submit:제출|blur:필드 이탈|input:입력 중"),
  v("상세·입력", "conditional", "조건부 입력", "fixed:고정|conditional:선택에 따라|repeat:반복 항목"),
  v("상세·입력", "relation", "관계 선택", "select:select|combobox:검색형|modal:선택 모달"),
  v("상세·입력", "leave", "이탈 처리", "immediate:즉시|confirm:변경사항 확인|recover:임시 저장·복구"),
  v("상세·입력", "afterSave", "저장 후", "detail:상세|list:목록|stay:현재 화면|next:다음 작업"),
  v("파일", "upload", "업로드", "single:단일|multiple:다중|drop:드래그앤드롭"),
  v("파일", "fileView", "파일 확인", "download:다운로드|image:이미지 미리보기|document:문서 뷰어"),
  v("업무", "workflow", "처리 모델", "crud:단순 CRUD|approval:제출·승인|stages:여러 단계"),
  v("업무", "reason", "처리 사유", "none:불필요|optional:선택|required:필수"),
  v("업무", "collaboration", "협업", "solo:단독|assign:담당자 배정|comments:댓글·멘션"),
  v("업무", "history", "변경 이력", "last:최종 상태|timeline:활동 타임라인|versions:버전 비교"),
  v("업무", "conflict", "동시 수정", "notice:충돌 안내|compare:최신 값 비교|lock:편집 잠금"),
  v("피드백", "loading", "로딩", "spinner:spinner|skeleton:skeleton|retain:기존 데이터 유지"),
  v("피드백", "success", "성공 알림", "toast:toast|inline:인라인|page:결과 화면"),
  v("피드백", "error", "오류", "field:필드별|summary:상단 요약|page:오류 화면"),
  v("피드백", "empty", "빈 화면", "plain:안내|action:첫 작업 유도|guide:샘플·가이드"),
  v("피드백", "deletion", "삭제", "confirm:확인 후 삭제|trash:휴지통|undo:실행 취소"),
  v("피드백", "longTask", "일괄 작업 실행", "wait:완료 대기|progress:진행률|background:백그라운드 상태"),
  v("계정·접근", "entry", "로그인 진입", "required:로그인 우선|public:공개 우선|mixed:일부 인증"),
  v("계정·접근", "enrollment", "계정 생성", "admin:운영자 생성|invite:초대|signup:회원가입"),
  v("계정·접근", "permissionUi", "권한 UI", "hide:숨김|disable:비활성화|readonly:읽기 전용"),
  v("계정·접근", "organization", "사용자 소속", "single:단일 조직|multi:여러 조직|personal:개인·팀"),
  v("개인화", "locale", "언어·지역", "ko:한국어|bilingual:한국어·영어|regional:언어·시간대·숫자"),
  v("개인화", "notifications", "알림", "inapp:인앱|email:이메일 outbox|subscriptions:구독 설정"),
  v("개인화", "help", "도움말", "text:설명|tooltip:툴팁|onboarding:최초 사용 가이드|panel:도움말 패널"),
];
export const DEFAULT_CHOICES = Object.fromEntries(VARIATIONS.map((x) => [x.key, x.default]));
export const PRESETS = {
  office: { label: "업무 포털", choices: { navigation: "sidebar", home: "dashboard", list: "table", detail: "split", workflow: "approval", history: "timeline" } },
  catalog: { label: "콘텐츠·카탈로그", choices: { navigation: "top", list: "card", compactList: "card", detail: "page", entry: "mixed", areas: "public" } },
  compact: { label: "모바일 작업", choices: { compactMenu: "bottom", list: "list", editor: "drawer", actionPlacement: "bottom", formLayout: "wizard" } },
};
export const FIELD_TYPES = [["text", "짧은 글"], ["long", "긴 글"], ["int", "정수"], ["num", "숫자"], ["bool", "예/아니오"], ["date", "날짜"], ["datetime", "일시"], ["enum", "선택지"], ["ref", "참조"]];

// 키트·예제가 이미 쓰는 경로·테이블 (gen 복수형과 겹치면 안 됨)
const TAKEN = ["ai", "auditLogs", "auth", "settings", "users", "sessions", "roles", "departments", "me", "admin", "login", "api", "designSystem"];
const EXAMPLE_TAKEN = ["requests", "approvals", "bookings", "rooms", "publicNotes"];
const RESERVED_FIELDS = new Set(["id", "title", "memo", "owner", "ownerId", "version", "createdAt", "updatedAt"]);
const IDENT = /^[a-z][a-zA-Z0-9]*$/;
const BAD_LABEL = /[\r\n"'`\\<>{}]/; // gen-module.mts 라벨 규칙
const BAD_FIELD_LABEL = /[\r\n"'`\\<>{}|=:,()]/; // ( ) 는 gen 의 enum(…) 파싱을 깬다

// raw(JSON) → { spec, errors }. errors 가 비어야 생성한다. 같은 규칙을 gen-module.mts 도 다시 검사한다.
// existing: 이미 있는 프로젝트(survey)의 feature·경로 복수형 중 spec 도메인이 아닌 것 → 이름 충돌 금지.
// refTargets: 그중 gen 으로 만든 엔티티(테이블 + list<X>(actor) service) → 참조 대상 허용 (gen-module.mts 와 같은 조건).
export function checkSpec(raw, { existing = [], refTargets = [] } = {}) {
  const errors = [];
  const s = raw && typeof raw === "object" ? raw : {};
  if (s.version !== 1) errors.push("spec version 은 1 입니다.");
  const name = String(s.name ?? "");
  if (!/^[a-z][a-z0-9-]{1,47}$/.test(name)) errors.push("프로젝트 이름은 2~48자의 영문 소문자·숫자·하이픈입니다.");
  const title = String(s.title ?? "").trim();
  if (!title || title.length > 80 || BAD_LABEL.test(title)) errors.push("서비스 제목은 1~80자이며 따옴표·꺾쇠·중괄호를 쓰지 않습니다.");
  const choices = {};
  for (const x of VARIATIONS) {
    const value = s.choices?.[x.key] ?? x.default;
    if (!x.options.some(([o]) => o === value)) errors.push(`${x.label}: 알 수 없는 선택 ${value}`);
    choices[x.key] = value;
  }
  for (const key of Object.keys(s.choices ?? {})) if (!(key in DEFAULT_CHOICES)) errors.push(`알 수 없는 선택 항목: ${key}`);
  const example = s.example === true;
  const taken = new Set([...TAKEN, ...(example ? EXAMPLE_TAKEN : [])]);
  const seen = new Set();
  const seenEntity = new Set();
  const domains = (Array.isArray(s.domains) ? s.domains : []).map((d, i) => {
    const at = `도메인 ${i + 1}`;
    const entity = String(d?.entity ?? "");
    const plural = String(d?.plural || `${entity}s`);
    const label = String(d?.label ?? "").trim();
    const auth = d?.auth === "public" ? "public" : "required";
    if (!IDENT.test(entity)) errors.push(`${at}: 영문 이름은 camelCase 단수(예: expense)입니다.`);
    if (!IDENT.test(plural)) errors.push(`${at}: 복수형은 camelCase 입니다.`);
    if (!label || label.length > 40 || BAD_LABEL.test(label)) errors.push(`${at}: 한글 이름은 1~40자, 따옴표·꺾쇠 금지입니다.`);
    if (taken.has(plural)) errors.push(`${at}: ${plural} 은(는) 키트${example ? "·예제" : ""}가 이미 씁니다.`);
    else if (existing.includes(plural) || seen.has(plural)) errors.push(`${at}: ${plural} 은(는) 이미 있는 도메인입니다.`);
    seen.add(plural);
    if (seenEntity.has(entity)) errors.push(`${at}: 영문 이름 ${entity} 이(가) 중복됩니다(권한 키 ${entity}.* 충돌).`);
    seenEntity.add(entity);
    const fields = (Array.isArray(d?.fields) ? d.fields : []).map((f, j) => {
      const fat = `${at} 필드 ${j + 1}`;
      const field = { name: String(f?.name ?? ""), type: String(f?.type ?? ""), required: f?.required === true, label: String(f?.label ?? "").trim() };
      if (!IDENT.test(field.name)) errors.push(`${fat}: 이름은 camelCase 입니다.`);
      if (RESERVED_FIELDS.has(field.name)) errors.push(`${fat}: ${field.name} 은(는) 항상 생성되는 예약 필드입니다.`);
      if (!FIELD_TYPES.some(([t]) => t === field.type)) errors.push(`${fat}: 알 수 없는 타입 ${field.type}`);
      if (!field.label || BAD_FIELD_LABEL.test(field.label)) errors.push(`${fat}: 라벨이 비었거나 특수문자(| = : , 괄호·따옴표)가 있습니다.`);
      if (field.type === "enum") {
        field.options = (Array.isArray(f.options) ? f.options : []).map((o) => (Array.isArray(o) ? o : [])).map(([value, text]) => [String(value ?? ""), String(text ?? "").trim()]);
        if (!field.options.length || field.options.some(([value, text]) => !/^[A-Z][A-Z0-9_]*$/.test(value) || !text || BAD_FIELD_LABEL.test(text))) errors.push(`${fat}: 선택지는 VALUE=라벨 (VALUE 는 대문자, 라벨에 괄호·특수문자 금지) 입니다.`);
      }
      if (field.type === "ref") {
        field.target = String(f.target ?? "");
        const earlier = s.domains.slice(0, i).map((x) => String(x?.plural || `${x?.entity}s`));
        if (!field.name.endsWith("Id")) errors.push(`${fat}: 참조 필드 이름은 Id 로 끝납니다(예: roomId).`);
        if (auth === "public") errors.push(`${fat}: 공개 도메인은 참조 필드를 쓸 수 없습니다.`);
        if (field.target !== "users" && field.target !== plural && !earlier.includes(field.target) && !refTargets.includes(field.target)) errors.push(`${fat}: 참조 대상은 users·gen 으로 만든 기존 도메인 또는 앞쪽 도메인입니다.`);
        if (field.target === plural && field.required) errors.push(`${fat}: 자기 참조는 필수일 수 없습니다.`);
      }
      return field;
    });
    if (new Set(fields.map((f) => f.name)).size !== fields.length) errors.push(`${at}: 필드 이름이 중복됩니다.`);
    return { entity, plural, label, auth, fields };
  });
  if (domains.length > 20) errors.push("도메인은 20개까지입니다.");
  return { spec: { version: 1, name, title, example, choices, domains }, errors };
}

// 도메인 → gen 인자 (fields.md 문법)
export function genArgs(d) {
  const type = (f) => (f.type === "enum" ? `enum(${f.options.map(([value, text]) => `${value}=${text}`).join("|")})` : f.type === "ref" ? `ref(${f.target})` : f.type);
  const fields = d.fields.map((f) => `${f.name}:${type(f)}${f.required ? "!" : ""}:${f.label}`).join(",");
  return [d.entity, d.label, `--plural=${d.plural}`, `--auth=${d.auth}`, ...(fields ? [`--fields=${fields}`] : [])];
}

// current: 기존 프로젝트(survey)의 { choices, plurals } → 바뀌는 레이아웃과 아직 없는 도메인만. 설치·DB 초기화는 하지 않는다.
export function planSteps(spec, current) {
  if (current) {
    return [
      ...VARIATIONS.filter((x) => x.apply && spec.choices[x.key] !== current.choices[x.key]).map((x) => `레이아웃: ${x.label} ${label(x, current.choices[x.key])} → ${label(x, spec.choices[x.key])}`),
      "project.spec.json · docs/project-structure.md 갱신",
      ...spec.domains.filter((d) => !current.plurals.includes(d.plural)).map((d) => `gen ${genArgs(d).join(" ")} → 마이그레이션`),
    ];
  }
  return [
    `공통 scaffold${spec.example ? " + 예제 도메인" : ""} 복사 (기존 파일 보존)`,
    ...VARIATIONS.filter((x) => x.apply && spec.choices[x.key] !== x.default).map((x) => `적용: ${x.label} = ${label(x, spec.choices[x.key])}`),
    "project.spec.json · docs/project-structure.md 기록",
    "npm ci → npm run db:reset",
    ...spec.domains.map((d) => `gen ${genArgs(d).join(" ")} → 마이그레이션`),
  ];
}
const label = (x, value) => x.options.find(([o]) => o === value)?.[1] ?? value;

// 생성된 프로젝트의 docs/project-structure.md
// others: spec 밖에서 만든 기존 기능 [[복수형, 라벨]] (survey 가 nav 에서 읽음)
export function structureDoc(spec, others = []) {
  const fieldText = (f) => `${f.label}(${f.name}: ${f.type === "enum" ? f.options.map(([value]) => value).join("/") : f.type === "ref" ? `→${f.target}` : f.type}${f.required ? ", 필수" : ""})`;
  return [
    `# ${spec.title} — 프로젝트 구조 선택`, "",
    "`/moai-kit init`·`survey` 설문에서 확정한 선택이다. 원본 spec: [`project.spec.json`](../project.spec.json).",
    "**생성 시 적용** 항목은 이미 코드에 반영되었다. **구현 지침** 항목은 새 기능·이슈를 구현할 때 이 선택을 따른다(기본값과 같으면 kit 기본 동작).", "",
    "## 도메인", "",
    spec.domains.length ? "| 메뉴 | 경로 | 접근 | 필드(title·memo 외) |\n|---|---|---|---|" : "설문에서 만든 도메인이 없다. `K gen` 으로 추가한다.",
    ...spec.domains.map((d) => `| ${d.label} | \`/${d.plural}\` | ${d.auth === "public" ? "공개" : "로그인"} | ${d.fields.map(fieldText).join(", ") || "-"} |`),
    ...(others.length ? ["", `설문 밖에서 만든 기존 기능: ${others.map(([p, l]) => `${l}(/${p})`).join(", ")}`] : []),
    "", `예제 도메인: ${spec.example ? "포함 (요청·승인, 회의실 예약, 공개 메모)" : "미포함"}`, "",
    "## 화면·흐름 선택", "",
    "| 영역 | 항목 | 선택 | 구분 |", "|---|---|---|---|",
    ...VARIATIONS.map((x) => `| ${x.group} | ${x.label} | ${label(x, spec.choices[x.key])}${spec.choices[x.key] === x.default ? "" : " ★"} | ${x.apply ? "생성 시 적용" : "구현 지침"} |`),
    "", "★ = 기본값에서 바꾼 선택. 화면 표시 선택과 권한은 별개다: 권한은 항상 service·policy 에서 검사한다.", "",
  ].join("\n");
}
