#!/usr/bin/env node
// moai-kit 함수 진입점. 프로젝트 루트에서: node <skill>/kit.mjs <함수> [매개변수]
// 출력 규칙: 성공은 한 줄, 실패는 마지막 60줄만 (토큰 절약). 의존성 없음(node 표준 라이브러리만).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkSpec, DEFAULT_CHOICES, genArgs, planSteps, structureDoc } from "./survey/catalog.mjs";
import { installKdsFonts } from "./kds-fonts.mjs";

const SKILL = path.join(path.dirname(fileURLToPath(import.meta.url)), ".."); // 스킬 루트 (scripts/ 의 상위)
const [fn, ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter((a) => /^--(no-install|no-migrate|full|example|survey|dry-run|no-open)$/.test(a)));
const params = rest.filter((a) => !flags.has(a));
const isWin = process.platform === "win32";

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

// cmd: [실행파일, ...인자]. npm 은 Windows 에서 셸이 필요하므로 사용자 입력을 넣지 않는 고정 인자만 쓴다.
function run(label, cmd, { tail = 60, show = false, env } = {}) {
  const started = Date.now();
  const [bin, ...args] = cmd;
  const viaShell = bin === "npm" && isWin;
  const r = spawnSync(viaShell ? `npm ${args.join(" ")}` : bin, viaShell ? [] : args, {
    encoding: "utf8", shell: viaShell, env: { ...process.env, ...env, FORCE_COLOR: "0" }, maxBuffer: 256 * 1024 * 1024,
  });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.trimEnd();
  const sec = ((Date.now() - started) / 1000).toFixed(0);
  if (r.status !== 0) {
    console.log(out.split(/\r?\n/).slice(-tail).join("\n"));
    die(`${label} 실패 (${sec}s)`);
  }
  if (show) console.log(out.split(/\r?\n/).slice(-tail).join("\n"));
  console.log(`✓ ${label} (${sec}s)`);
}

const node = (script, args = []) => [process.execPath, script, ...args];
const tsx = (args) => node(path.join("node_modules", "tsx", "dist", "cli.mjs"), args);
const needProject = () => {
  if (!fs.existsSync("package.json") || !fs.existsSync("scripts/gen-module.mts")) die("moai-kit 프로젝트 루트에서 실행하세요 (먼저 init).");
  if (!fs.existsSync("node_modules")) die("node_modules 없음 → npm ci");
};
const RULES_HEADING = "## 프로젝트 규칙 (항상 이 규칙을 따른다)"; // AGENTS.md 에 키트 규칙이 이미 있는지 보는 표지
const snake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

