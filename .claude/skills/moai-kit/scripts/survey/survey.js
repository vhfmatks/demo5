// moai-kit init·survey 설문: 도메인·레이아웃을 조립하면 오른쪽 프로토타입이 바로 바뀐다. 검증은 서버(/plan, catalog.mjs) 한 곳에서 한다.
// survey(기존 프로젝트, boot.mode="update"): 기존 도메인은 잠긴 채 프로토타입에만 보이고, 새 도메인과 선택만 서버로 보낸다.
(() => {
  const boot = JSON.parse(document.getElementById("bootstrap").textContent);
  const form = document.getElementById("survey");
  const $ = (id) => document.getElementById(id);
  const STORE = "moai-kit-survey";
  const update = boot.mode === "update";
  // h(tag, {attr}, ...children) — 사용자 입력은 textContent·속성으로만 넣는다.
  const h = (tag, attrs = {}, ...children) => {
    const el = document.createElement(tag);
    for (const [k, value] of Object.entries(attrs)) {
      if (value === false || value == null) continue;
      if (k === "class") el.className = value; else if (k in el && typeof value !== "string") el[k] = value; else el.setAttribute(k, value === true ? "" : value);
    }
    el.append(...children.flat(Infinity).filter((c) => c != null && c !== false));
    return el;
  };

  const blankField = () => ({ name: "", label: "", type: "text", required: false, optionsText: "", target: "users" });
  const state = { name: "my-app", title: "나의 서비스", example: false, choices: { ...boot.defaults }, domains: [] };
  const toState = (d) => ({
    entity: d.entity ?? "", label: d.label ?? "", plural: d.plural ?? "", auth: d.auth ?? "required",
    fields: (d.fields ?? []).map((f) => ({ ...blankField(), ...f, optionsText: (f.options ?? []).map((o) => o.join("=")).join("|") })),
  });
  const existing = (boot.existing ?? []).map(toState);
  const all = () => [...existing, ...state.domains]; // 프로토타입·참조 대상 (view.i 는 이 배열의 위치)
  let view = { kind: "home" }; // 프로토타입 화면: home | list(i) | form(i) | detail(i)

  // ── 상태 ⇄ spec ────────────────────────────────
  const toSpec = () => ({
    version: 1, name: state.name, title: state.title, example: state.example, choices: state.choices,
    domains: state.domains.map((d) => ({
      entity: d.entity, label: d.label, ...(d.plural ? { plural: d.plural } : {}), auth: d.auth,
      fields: d.fields.map((f) => ({
        name: f.name, label: f.label, type: f.type, required: f.required,
        ...(f.type === "enum" ? { options: f.optionsText.split("|").filter((o) => o.trim()).map((o) => o.split("=").map((s) => s.trim())) } : {}),
        ...(f.type === "ref" ? { target: f.target } : {}),
      })),
    })),
  });
  const fromSpec = (spec) => {
    if (spec?.version !== 1) throw new Error("지원하지 않는 spec 버전입니다.");
    Object.assign(state, {
      name: spec.name ?? "", title: spec.title ?? "", example: spec.example === true, choices: { ...boot.defaults, ...spec.choices },
      domains: (spec.domains ?? []).map(toState).filter((d) => !existing.some((x) => plural(x) === plural(d))),
    });
    view = { kind: "home" };
    renderAll();
  };
  const plural = (d) => d.plural || (d.entity ? `${d.entity}s` : "");

  // ── 01·03·04: 기본 정보·선택 항목 ─────────────────
  const radios = (x) => h("fieldset", { class: "choice" }, h("legend", {}, x.label),
    h("div", { class: "row" }, x.options.map(([value, text]) => h("label", { class: "kds-radio" },
      h("input", { type: "radio", name: `c:${x.key}`, value, checked: state.choices[x.key] === value }), text))));
  const renderChoices = () => {
    $("applied").replaceChildren(...boot.variations.filter((x) => x.apply).map(radios));
    const groups = [...new Set(boot.variations.filter((x) => !x.apply).map((x) => x.group))];
    $("guides").replaceChildren(...groups.map((g) => {
      const items = boot.variations.filter((x) => !x.apply && x.group === g);
      return h("details", { class: "group", "data-g": g }, h("summary", {}, g, h("small")), items.map(radios));
    }));
    updateCounts();
    form.elements.name.value = state.name; form.elements.title.value = state.title; form.elements.example.checked = state.example;
    $("existing").replaceChildren(...existing.map((d) => h("span", { class: "kds-tag" }, `${d.label} /${plural(d)}`)));
  };

  const updateCounts = () => {
    for (const el of $("guides").querySelectorAll("[data-g]")) {
      const items = boot.variations.filter((x) => !x.apply && x.group === el.dataset.g);
      const n = items.filter((x) => state.choices[x.key] !== x.default).length;
      el.querySelector("small").textContent = ` ${items.length}개${n ? ` · ${n}개 변경` : ""}`;
    }
  };

  // ── 02: 도메인 조립 ──────────────────────────────
  const input = (attrs) => h("input", { class: "kds-field__input", ...attrs });
  const field = (label, control) => h("label", { class: "kds-field" }, h("span", { class: "kds-field__label" }, label), control);
  const renderDomains = () => {
    // 재렌더 후 같은 입력에 포커스를 되돌린다(타입 변경·추가·삭제 시 키보드 위치 유지).
    const a = document.activeElement, key = a?.dataset?.k && [a.closest("[data-d]")?.dataset.d, a.closest("[data-f]")?.dataset.f ?? "", a.dataset.k];
    $("domains").replaceChildren(...state.domains.map((d, i) => h("fieldset", { class: "domain", "data-d": i },
      // 번호는 서버 오류의 "도메인 N" 과 같게: spec 기존 도메인 수 기준(nav 전용 기존 항목 제외)
      h("legend", {}, `도메인 ${(boot.initial?.domains?.length ?? 0) + i + 1}`, h("span", { class: "row tools" },
        h("button", { type: "button", class: "kds-text-button", "data-act": "up", disabled: i === 0 }, "위로"),
        h("button", { type: "button", class: "kds-text-button", "data-act": "down", disabled: i === state.domains.length - 1 }, "아래로"),
        h("button", { type: "button", class: "kds-text-button danger", "data-act": "del-domain" }, "삭제"))),
      h("div", { class: "grid4" },
        field("메뉴 이름", input({ "data-k": "label", value: d.label, placeholder: "경비" })),
        field("영문 단수", input({ "data-k": "entity", value: d.entity, placeholder: "expense" })),
        field("복수형(경로)", input({ "data-k": "plural", value: d.plural, placeholder: d.entity ? `${d.entity}s` : "자동" })),
        field("접근", h("select", { class: "kds-field__input kds-select", "data-k": "auth" },
          h("option", { value: "required", selected: d.auth === "required" }, "로그인 필요"),
          h("option", { value: "public", selected: d.auth === "public" }, "공개(익명 CRUD)")))),
      h("div", { class: "fields" }, d.fields.map((f, j) => h("div", { class: "field-row", "data-f": j },
        input({ "data-k": "label", value: f.label, placeholder: "라벨", "aria-label": "필드 라벨" }),
        input({ "data-k": "name", value: f.name, placeholder: "영문 이름", "aria-label": "필드 영문 이름" }),
        h("select", { class: "kds-field__input kds-select", "data-k": "type", "aria-label": "필드 타입" }, boot.fieldTypes.map(([t, text]) => h("option", { value: t, selected: f.type === t }, text))),
        f.type === "enum" ? input({ "data-k": "optionsText", value: f.optionsText, placeholder: "OPEN=진행|DONE=종료", "aria-label": "선택지" })
          : f.type === "ref" ? input({ "data-k": "target", value: f.target, list: "targets", placeholder: "users", "aria-label": "참조 대상 복수형" })
            : h("span"),
        h("label", { class: "kds-checkbox" }, h("input", { type: "checkbox", "data-k": "required", checked: f.required }), "필수"),
        h("button", { type: "button", class: "kds-text-button danger", "data-act": "del-field", "aria-label": "필드 삭제" }, icon("close"))))),
      h("button", { type: "button", class: "kds-text-button", "data-act": "add-field" }, "+ 필드"))));
    renderTargets();
    if (key) $("domains").querySelector(`[data-d="${key[0]}"] ${key[1] ? `[data-f="${key[1]}"] ` : ""}[data-k="${key[2]}"]`)?.focus();
  };
  const renderTargets = () => $("targets").replaceChildren(h("option", { value: "users" }, "사용자"), ...all().filter((d) => plural(d) && (state.domains.includes(d) || !update || boot.refTargets?.includes(plural(d)))).map((d) => h("option", { value: plural(d) }, d.label)));

  // ── 프로토타입 ───────────────────────────────────
  // 모든 선택이 화면에 보인다. 선택을 바꾸면 그 선택이 보이는 화면(목록·상세·폼·상태·로그인, PC·모바일)으로 이동한다.
  // 도메인이 아직 없으면 예시 도메인으로 보여 준다(spec 에는 들어가지 않는다).
  const SAMPLE = toState({ entity: "task", label: "예시 업무", fields: [
    { name: "status", label: "상태", type: "enum", required: true, options: [["OPEN", "진행"], ["DONE", "종료"]] },
    { name: "dueDate", label: "마감일", type: "date" }, { name: "assignee", label: "담당자", type: "ref", target: "users" }] });
  const doms = () => (all().length ? all() : [SAMPLE]);
  let device = "pc", menuOpen = false, leaveAsk = false, changedKey = null, c = state.choices, layers = [];
  const optText = (key) => boot.variations.find((x) => x.key === key)?.options.find(([value]) => value === state.choices[key])?.[1] ?? "";
  const B = "kds-button kds-button--";
  const icon = (name) => h("span", { class: `kds-icon ic-line-${name}`, "aria-hidden": "true" });
  const name = (d) => d.label || "항목";
  const lab = (f) => f.label || f.name || "필드";
  const sample = (f, n) => {
    if (f.type === "int") return String(n * 10);
    if (f.type === "num") return (n * 1.5).toFixed(1);
    if (f.type === "bool") return n % 2 ? "예" : "아니오";
    if (f.type === "date") return `2026-11-0${n}`;
    if (f.type === "datetime") return `2026-11-0${n} 1${n}:00`;
    if (f.type === "enum") { const opts = f.optionsText.split("|").filter(Boolean); return opts.length ? (opts[(n - 1) % opts.length].split("=")[1] ?? "") : "-"; }
    if (f.type === "ref") return `${all().find((d) => plural(d) === f.target)?.label ?? "사용자"} ${n}`;
    return `${lab(f)} ${n}`;
  };
  const go = (kind, i, text, cls = "proto-link", edit = false) => h("button", { type: "button", class: cls, "data-view": kind, "data-i": i ?? "", "data-edit": edit ? "1" : null }, text);
  const act = (what, text, cls, aria) => h("button", { type: "button", class: cls, "data-proto": what, "aria-label": aria }, text);
  const fake = (text, cls = `${B}tertiary`) => h("span", { class: `${cls} proto-fake` }, text); // 모양만 보여 주는 버튼
  const pill = (text) => h("span", { class: "proto-pill" }, text);
  const sub = (text) => h("p", { class: "proto-sub" }, text);
  const note = (text, tone = "info") => h("p", { class: `proto-notice is-${tone}` }, text);
  const off = (attrs = {}) => h("input", { class: "kds-field__input", disabled: true, ...attrs });
  const strip = (items, cur, cls) => h("div", { class: cls }, items.map((s, k) => h("span", { "aria-current": k === cur ? "true" : null }, s)));
  const kv = (pairs) => h("dl", { class: "proto-kv" }, pairs.flatMap(([k, val]) => [h("dt", {}, k), h("dd", {}, val)]));
  const helpText = (text) => (c.help === "text" ? h("p", { class: "hint" }, text) : null);
  const heading = (text, d, ...extra) => h("h3", {}, text, d?.auth === "public" ? h("span", { class: "kds-tag kds-tag--info" }, "공개") : null,
    c.help === "tooltip" ? h("span", { class: "proto-tip", title: "이 화면 도움말" }, "?") : null, extra);
  const layer = (kind, close, ...children) => h("div", { class: `proto-layer is-${kind}` }, h("div", { class: "proto-layer-box" }, close, children));
  const closeTo = (kind, i) => { const button = go(kind, i, icon("close"), "kds-icon-button proto-close"); button.setAttribute("aria-label", "닫기"); return button; };

  const HOME = { dashboard: "대시보드", list: "작업 목록", recent: "최근 작업", role: "시작 화면" };
  const current = (kind, i) => c.location !== "breadcrumb" && (kind === "list" ? !["home", "search", "login"].includes(view.kind) && view.i === i : view.kind === kind);
  const menu = () => {
    const ds = doms(), mobile = device === "mobile";
    const item = (kind, i, text, cls = "proto-link") => { const b = go(kind, i, text, cls); if (current(kind, i)) b.setAttribute("aria-current", "page"); return b; };
    const items = (mobile && c.mobileScope === "primary" ? ds.slice(0, 2) : ds).map((d) => item("list", ds.indexOf(d), name(d), `proto-link${c.menuDepth === "nested" ? " is-sub" : ""}`));
    return [item("home", undefined, HOME[c.home]),
      c.menuDepth === "flat" ? items : [h("span", { class: "proto-menu-group" }, c.menuDepth === "nested" ? "업무 ▾" : "업무"), items],
      c.globalSearch === "page" ? item("search", undefined, "검색") : null,
      mobile && c.mobileScope === "primary" && ds.length > 2 ? h("small", { class: "hint" }, "나머지 메뉴는 PC에서") : null];
  };

  // 필드 입력 (등록·수정 폼)
  const control = (f) => {
    if (f.type === "date") return h("span", { class: "kds-datepicker" }, h("input", { class: "kds-field__input", readOnly: true, placeholder: "날짜 선택", "aria-label": lab(f) }));
    if (f.type === "long") return h("textarea", { class: "kds-field__input", rows: 2, disabled: true });
    if (f.type === "bool") return h("label", { class: "kds-checkbox" }, h("input", { type: "checkbox", disabled: true }), lab(f));
    if (f.type === "ref" && c.relation === "combobox") return off({ placeholder: "이름으로 검색해 선택…" });
    if (f.type === "ref" && c.relation === "modal") return h("div", { class: "row" }, off({ class: "kds-field__input proto-grow", placeholder: "선택 안 됨" }), fake("선택…"));
    if (f.type === "enum" || f.type === "ref") return h("select", { class: "kds-field__input kds-select", disabled: true }, h("option", {}, sample(f, 1)));
    return off({ placeholder: { int: "0", num: "0.0", date: "YYYY-MM-DD", datetime: "YYYY-MM-DD HH:mm" }[f.type] ?? "" });
  };
  const formView = (d, i, edit) => {
    const fields = c.formReuse === "simple" && !edit ? d.fields.filter((f) => f.required) : d.fields;
    const one = (f) => (f.type === "bool" ? control(f) : field(`${lab(f)}${f.required ? " *" : ""}`, control(f)));
    const half = Math.ceil(fields.length / 2);
    const titleField = h("label", { class: "kds-field kds-field--error" }, h("span", { class: "kds-field__label" }, "제목 *"), off(),
      h("span", { class: "kds-field__helper" }, `제목을 입력하세요 · ${{ submit: "제출할 때", blur: "필드를 벗어날 때", input: "입력하는 동안" }[c.validation]} 검증`));
    const upload = field("첨부", c.upload === "drop" ? h("div", { class: "proto-drop" }, "파일을 끌어다 놓거나 눌러서 선택")
      : h("div", { class: "row" }, fake(c.upload === "multiple" ? "파일 여러 개 선택" : "파일 선택"), h("small", { class: "hint" }, c.upload === "multiple" ? "최대 10개" : "1개")));
    const extra = c.conditional === "conditional" ? [h("label", { class: "kds-checkbox" }, h("input", { type: "checkbox", checked: true, disabled: true }), "추가 조건 입력"), h("div", { class: "proto-indent" }, field("조건 항목", off()))]
      : c.conditional === "repeat" ? h("div", { class: "proto-indent" }, sub("반복 항목"), [1, 2].map((n) => h("div", { class: "row" }, off({ class: "kds-field__input proto-grow", placeholder: `항목 ${n}` }), fake(icon("close"), "kds-icon-button"))), fake("+ 항목 추가", "kds-text-button"))
        : null;
    const basic = [titleField, fields.slice(0, half).map(one)];
    const more = [fields.slice(half).map(one), field("메모", h("textarea", { class: "kds-field__input", rows: 2, disabled: true })), upload, extra];
    const steps = ["기본 정보", "추가 정보", ...(c.formLayout === "wizard" ? ["확인"] : [])];
    const body = c.formLayout === "single" ? [basic, more] : c.formLayout === "sections" ? [sub("기본 정보"), basic, sub("추가 정보"), more]
      : [strip(steps, 0, c.formLayout === "tabs" ? "proto-tabs" : "proto-steps"), basic];
    const [afterKind, afterText] = { detail: ["detail", "상세"], list: ["list", "목록"], stay: ["form", "현재 화면"], next: ["form", "다음 작업"] }[c.afterSave];
    const submit = c.formLayout === "wizard" ? fake("다음", `${B}primary`) : go(afterKind, i, c.save === "draft" ? "제출" : "저장", `${B}primary`, afterKind === "form" && edit);
    const actions = c.save === "auto" ? [h("small", { class: "hint" }, "✓ 자동 저장됨 · 방금"), act("leave", "닫기", `${B}tertiary`)]
      : [c.save === "draft" ? fake("임시 저장", `${B}secondary`) : null, act("leave", "취소", `${B}secondary`), submit];
    const bar = c.sticky === "actions" || (device === "mobile" && c.actionPlacement !== "top");
    return [heading(edit ? `${name(d)} 1 수정${c.formReuse === "separate" ? " (수정 전용 화면)" : ""}` : `새 ${name(d)}${c.formReuse === "simple" ? " · 필수 항목만" : ""}`, d),
      helpText("* 표시는 필수 입력입니다."),
      c.leave === "recover" ? note("임시 저장된 내용이 있습니다. 복구할까요?") : null,
      edit ? note({ notice: "다른 사용자가 먼저 수정했습니다. 새로고침 후 다시 저장하세요.", compare: "최신 값과 다릅니다 — 내 값: 회의 A / 최신 값: 회의 B 중 고르세요.", lock: "사용자2가 편집 중입니다. 잠금이 풀리면 수정할 수 있습니다." }[c.conflict], "warning") : null,
      body, h("div", { class: bar ? "proto-actionbar" : "row" }, actions, h("small", { class: "hint" }, `저장 후 → ${afterText}`))];
  };

  const detailView = (d, i) => {
    const readonly = c.permissionUi === "readonly";
    const file = c.fileView === "download" ? "견적서.pdf · 다운로드" : h("div", { class: "proto-thumb" }, c.fileView === "image" ? "이미지 미리보기" : "문서 뷰어 · 1/3쪽");
    const flow = c.workflow === "approval" ? [fake("제출", `${B}primary`), fake("승인", `${B}secondary`), fake("반려", `${B}secondary`)]
      : c.workflow === "stages" ? fake("다음 단계 →", `${B}primary`) : null;
    return [heading(`${name(d)} 1`, d, c.workflow === "approval" ? h("span", { class: "kds-tag kds-tag--progress" }, "승인 대기") : null, readonly ? h("span", { class: "kds-tag" }, "읽기 전용") : null),
      c.workflow === "stages" ? strip(["1 접수", "2 검토", "3 완료"], 1, "proto-steps") : null,
      kv([["제목", `${name(d)} 1`], ...d.fields.map((f) => [lab(f), sample(f, 1)]), ...(c.collaboration === "assign" ? [["담당자", "사용자2"]] : []), ["메모", "-"], ["첨부", file]]),
      c.reason !== "none" ? field(`처리 사유${c.reason === "required" ? " *" : " (선택)"}`, h("textarea", { class: "kds-field__input", rows: 2, disabled: true })) : null,
      h("div", { class: "row" }, flow, readonly ? null : go("form", i, "수정", `${B}secondary`, true),
        c.permissionUi === "disable" ? h("span", { class: `${B}tertiary proto-fake is-disabled`, title: "권한 없음" }, "삭제") : null,
        go("list", i, "목록", `${B}tertiary`), c.permissionUi !== "hide" ? h("small", { class: "hint" }, "예: 삭제 권한 없음") : null),
      c.collaboration === "comments" ? [sub("댓글"), h("p", { class: "proto-comment" }, "사용자2 · @사용자1 확인 부탁드립니다"), off({ placeholder: "댓글 입력 (@멘션)" })] : null,
      c.history === "last" ? h("small", { class: "hint" }, "최종 수정 2026-11-01 · 사용자1")
        : c.history === "timeline" ? [sub("활동"), h("ul", { class: "proto-timeline" }, ["사용자1이 생성", "사용자2가 상태 변경", "사용자1이 메모 수정"].map((t) => h("li", {}, t)))]
          : h("div", { class: "row" }, h("span", { class: "kds-tag" }, "v3"), fake("v2와 비교")),
    ];
  };

  const listView = (d, i) => {
    const mobile = device === "mobile", shape = mobile ? c.compactList : c.list;
    const cols = d.fields.filter((f) => f.type !== "long");
    const shown = mobile && c.mobileData !== "scroll" ? cols.slice(0, 1) : cols;
    const rest = cols.slice(shown.length);
    const place = mobile ? c.actionPlacement : c.sticky === "actions" ? "bottom" : "top";
    const create = mobile && c.mobileScope === "read" ? null : go("form", i, `새 ${name(d)}`, `${B}tertiary`);
    if (create && place === "floating") layers.push(h("button", { type: "button", class: "proto-fab", "data-view": "form", "data-i": i, "aria-label": `새 ${name(d)}` }, icon("add")));
    const filters = [h("select", { class: "kds-field__input kds-select", disabled: true }, h("option", {}, "상태: 전체")), h("select", { class: "kds-field__input kds-select", disabled: true }, h("option", {}, "기간: 이번 달")),
      c.filterApply === "button" ? fake("적용", `${B}secondary`) : c.filterApply === "builder" ? fake("+ 조건 추가") : h("small", { class: "hint" }, "바꾸면 바로 적용")];
    const en = d.fields.find((f) => f.type === "enum");
    const keyOf = { status: (n) => (en ? sample(en, n) : n < 3 ? "진행 중" : "종료"), date: (n) => (n < 3 ? "오늘" : "어제") }[c.group];
    const groups = keyOf ? [...Map.groupBy([1, 2, 3], keyOf)] : [[null, [1, 2, 3]]];
    const title = (n) => go("detail", i, `${name(d)} ${n}`);
    const value = (f, n) => (c.quick === "inline" && f === shown[0] ? off({ value: sample(f, n), class: "kds-field__input proto-cell" }) : sample(f, n));
    const quick = c.quick === "row" ? () => h("span", { class: "row" }, go("form", i, "수정", "kds-text-button", true), fake("삭제", "kds-text-button"))
      : c.quick === "context" ? () => fake("⋯", "kds-text-button") : () => null;
    const check = c.bulk === "selected" ? (n) => h("input", { type: "checkbox", checked: n < 3, disabled: true, "aria-label": "선택" }) : () => null;
    const expand = (n) => (mobile && c.mobileData === "expand" && rest.length ? h("details", {}, h("summary", {}, "더 보기"), kv(rest.map((f) => [lab(f), sample(f, n)]))) : null);
    const results = shape === "table"
      ? h("div", { class: "kds-table-wrap" }, h("table", { class: `kds-table${mobile && c.mobileData === "scroll" ? " is-wide" : ""}` },
        h("thead", {}, h("tr", {}, c.bulk === "selected" ? h("th", {}, "") : null, h("th", {}, "제목"), shown.map((f) => h("th", {}, lab(f))), c.quick === "row" || c.quick === "context" || (mobile && c.mobileData === "expand") ? h("th", {}, "") : null)),
        h("tbody", {}, groups.map(([g, ns]) => [g ? h("tr", { class: "proto-group-row" }, h("td", { colSpan: shown.length + 3 }, g)) : null,
          ns.map((n) => h("tr", {}, c.bulk === "selected" ? h("td", {}, check(n)) : null, h("td", {}, title(n)), shown.map((f) => h("td", {}, value(f, n))),
            mobile && c.mobileData === "expand" ? h("td", {}, fake("▸", "kds-text-button")) : quick() ? h("td", {}, quick()) : null))]))))
      : groups.map(([g, ns]) => [g ? sub(g) : null, h("div", { class: shape === "card" ? "proto-cards" : "proto-list" },
        ns.map((n) => h("div", { class: shape === "card" ? "kds-card proto-card" : "proto-item" },
          h("div", { class: "row" }, check(n), title(n), shape === "list" ? h("small", { class: "hint" }, shown.map((f) => sample(f, n)).join(" · ")) : null, quick()),
          shape === "card" ? kv(shown.map((f) => [lab(f), value(f, n)])) : null, expand(n))))]);
    return [h("div", { class: "row between" }, heading(name(d), d),
      h("div", { class: "row" }, c.views === "columns" ? fake("컬럼·밀도 설정") : c.views === "saved" ? fake("보기: 기본 ▾") : null, place === "top" ? create : null)),
      helpText(`${name(d)} 목록입니다. 제목을 누르면 상세로 이동합니다.`),
      h("div", { class: "row" }, h("div", { class: "kds-search proto-grow" }, h("input", { placeholder: { submit: "검색어", instant: "입력하면 바로 검색", enter: "검색어 입력 후 Enter" }[c.search], disabled: true }), h("button", { type: "button", class: "kds-icon-button", "aria-label": "검색", disabled: true }, icon("search"))),
        c.search === "submit" ? fake("검색", `${B}secondary`) : null, c.filterPlacement === "overlay" ? fake("필터 ▾") : null,
        c.searchState === "saved" ? fake("저장된 검색 ▾") : c.searchState === "session" ? h("small", { class: "hint" }, "조건은 이 탭에서 유지") : null),
      c.filterPlacement === "top" ? h("div", { class: "row proto-filters" }, filters) : null,
      h("div", { class: c.filterPlacement === "side" ? "proto-side" : "proto-col" }, c.filterPlacement === "side" ? h("div", { class: "proto-filters is-side" }, sub("필터"), filters) : null,
        h("div", { class: "proto-col" },
          h("div", { class: "row between" }, h("small", { class: "kds-result-count" }, "3건"), h("div", { class: "row" },
            c.bulk === "selected" ? [h("small", {}, "2개 선택"), fake("선택 삭제")] : c.bulk === "query" ? fake("검색 결과 전체(3건) 작업 ▾") : null,
            c.group === "user" ? fake("그룹: 없음 ▾") : null,
            { fixed: h("small", { class: "hint" }, "최신순"), single: fake("정렬: 최신순 ▾"), multi: [pill("작성일 ↓"), pill("제목 ↑"), fake("+", "kds-text-button")] }[c.sort])),
          results,
          { pagination: h("div", { class: "row proto-center" }, ["‹", "1", "2", "3", "›"].map((p) => h("span", { class: "proto-page-num", "aria-current": p === "1" ? "page" : null }, p))),
            more: h("div", { class: "proto-center" }, fake("더 보기", `${B}secondary`)), infinite: h("p", { class: "hint proto-center" }, "⟳ 스크롤하면 더 불러옵니다") }[c.paging])),
      create && place === "bottom" ? h("div", { class: "proto-actionbar" }, create) : null];
  };

  const homeView = () => {
    const ds = doms();
    if (c.home === "list") return listView(ds[0], 0);
    if (c.home === "recent") return [heading("최근 작업"), h("div", { class: "proto-list" }, ds.flatMap((d, i) => [1, 2].map((n) => h("div", { class: "proto-item row" }, go("detail", i, `${name(d)} ${n}`), h("small", { class: "hint" }, `${n}시간 전`)))))];
    return [heading(c.home === "role" ? "내 시작 화면" : "대시보드"), helpText(`${state.title || "서비스"}에 오신 것을 환영합니다.`),
      c.home === "role" ? h("div", { class: "row" }, pill("사용자 → 내 작업"), pill("승인자 → 승인 대기"), pill("관리자 → 운영 현황")) : null,
      h("div", { class: "proto-cards" }, ds.map((d, i) => h("div", { class: "kds-card proto-card" }, h("small", { class: "hint" }, name(d)), h("b", {}, "3건"), go("list", i, "목록 보기", "kds-text-button"))))];
  };

  const statesView = (d, i) => {
    const box = (key, title, body) => h("section", { class: `proto-state${changedKey === key ? " is-changed" : ""}` }, sub(`${title} · ${optText(key)}`), body);
    return [heading("상태 예시"), h("p", { class: "hint" }, "피드백 선택이 실제 화면에서 어떻게 보이는지 모았습니다."),
      box("loading", "로딩", { spinner: h("p", { class: "hint" }, "⟳ 불러오는 중…"), skeleton: [1, 2, 3].map(() => h("div", { class: "proto-skeleton" })), retain: h("p", { class: "proto-dim" }, `${name(d)} 1 · ${name(d)} 2 `, pill("갱신 중")) }[c.loading]),
      box("success", "성공", { toast: h("span", { class: "proto-toast" }, "✓ 저장했습니다"), inline: note("저장했습니다.", "positive"), page: h("div", { class: "kds-card proto-card" }, h("b", {}, "저장 완료"), fake("목록으로")) }[c.success]),
      box("error", "오류", { field: h("label", { class: "kds-field kds-field--error" }, h("span", { class: "kds-field__label" }, "마감일"), off({ value: "2026-13-01" }), h("span", { class: "kds-field__helper" }, "올바른 날짜가 아닙니다")),
        summary: note("입력 오류 2건: 제목, 마감일", "critical"), page: h("div", { class: "kds-card proto-card" }, h("b", {}, "문제가 발생했습니다"), h("small", { class: "hint" }, "추적 ID 7f3a…"), fake("다시 시도")) }[c.error]),
      box("empty", "빈 화면", h("div", { class: "proto-empty" }, `등록된 ${name(d)}이(가) 없습니다.`,
        c.empty === "action" ? go("form", i, `첫 ${name(d)} 만들기`, `${B}primary`) : c.empty === "guide" ? h("span", { class: "row" }, fake("샘플 넣기"), fake("가이드 보기")) : null)),
      box("deletion", "삭제", { confirm: h("div", { class: "kds-card proto-card" }, `${name(d)} 1을(를) 삭제할까요?`, h("span", { class: "row" }, fake("삭제", `${B}primary`), fake("취소"))),
        trash: note("휴지통으로 옮겼습니다. 30일 뒤 영구 삭제됩니다."), undo: h("span", { class: "proto-toast" }, "삭제했습니다 · 실행 취소") }[c.deletion]),
      box("longTask", "일괄 작업", { wait: h("p", { class: "hint" }, "⟳ 처리 중… 완료될 때까지 기다려 주세요"), progress: h("progress", { class: "proto-progress", max: 100, value: 60 }),
        background: note("백그라운드 작업 1건 진행 중 · 끝나면 알려 드립니다") }[c.longTask])];
  };

  const loginView = () => {
    const card = h("div", { class: "kds-card proto-card proto-login" }, h("b", {}, "로그인"), field("이메일", off()), field("비밀번호", off({ type: "password" })), go("home", undefined, "로그인", `${B}primary`),
      h("small", { class: "hint" }, { admin: "계정은 운영자가 발급합니다.", invite: "초대 메일의 링크로 가입합니다.", signup: "계정이 없나요? 회원가입" }[c.enrollment]));
    if (c.entry === "required") return card;
    return [heading(c.entry === "public" ? "공개 홈" : "둘러보기"), h("p", { class: "hint" }, c.entry === "public" ? "로그인 없이 볼 수 있고, 작성할 때 로그인합니다." : "공개 메뉴는 바로 보고, 나머지는 로그인 후 이용합니다."),
      h("div", { class: "proto-list" }, doms().map((d) => h("div", { class: "proto-item row" }, name(d), c.entry === "mixed" && d.auth !== "public" ? pill("로그인 필요") : null))), card];
  };

  const searchView = () => [heading("전체 검색"), off({ placeholder: "모든 메뉴에서 검색" }),
    h("div", { class: "proto-list" }, doms().map((d, i) => h("div", { class: "proto-item row" }, go("detail", i, `${name(d)} 1`), h("small", { class: "hint" }, name(d)))))];

  const screen = () => {
    const ds = doms(), i = Math.min(view.i ?? 0, ds.length - 1), d = ds[i], mobile = device === "mobile";
    if (view.kind === "login") return loginView();
    if (view.kind === "states") return statesView(d, i);
    if (view.kind === "search") return searchView();
    if (!["list", "detail", "form"].includes(view.kind)) return homeView();
    if (view.kind === "form" && c.editor !== "page") { layers.push(layer(c.editor, closeTo("list", i), formView(d, i, view.edit))); return listView(d, i); }
    if (view.kind === "form") return formView(d, i, view.edit);
    if (view.kind === "detail" && (c.detail === "modal" || c.detail === "drawer")) { layers.push(layer(c.detail, closeTo("list", i), detailView(d, i))); return listView(d, i); }
    if (!mobile && c.detail === "split") return h("div", { class: "proto-split" }, h("div", { class: "proto-col" }, listView(d, i)),
      h("div", { class: "proto-pane" }, view.kind === "detail" ? detailView(d, i) : h("p", { class: "hint" }, "항목을 고르면 여기에 상세가 보입니다.")));
    return view.kind === "detail" ? detailView(d, i) : listView(d, i);
  };

  const renderProto = () => {
    c = state.choices; layers = [];
    const mobile = device === "mobile", login = view.kind === "login", ds = doms(), d = ds[Math.min(view.i ?? 0, ds.length - 1)];
    const content = screen();
    const narrow = !mobile && !(c.detail === "split" && ["list", "detail"].includes(view.kind)) && (c.width === "fixed" || (c.width === "per-page" && (view.kind === "form" || view.kind === "detail")));
    const crumb = c.location !== "active" && !login ? h("p", { class: "proto-crumb" }, ["홈", ...(["home", "search"].includes(view.kind) ? [] : [name(d)]),
      { home: HOME[c.home], search: "검색", list: "목록", detail: "상세", form: view.edit ? "수정" : "새로 만들기", states: "상태 예시" }[view.kind]].join(" › ")) : null;
    const auxBody = [sub("정보 패널"), kv([["이번 주", "3건"], ["내 담당", "1건"]])];
    const aux = c.auxiliary === "none" || login ? null : mobile
      ? { merge: h("div", { class: "proto-aux is-inline" }, auxBody), collapse: h("details", { class: "proto-aux is-inline" }, h("summary", {}, "정보 패널"), auxBody), page: fake("정보 패널 보기 ›") }[c.mobileAuxiliary]
      : c.auxiliary === "panel" ? h("aside", { class: "proto-aux" }, auxBody) : h("aside", { class: "proto-aux" }, h("details", {}, h("summary", {}, "작업 패널"), auxBody));
    const burger = mobile && c.compactMenu !== "bottom" && !login ? act("menu", icon("menu"), "kds-icon-button proto-burger", "메뉴") : null;
    const user = c.entry === "public" ? go("login", undefined, "로그인", `${B}secondary`) : h("span", {}, "사용자1 · ", go("login", undefined, "로그아웃"));
    const gnb = h("header", { class: `proto-gnb${c.sticky === "header" ? " is-sticky" : ""}` }, c.trigger === "left" ? burger : null, h("b", {}, state.title || "서비스"),
      mobile ? null : [c.organization !== "single" ? pill(c.organization === "multi" ? "조직 A ▾" : "개인·팀 ▾") : null,
        c.spaces !== "single" ? pill(c.spaces === "project" ? "프로젝트 A ▾" : "Workspace ▾") : null,
        c.navigation === "top" && !login ? h("nav", { "aria-label": "프로토타입 메뉴" }, menu()) : null],
      h("span", { class: "proto-gnb-end" }, mobile ? null : [
        c.globalSearch === "header" ? off({ class: "kds-field__input proto-gnb-search", placeholder: "전체 검색" }) : c.globalSearch === "command" ? pill("⌘K 명령") : null,
        c.areas !== "single" ? pill(c.areas === "admin" ? "관리자 포털" : "공개 사이트") : null,
        c.locale !== "ko" ? pill(c.locale === "bilingual" ? "KO | EN" : "KO · KST · 1,234.5") : null],
      pill({ inapp: "알림 3", email: "알림 · 메일", subscriptions: "알림 · 구독 설정" }[c.notifications]),
      c.longTask === "background" ? pill("작업 1건 ⟳") : null, mobile || login ? null : user),
      c.trigger === "right" ? burger : null);
    const tabs = mobile || login ? null : c.switching === "tabs" ? strip(["대시보드 ✕", ...ds.slice(0, 3).map((x) => `${name(x)} ✕`)], view.kind === "home" ? 0 : (view.i ?? 0) + 1, "proto-tabs proto-worktabs")
      : c.switching === "recent" ? h("div", { class: "row proto-recent" }, h("small", { class: "hint" }, "최근 방문"), ds.slice(0, 3).map((x, k) => go("list", k, name(x), "kds-chip"))) : null;
    if (mobile && menuOpen && c.compactMenu === "drawer") layers.push(layer(c.trigger === "left" ? "drawer-left" : "drawer", act("menu", "✕", "kds-text-button proto-close", "메뉴 닫기"), h("nav", { class: "proto-menu" }, menu())));
    if (leaveAsk) layers.push(layer("modal", null, h("b", {}, "작성 중인 내용이 있습니다"), h("p", { class: "hint" }, "저장하지 않고 나갈까요?"),
      h("div", { class: "row" }, go("list", view.i, "나가기", `${B}primary`), act("stay", "계속 작성", `${B}tertiary`))));
    if (c.help === "onboarding" && !login) layers.push(h("div", { class: "proto-coach" }, h("b", {}, "처음 사용하시나요? 1/3"), h("p", { class: "hint" }, "메뉴에서 업무를 고르고 '새로 만들기'로 시작하세요."), fake("다음", `${B}primary`)));
    const p = `/${plural(d)}`;
    const url = { home: "/", login: "/login", search: "/search", list: p, states: p, detail: `${p}/1`, form: view.edit ? `${p}/1/edit` : `${p}/new` }[view.kind]
      + (view.kind === "list" && c.searchState === "url" ? "?q=회의&status=OPEN&sort=latest" : "");
    $("proto").replaceChildren(h("div", { class: "proto", "data-mode": c.theme === "dark" ? "dark" : null, "data-device": device, "data-density": c.density },
      mobile ? null : h("div", { class: "proto-url" }, `app.local${url}`),
      h("div", { class: "proto-screen" }, gnb,
        mobile && menuOpen && c.compactMenu === "inline" ? h("nav", { class: "proto-menu is-inline" }, menu()) : null, tabs,
        h("div", { class: "proto-body" },
          !mobile && !login && c.navigation === "sidebar" ? h("nav", { class: "proto-lnb", "aria-label": "프로토타입 메뉴" }, menu()) : null,
          h("main", {}, crumb, h("div", { class: `proto-page${narrow ? " is-fixed" : ""}` }, content, mobile ? aux : null)),
          mobile ? null : aux, !mobile && !login && c.help === "panel" ? h("aside", { class: "proto-aux" }, sub("도움말"), h("p", { class: "hint" }, "이 화면에서 목록을 검색하고 새 항목을 만듭니다.")) : null),
        mobile && c.compactMenu === "bottom" && !login ? h("nav", { class: "proto-bottomnav" }, menu().flat(Infinity).filter((el) => el?.tagName === "BUTTON").slice(0, 5)) : null),
      layers));
    for (const b of document.querySelectorAll("[data-device]")) b.setAttribute("aria-pressed", String(b.dataset.device === device));
    $("proto-note").hidden = all().length > 0;
  };

  // 선택이 보이는 화면으로 이동한다.
  const focusChoice = (key) => {
    const x = boot.variations.find((v) => v.key === key);
    changedKey = key; menuOpen = false; leaveAsk = false;
    $("changed").textContent = `${x.label} → ${optText(key)}`;
    const i = view.i ?? 0, g = x.group;
    if (g === "반응형" || key === "compactList") { device = "mobile"; view = { kind: "list", i }; menuOpen = key === "compactMenu" || key === "trigger"; return; }
    if (["생성 시 적용", "전체 구조", "이동", "목록·탐색", "상세·입력"].includes(g)) device = "pc";
    if (g === "목록·탐색") view = { kind: "list", i };
    else if (key === "detail" || key === "fileView" || key === "permissionUi" || g === "업무") view = { kind: "detail", i };
    else if (key === "conflict" || (key === "formReuse" && state.choices.formReuse === "separate")) view = { kind: "form", i, edit: true };
    else if (g === "상세·입력" || key === "upload") view = { kind: "form", i };
    else if (g === "피드백") view = { kind: "states", i };
    else if (key === "entry" || key === "enrollment") view = { kind: "login" };
    else if (key === "home") view = { kind: "home" };
    else if (key === "width") view = { kind: state.choices.width === "per-page" ? "form" : "list", i };
    else if (key === "globalSearch" && state.choices.globalSearch === "page") view = { kind: "search" };
    else if (view.kind === "login") view = { kind: "home" };
  };

  // ── 검증·계획 (서버) ─────────────────────────────
  const post = (path, body) => fetch(path, { method: "POST", headers: { "Content-Type": "application/json", "X-Init-Token": boot.token }, body: JSON.stringify(body) });
  let timer;
  const plan = () => { clearTimeout(timer); timer = setTimeout(async () => {
    try {
      const response = await post("/plan", toSpec());
      const data = await response.json();
      if (!response.ok) { $("errors").replaceChildren(...(data.errors ?? [data.error]).map((e) => h("li", {}, e))); return; }
      $("steps").replaceChildren(...data.steps.map((s) => h("li", {}, s)));
      $("errors").replaceChildren(...data.errors.map((e) => h("li", {}, e)));
    } catch { $("status").textContent = "설문 서버에 연결할 수 없습니다. 터미널에서 init 이 실행 중인지 확인하세요."; }
  }, 250); };
  // 기존 프로젝트 설문은 현재 구조가 초기값이라 브라우저 저장값을 쓰지 않는다.
  const changed = () => { try { if (!update) localStorage.setItem(STORE, JSON.stringify(toSpec())); } catch { /* 저장 불가 환경에서도 제출 가능 */ } renderProto(); plan(); };
  const renderAll = () => { renderChoices(); renderDomains(); changed(); };

  // ── 이벤트 ───────────────────────────────────────
  form.addEventListener("input", (event) => {
    const t = event.target;
    if (t.name === "name" || t.name === "title") state[t.name] = t.value;
    else if (t.name === "example") state.example = t.checked;
    else if (t.name?.startsWith("c:")) { state.choices[t.name.slice(2)] = t.value; updateCounts(); focusChoice(t.name.slice(2)); }
    else if (t.dataset.k) {
      const d = state.domains[t.closest("[data-d]").dataset.d], f = t.closest("[data-f]");
      const obj = f ? d.fields[f.dataset.f] : d;
      obj[t.dataset.k] = t.type === "checkbox" ? t.checked : t.value;
      if (t.dataset.k === "type") { renderDomains(); }
      if (!f && t.dataset.k !== "auth") renderTargets();
      // 필드는 폼에서, 메뉴 이름·접근은 목록에서 바로 확인한다.
      device = "pc"; view = { kind: f ? "form" : "list", i: existing.length + Number(t.closest("[data-d]").dataset.d) };
    }
    changed();
  });
  form.addEventListener("click", (event) => {
    const b = event.target.closest("[data-act]"); if (!b) return;
    const i = Number(b.closest("[data-d]")?.dataset.d), list = state.domains;
    const act = b.dataset.act;
    if (act === "add-domain") list.push({ entity: "", label: "", plural: "", auth: "required", fields: [blankField()] });
    else if (act === "del-domain") { list.splice(i, 1); view = { kind: "home" }; }
    else if (act === "up" || act === "down") { const j = act === "up" ? i - 1 : i + 1; [list[i], list[j]] = [list[j], list[i]]; }
    else if (act === "add-field") list[i].fields.push(blankField());
    else if (act === "del-field") list[i].fields.splice(Number(b.closest("[data-f]").dataset.f), 1);
    else if (act === "export") { const url = URL.createObjectURL(new Blob([JSON.stringify(toSpec(), null, 2)], { type: "application/json" })); h("a", { href: url, download: "project.spec.json" }).click(); setTimeout(() => URL.revokeObjectURL(url), 1000); return; } // 즉시 해제하면 Firefox 가 다운로드를 취소한다
    else return;
    renderDomains(); changed();
  });
  document.querySelector(".preview").addEventListener("click", (event) => {
    const b = event.target.closest("[data-view], [data-proto], [data-device]"); if (!b) return;
    if (b.dataset.device) { device = b.dataset.device; menuOpen = false; }
    else if (b.dataset.proto === "menu") menuOpen = !menuOpen;
    else if (b.dataset.proto === "stay") leaveAsk = false;
    else if (b.dataset.proto === "leave") { if (state.choices.leave === "confirm") leaveAsk = true; else view = { kind: "list", i: view.i }; }
    else { view = { kind: b.dataset.view, i: b.dataset.i === "" ? view.i : Number(b.dataset.i), edit: b.dataset.edit === "1" }; menuOpen = false; leaveAsk = false; }
    renderProto();
  });
  $("import").addEventListener("change", async (event) => {
    try { const file = event.target.files[0]; if (file) fromSpec(JSON.parse(await file.text())); } catch (error) { $("status").textContent = error.message; }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const buttons = [...form.querySelectorAll("button, input, select")];
    buttons.forEach((b) => { b.disabled = true; });
    $("status").textContent = "제출 중…";
    try {
      const response = await post("/initialize", toSpec());
      const data = await response.json();
      if (!response.ok) throw new Error((data.errors ?? [data.error]).join("\n"));
      $("status").textContent = boot.dryRun
        ? `제출 완료(--dry-run). 터미널에 계획만 출력하고 아무것도 바꾸지 않습니다. 이 창은 닫아도 됩니다.\n→ ${data.destination}`
        : `제출 완료. 터미널에서 ${update ? "레이아웃 반영·새 도메인 생성" : "설치·도메인 생성"}이 이어집니다(수 분). 이 창은 닫아도 됩니다.\n→ ${data.destination}`;
    } catch (error) {
      $("status").textContent = error.message;
      buttons.forEach((b) => { b.disabled = false; });
    }
  });
  for (const [key, preset] of Object.entries(boot.presets)) {
    $("presets").append(h("button", { type: "button", class: "kds-chip", "data-preset": key, onclick: () => { state.choices = { ...boot.defaults, ...preset.choices }; changedKey = null; $("changed").textContent = `프리셋 → ${preset.label}`; renderChoices(); changed(); } }, preset.label));
  }

  $("dest").textContent = `${update ? "적용" : "생성"} 위치: ${boot.destination}`;
  if (update) {
    // 이름·제목·예제는 이미 정해졌다(서버도 고정한다). 바꿀 수 있는 것은 레이아웃·지침 선택과 새 도메인.
    Object.assign(state, { name: boot.initial.name, title: boot.initial.title, example: boot.initial.example, choices: { ...boot.defaults, ...boot.initial.choices } });
    for (const el of [form.elements.name, form.elements.title, form.elements.example]) el.disabled = true;
    document.querySelector(".bar span").textContent = "프로젝트 구조 변경 설문";
    form.querySelector("[type=submit]").textContent = "변경 적용";
    $("existing-hint").hidden = false;
  } else {
    state.name = boot.name; state.title = boot.title;
    try { const saved = localStorage.getItem(STORE); if (saved) { fromSpec(JSON.parse(saved)); state.name = boot.name; state.title = state.title || boot.title; } } catch { /* 오래된 저장값은 무시 */ }
  }
  renderAll();
})();