// 설문의 "생성 시 적용" 선택을 레이아웃 소스에 반영한다. init: 압축 해제한 템플릿(from=기본값), survey: 기존 프로젝트(from=현재 상태).
// 양방향(켜기·되돌리기). 모든 변경을 메모리에서 끝낸 뒤 쓴다 → 변경 지점이 하나라도 없으면 아무 파일도 바꾸지 않고 중단.
const APP_LAYOUT = "src/app/(app)/layout.tsx";
const PUBLIC_LAYOUT = "src/app/(public)/layout.tsx";
const SIDEBAR_CSS = '\n/* moai-kit init: navigation=sidebar — PC 는 좌측 Sidebar 만 쓰고 GNB 메뉴를 숨긴다 */\n[data-nav="sidebar"] .kit-gnb-inner .kit-desktop-menu { display: none; }\n';
const DARK = ' bg-bg text-fg" data-mode="dark"';
function currentChoices(root) {
  const app = fs.readFileSync(path.join(root, APP_LAYOUT), "utf8");
  return { navigation: app.includes('data-nav="sidebar"') ? "sidebar" : "top", theme: app.includes('data-mode="dark"') ? "dark" : "light" };
}
function applyChoices(root, to, from = DEFAULT_CHOICES) {
  const files = new Map();
  const missing = [];
  const patch = (rel, edit, optional = false) => {
    const f = path.join(root, rel);
    if (!fs.existsSync(f)) { if (!optional) missing.push(rel); return; }
    const before = files.get(f) ?? fs.readFileSync(f, "utf8");
    const after = edit(before);
    if (after === before) missing.push(rel); else files.set(f, after);
  };
  if (to.navigation !== from.navigation && to.navigation === "sidebar") {
    // PC(lg)는 좌측 Sidebar, 좁은 화면은 기존 GNB 햄버거. 메뉴 항목은 GNB 와 같은 식을 공유한다.
    // ponytail: Sidebar 는 Server 라 현재 메뉴 강조(aria-current)가 없다. 필요하면 usePathname 쓰는 작은 Client 래퍼로.
    patch(APP_LAYOUT, (s) => {
      const m = /items=\{([\s\S]*?)\}\n(\s*)actions=/.exec(s);
      const main = /<main className="([^"]*)">([\s\S]*?)<\/main>/.exec(s);
      if (!m || !main || !/<div className="[^"]*\bmin-h-screen\b/.test(s) || !/import \{[^}]*\bGnb\b[^}]*\} from "@\/components\/ui";/.test(s)) return s;
      let items = m[1].trim();
      if (!/^\w+$/.test(items)) {
        // 여러 줄 식(예제판)은 함수 본문으로 끌어올린다: 안쪽 4칸, 닫는 괄호 2칸.
        const expr = items.split("\n").map((line, i, all) => (i === 0 ? line : `${i === all.length - 1 ? "  " : "    "}${line.trim()}`)).join("\n");
        s = s.replace(m[0], `items={items}\n${m[2]}actions=`).replace("  return (", `  const items = ${expr};\n  return (`);
        items = "items";
      }
      return s
        .replace(/import \{([^}]*\bGnb\b[^}]*?)\s*\} from "@\/components\/ui";/, 'import {$1, Sidebar } from "@/components/ui";')
        .replace(/<div (className="[^"]*\bmin-h-screen\b)/, '<div data-nav="sidebar" $1')
        .replace(main[0], `<div className="lg:flex">\n        <div className="hidden lg:flex"><Sidebar label="주 메뉴" items={${items}} /></div>\n        <main className="${main[1]} lg:min-w-0 lg:flex-1">${main[2]}</main>\n      </div>`);
    });
    patch("src/app/globals.css", (s) => `${s}${SIDEBAR_CSS}`);
  }
  if (to.navigation !== from.navigation && to.navigation === "top") {
    // 위에서 넣은 것만 걷어낸다. 끌어올린 const items 는 GNB 가 계속 쓴다.
    patch(APP_LAYOUT, (s) => s
      .replace(/, Sidebar \} from "@\/components\/ui";/, ' } from "@/components/ui";')
      .replace('<div data-nav="sidebar" ', "<div ")
      .replace(/<div className="lg:flex">\n\s*<div className="hidden lg:flex"><Sidebar label="주 메뉴" items=\{\w+\} \/><\/div>\n\s*<main className="([^"]*?) lg:min-w-0 lg:flex-1">([\s\S]*?)<\/main>\n\s*<\/div>/, '<main className="$1">$2</main>'));
    patch("src/app/globals.css", (s) => s.replace(SIDEBAR_CSS, ""));
  }
  if (to.theme !== from.theme) {
    // 관리자 포털과 같은 방식: 토큰만 dark 로 바뀐다(hex 없음). 공개 영역 layout 은 없을 수 있다.
    const edit = to.theme === "dark" ? (s) => s.replace(/(<div[^>]*?className="[^"]*\bmin-h-screen\b[^"]*)"/, `$1${DARK}`) : (s) => s.replace(DARK, '"');
    patch(APP_LAYOUT, edit);
    patch(PUBLIC_LAYOUT, edit, true);
  }
  if (missing.length) die(`레이아웃 변경 지점 없음: ${missing.join(", ")} — 직접 고친 레이아웃이면 손으로 바꾸고, 키트 템플릿이면 maintenance.md 참고`);
  for (const [f, s] of files) fs.writeFileSync(f, s);
}
const appendStructurePointer = (dir) => {
  // 이미 있던 AGENTS.md 에는 키트 본문이 덧붙지 않을 수 있으므로 구조 선택 안내는 따로 확인한다.
  const agents = path.join(dir, "AGENTS.md");
  if (fs.existsSync(agents) && !fs.readFileSync(agents, "utf8").includes("docs/project-structure.md")) {
    fs.appendFileSync(agents, "\n## 프로젝트 구조 선택\n\n도메인·화면·흐름 선택은 `docs/project-structure.md`(원본 `project.spec.json`)에 있다. 새 기능은 그 \"구현 지침\" 선택을 따른다. 바꾸려면 `/moai-kit survey` 로 다시 설문하거나 문서와 spec 을 함께 고친다.\n");
  }
};
// 설문 도메인 1개 생성. 이미 있으면 건너뛰되, 앞 실행이 gen 뒤 migrate 에서 멈췄으면(add_<복수형> 마이그레이션 없음) 마이그레이션만 이어서 만든다.
const genDomain = (d) => {
  if (!fs.existsSync(path.join("src", "features", d.plural))) return FUNCTIONS.gen(genArgs(d));
  const name = `add_${snake(d.plural)}`;
  const migrated = fs.existsSync("drizzle") && fs.readdirSync("drizzle").some((f) => f.endsWith(`_${name}.sql`));
  if (migrated || flags.has("--no-migrate")) return console.log(`  건너뜀: ${d.plural} (이미 있음)`);
  FUNCTIONS.migrate(name);
};
const readSpecFile = (file) => {
  try { return JSON.parse(fs.readFileSync(path.resolve(file), "utf8")); } catch (error) { die(`spec 읽기 실패: ${error.message}`); }
};

const FUNCTIONS = {
  // init [dir=.] [--example] [--no-install] [--name=…] [--title=…] — 공통 scaffold(base.tgz)를 풀고 설치·DB 초기화. 기존 파일은 덮어쓰지 않는다.
  //   --example: 예제 도메인(요청·승인, 회의실 예약, 공개 메모)까지 = references/examples/ 를 base 위에 덮어쓴 원본 키트.
  //   --survey: 브라우저 설문에서 도메인·레이아웃을 조립(프로토타입 미리보기) → 제출한 spec 으로 생성. --port= --no-open
  //   --spec=<file>: 저장한 spec(project.spec.json)으로 바로 생성. --dry-run 이면 계획만 출력.
  async init() {
    const dest = path.resolve(params.find((a) => !a.startsWith("--")) ?? ".");
    const opt = (k) => params.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
    // 프로젝트 이름: --name=(npm 이름, 기본 폴더명) / --title=(화면 제목, 기본 이름). 새로 복사한 파일에만 적용.
    let pkgName = (opt("name") ?? path.basename(dest)).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^[-._]+|-+$/g, "") || "app";
    let title = opt("title") ?? pkgName;
    const major = Number(process.versions.node.split(".")[0]);
    if (major < 24) die(`Node 24 이상 필요 (현재 ${process.version})`);
    if ((opt("spec") || flags.has("--survey")) && fs.existsSync(path.join(dest, APP_LAYOUT))) {
      // 이미 init 된 프로젝트: 템플릿을 다시 까는 대신 현재 구조를 읽어 설문·적용한다.
      if (dest !== process.cwd()) die(`이미 init 된 프로젝트입니다. ${dest} 에서 survey 를 실행하세요.`);
      console.log("이미 init 된 프로젝트 → survey (기존 구조에 적용)");
      return FUNCTIONS.survey();
    }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "moai-kit-"));
    process.once("SIGINT", () => { fs.rmSync(tmp, { recursive: true, force: true }); process.exit(130); });
    // 아카이브 이름은 상대경로로 넘긴다(GNU tar 가 "C:" 를 원격 호스트로 해석하는 문제 회피).
    const t = spawnSync("tar", ["-xzf", "base.tgz", "-C", tmp], { cwd: path.join(SKILL, "assets"), encoding: "utf8" });
    if (t.status !== 0) die(`템플릿 압축 해제 실패: ${t.stderr || t.error}`);
    const privateFonts = path.join(SKILL, "assets", "kds-fonts.private");
    if (fs.existsSync(path.join(privateFonts, "KTFLOW-MEDIUM.woff2"))) installKdsFonts(privateFonts, tmp);
    let spec = null;
    if (opt("spec")) {
      const checked = checkSpec(readSpecFile(opt("spec")));
      if (checked.errors.length) die(`spec 오류\n  ${checked.errors.join("\n  ")}`);
      spec = checked.spec;
    } else if (flags.has("--survey")) {
      const { runSurvey } = await import("./survey/server.mjs");
      const port = Number(opt("port") ?? 0);
      if (!Number.isInteger(port) || port < 0 || port > 65535) die("--port 는 0~65535");
      const name = pkgName.replace(/[._]/g, "-").replace(/^[^a-z]+/, "").slice(0, 48) || "app";
      spec = await runSurvey({ kdsRoot: path.join(tmp, "public", "kds"), destination: dest, boot: { name, title, dryRun: flags.has("--dry-run") }, port, open: !flags.has("--no-open") });
    }
    if (spec) {
      ({ name: pkgName, title } = spec);
      console.log(`계획 (${dest})\n${planSteps(spec).map((s, i) => `  ${i + 1}. ${s}`).join("\n")}`);
      if (flags.has("--dry-run")) { fs.rmSync(tmp, { recursive: true, force: true }); return; }
    }
    const example = spec ? spec.example : flags.has("--example");
    // 공유 파일(db/schema.ts·nav·permissions·마이그레이션)은 예제판이 달라서, 이미 init 한 곳에 예제만 추가할 수 없다.
    if (example && fs.existsSync(path.join(dest, "src/server/db/schema.ts"))) die("이미 init 된 프로젝트입니다. --example 은 첫 init 에서만 쓸 수 있습니다.");
    if (example) fs.cpSync(path.join(SKILL, "references", "examples"), tmp, { recursive: true, force: true });
    if (spec) {
      applyChoices(tmp, spec.choices);
      fs.writeFileSync(path.join(tmp, "project.spec.json"), `${JSON.stringify(spec, null, 2)}\n`);
      fs.writeFileSync(path.join(tmp, "docs", "project-structure.md"), structureDoc(spec));
    }
    const copied = [];
    const kept = [];
    const merged = [];
    const walk = (rel) => {
      for (const name of fs.readdirSync(path.join(tmp, rel))) {
        const r = path.join(rel, name);
        const from = path.join(tmp, r);
        const to = path.join(dest, r);
        if (fs.statSync(from).isDirectory()) { walk(r); continue; }
        if (!fs.existsSync(to)) {
          fs.mkdirSync(path.dirname(to), { recursive: true });
          fs.copyFileSync(from, to);
          copied.push(r);
        } else if (["AGENTS.md", ".gitignore", ".gitattributes"].includes(r)) {
          // 팀 워크플로 문서·무시 목록은 보존하고 키트 내용 중 없는 것만 덧붙인다.
          const cur = fs.readFileSync(to, "utf8");
          const kit = fs.readFileSync(from, "utf8");
          const add = r === "AGENTS.md"
            ? (cur.includes(RULES_HEADING) ? "" : cur.includes("nextjs-agent-rules") ? kit.slice(kit.indexOf("## Project conventions")) : kit)
            : kit.split(/\r?\n/).filter((l) => l.trim() && !cur.split(/\r?\n/).includes(l)).join("\n");
          if (add) { fs.appendFileSync(to, `\n${add}\n`); merged.push(r); } else kept.push(r);
        } else kept.push(r);
      }
    };
    walk("");
    fs.rmSync(tmp, { recursive: true, force: true });
    // 규칙은 AGENTS.md 하나 — Claude Code 는 CLAUDE.md 가 없을 때만 AGENTS.md 를 직접 읽으므로 키트는 CLAUDE.md 를 만들지 않는다.
    // 이미 CLAUDE.md 가 있는 곳은 그 파일만 읽히므로 import 한 줄을 덧붙인다.
    const claudeMd = path.join(dest, "CLAUDE.md");
    if (fs.existsSync(claudeMd) && !/^@AGENTS\.md\s*$/m.test(fs.readFileSync(claudeMd, "utf8"))) {
      fs.appendFileSync(claudeMd, "\n@AGENTS.md\n");
      merged.push("CLAUDE.md");
    }
    const rename = (rel, from, to) => {
      if (!copied.includes(path.join(rel))) return;
      const f = path.join(dest, rel);
      fs.writeFileSync(f, fs.readFileSync(f, "utf8").replaceAll(from, to));
    };
    for (const f of ["package.json", "package-lock.json"]) rename(f, '"name": "moai-kit"', `"name": ${JSON.stringify(pkgName)}`);
    rename("src/app/layout.tsx", 'title: "Moai Kit"', `title: ${JSON.stringify(title)}`);
    console.log(`✓ ${example ? "키트+예제" : "공통 scaffold"} ${copied.length}개 복사 → ${dest}`);
    if (merged.length) console.log(`  덧붙임: ${merged.join(", ")}`);
    if (kept.length) console.log(`  기존 파일 유지(키트 버전과 다를 수 있음): ${kept.slice(0, 20).join(", ")}${kept.length > 20 ? ` 외 ${kept.length - 20}개` : ""}`);
    if (spec) appendStructurePointer(dest);
    if (flags.has("--no-install")) {
      if (spec?.domains.length) console.log(`도메인 ${spec.domains.length}개는 설치 후 생성: node .claude/skills/moai-kit/scripts/kit.mjs init --spec=project.spec.json`);
      return;
    }
    process.chdir(dest);
    run("npm ci", ["npm", "ci", "--no-audit", "--no-fund"]);
    run("db:reset", ["npm", "run", "db:reset"]);
    // 설문에서 조립한 도메인. 이미 있는 feature 는 건너뛰므로 중간에 실패해도 같은 명령으로 이어서 실행할 수 있다.
    for (const d of spec?.domains ?? []) genDomain(d);
    console.log("다음: npm run dev → http://localhost:3000 (user1@demo.local / Credit!23)");
  },

  // survey [--spec=<file>] [--dry-run] [--port=N] [--no-open] — 이미 init 된 프로젝트에 설문 적용.
  //   현재 도메인(project.spec.json·nav)·레이아웃을 읽어 설문을 채우고, 바뀐 레이아웃과 새 도메인만 반영한다. 설치·DB 초기화는 하지 않는다.
  async survey() {
    needProject();
    if (!fs.existsSync(APP_LAYOUT)) die(`${APP_LAYOUT} 없음 (moai-kit 프로젝트 루트에서 실행)`);
    const opt = (k) => params.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
    const dirs = (p) => (fs.existsSync(p) ? fs.readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : []);
    // 이미 쓰는 이름 = feature 폴더 + 화면 경로. gen 이 같은 폴더·경로를 만들면 안 된다.
    const plurals = [...new Set(["src/features", "src/app", "src/app/(app)", "src/app/(public)", "src/app/admin"].flatMap(dirs))].filter((n) => /^[a-z][a-zA-Z0-9]*$/.test(n));
    const pluralOf = (d) => String(d?.plural || `${d?.entity}s`);
    const others = (domains) => plurals.filter((p) => !domains.some((d) => pluralOf(d) === p));
    // 참조 대상 = gen 으로 만든 엔티티만 (gen-module.mts 와 같은 조건: 테이블 + list<X>(actor) service). login·me 같은 경로 폴더는 제외.
    const schemaSrc = fs.existsSync("src/server/db/schema.ts") ? fs.readFileSync("src/server/db/schema.ts", "utf8") : "";
    const svcOf = (p) => path.join("src", "features", p, "service.ts");
    const refTargets = plurals.filter((p) => schemaSrc.includes(`export const ${p} = sqliteTable(`) && fs.existsSync(svcOf(p))
      && fs.readFileSync(svcOf(p), "utf8").includes(`export async function list${p[0].toUpperCase()}${p.slice(1)}(actor`));
    const navSrc = fs.existsSync("src/app/(app)/nav.ts") ? fs.readFileSync("src/app/(app)/nav.ts", "utf8") : "";
    const nav = [...navSrc.matchAll(/href:\s*"\/([a-zA-Z0-9]+)",\s*label:\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]);
    const current = currentChoices(".");
    const prior = fs.existsSync("project.spec.json") ? readSpecFile("project.spec.json") : null;
    const layoutTitle = /title:\s*"([^"]*)"/.exec(fs.existsSync("src/app/layout.tsx") ? fs.readFileSync("src/app/layout.tsx", "utf8") : "")?.[1];
    const pkgName = String(JSON.parse(fs.readFileSync("package.json", "utf8")).name ?? "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^[^a-z]+/, "").slice(0, 48);
    const base = {
      version: 1, name: prior?.name ?? (pkgName || "app"), title: prior?.title ?? layoutTitle ?? pkgName, example: prior?.example ?? fs.existsSync("src/features/requests"),
      // 카탈로그에서 빠진 옛 선택 키는 버린다(남기면 "알 수 없는 선택 항목"으로 제출이 막힌다).
      choices: { ...Object.fromEntries(Object.entries(prior?.choices ?? {}).filter(([k]) => k in DEFAULT_CHOICES)), ...current },
      domains: Array.isArray(prior?.domains) ? prior.domains : [],
    };
    const navOthers = (domains) => nav.filter(([p]) => !domains.some((d) => pluralOf(d) === p));
    const plan = (spec) => planSteps(spec, { choices: current, plurals });
    // 이름·제목·예제·기존 도메인은 base 로 고정하고 새 도메인·선택만 받는다. 충돌 검사는 기존(base) 도메인 기준:
    // 새 도메인 복수형을 existing 에서 빼면 기존 feature 와 같은 이름이 통과해 조용히 건너뛰어진다.
    const check = (raw) => {
      const all = { ...base, choices: raw?.choices ?? base.choices, domains: [...base.domains, ...(Array.isArray(raw?.domains) ? raw.domains : [])] };
      return checkSpec(all, { existing: others(base.domains), refTargets });
    };
    let spec;
    if (opt("spec")) {
      // 전체 spec(project.spec.json)이든 설문에서 내려받은 새 도메인만이든 받는다: base 에 이미 있는 도메인은 빼고 더한다.
      const raw = readSpecFile(opt("spec"));
      const domains = (Array.isArray(raw?.domains) ? raw.domains : []).filter((d) => !base.domains.some((b) => pluralOf(b) === pluralOf(d)));
      const checked = check({ ...raw, domains });
      if (checked.errors.length) die(`spec 오류\n  ${checked.errors.join("\n  ")}`);
      spec = checked.spec;
    } else {
      const { runSurvey } = await import("./survey/server.mjs");
      const port = Number(opt("port") ?? 0);
      if (!Number.isInteger(port) || port < 0 || port > 65535) die("--port 는 0~65535");
      const kdsRoot = path.resolve("public", "kds");
      if (!fs.existsSync(kdsRoot)) die("public/kds 없음 (디자인 시스템 이전 키트) → spec 을 직접 써서 survey --spec=<file>");
      // 화면은 새 도메인·선택만 보낸다.
      const existing = [...base.domains, ...navOthers(base.domains).map(([plural, label]) => ({ entity: "", plural, label, auth: "required", fields: [] }))];
      const boot = { mode: "update", initial: base, existing, refTargets, dryRun: flags.has("--dry-run") };
      spec = await runSurvey({ kdsRoot, destination: process.cwd(), boot, check, plan, port, open: !flags.has("--no-open") });
    }
    console.log(`계획 (${process.cwd()})\n${plan(spec).map((s, i) => `  ${i + 1}. ${s}`).join("\n")}`);
    if (flags.has("--dry-run")) return;
    applyChoices(".", spec.choices, current);
    fs.writeFileSync("project.spec.json", `${JSON.stringify(spec, null, 2)}\n`);
    fs.mkdirSync("docs", { recursive: true });
    fs.writeFileSync(path.join("docs", "project-structure.md"), structureDoc(spec, navOthers(spec.domains)));
    appendStructurePointer(".");
    console.log("✓ 레이아웃·project.spec.json·docs/project-structure.md 반영");
    // 이미 있는 feature 는 건너뛰므로 중간에 실패해도 survey --spec=project.spec.json 으로 이어서 실행할 수 있다.
    for (const d of spec.domains) genDomain(d);
  },

  // gen <entity> <라벨> [--fields=…] [--auth=required|public] [--plural=…] [--skip-tests] [--no-migrate]
  gen(args = params) {
    needProject();
    const [entity, label] = args.filter((a) => !a.startsWith("--"));
    if (!entity || !label) die("gen <entity> <라벨> [--fields=…] [--auth=required|public] [--plural=…] [--skip-tests] [--no-migrate]");
    run(`gen ${entity}`, tsx(["scripts/gen-module.mts", ...args]), { show: true, tail: 40 });
    if (flags.has("--no-migrate")) return;
    const plural = args.find((a) => a.startsWith("--plural="))?.slice(9) ?? `${entity}s`;
    FUNCTIONS.migrate(`add_${snake(plural)}`);
  },

  // migrate <name> — db/schema.ts 수정 후 SQL 생성 + 적용
  migrate(name = params[0]) {
    needProject();
    if (!/^[a-z0-9_]+$/.test(name ?? "")) die("migrate <name> (영소문자·숫자·_)");
    run(`db:generate ${name}`, ["npm", "run", "db:generate", "--", "--name", name]);
    run("db:migrate", ["npm", "run", "db:migrate"]);
  },

  // check [테스트파일…] [--full] — 좁게→넓게. 실패한 단계에서 멈춘다.
  check() {
    needProject();
    if (params.length) {
      for (const f of params) if (!fs.existsSync(f)) die(`파일 없음: ${f}`);
      return run(`vitest ${params.join(" ")}`, node(path.join("node_modules", "vitest", "vitest.mjs"), ["run", ...params]));
    }
    if (flags.has("--full")) return run("verify (lint·typecheck·test·build·audit)", ["npm", "run", "verify"]);
    for (const step of ["lint", "typecheck", "test"]) run(step, ["npm", "run", step]);
  },

  // e2e [spec…] — 격리 runner(새 DB·빈 포트). PORT 가 있으면 E2E_PORT 로 쓴다.
  e2e() {
    needProject();
    for (const f of params) if (!/^[\w./\\-]+$/.test(f) || !fs.existsSync(f)) die(`spec 경로 오류: ${f}`);
    const env = process.env.PORT && !process.env.E2E_PORT ? { E2E_PORT: process.env.PORT } : {};
    run(`e2e ${params.join(" ") || "(전체)"}`, tsx(["scripts/e2e-run.mts", ...params]), { show: true, tail: 25, env });
  },

  "kds-fonts"() {
    if (!params[0]) die("kds-fonts <제공 KDS fonts/web 경로> — 참가자 로컬 전용");
    console.log(`✓ KT Flow 로컬 설치: ${installKdsFonts(params[0])} (Git 제외, 외부 공유 금지)`);
  },

  // help — 함수·매개변수 요약
  help() {
    console.log(`moai-kit — Next.js 풀스택 키트   사용: /moai-kit <함수> [매개변수]  (터미널: node .claude/skills/moai-kit/scripts/kit.mjs ...)

  init [dir] [--example] [--no-install]   공통 scaffold 설치(+npm ci·db:reset). --example 이면 예제 도메인 포함 (첫 init 만)
      --name=<npm이름> --title=<화면제목>   기본: 폴더명 (package.json name·layout title)
      --survey [--port=N] [--no-open]      브라우저 설문으로 도메인·레이아웃 조립(프로토타입 미리보기) → 제출 spec 으로 생성
      --spec=<project.spec.json> [--dry-run]  저장한 spec 으로 생성 / 계획만 출력
  survey [--spec=…] [--dry-run] [--port=N]  이미 만든 프로젝트에 설문 적용: 현재 구조를 읽어 채우고 레이아웃 변경·새 도메인만 반영
  gen <entity> <라벨> [옵션]               도메인 1개 생성(테이블·API·화면·시험) + 마이그레이션
      --fields='name:type[!]:라벨,...'     type = text|long|int|num|bool|date|datetime|enum(A=라벨|B=라벨)|ref(대상복수형), ! = 필수
      --auth=required|public  --plural=<복수형>  --skip-tests  --no-migrate
  migrate <name>                          db/schema.ts 수정 후 SQL 생성·적용
  check [테스트파일...] [--full]            파일만 vitest / lint→typecheck→test / --full = verify(+build·audit)
  e2e [spec...]                           격리 E2E (PORT 사용)
  evidence                                마지막 E2E 결과 → docs/evidence/latest.md
  kds-fonts <KDS fonts/web 경로>           참가자 로컬 KT Flow 설치(Git 제외, 외부 공유 금지)
  help                                    이 도움말

예) /moai-kit init
    /moai-kit gen expense 경비 '--fields=amount:int!:금액,spentOn:date!:사용일,category:enum(MEAL=식대|TRAVEL=교통)!:분류'
    /moai-kit check tests/unit/expenses.service.test.ts`);
  },

  // evidence — 마지막 E2E 실행을 docs/evidence/latest.md 에 기록
  evidence() {
    needProject();
    run("evidence", ["npm", "run", "evidence"], { show: true, tail: 10 });
  },
};

if (!fn) FUNCTIONS.help();
else if (!FUNCTIONS[fn]) die(`함수: ${Object.keys(FUNCTIONS).join(" | ")}  (help 참고)`);
else await FUNCTIONS[fn]();
