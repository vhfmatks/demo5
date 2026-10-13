// 이슈 발행·근거: docs/issue-format.md 형식을 통과한 제목·본문만 gh 로 보낸다.
//   node issue-create.mjs <gh issue create 인자>        검증 통과 시 발행 (gh 출력·종료 코드 그대로)
//   node issue-create.mjs --fill <번호> "<키>=<값>" …    해결 후 '작업 후' 칸(형식에서 값이 빈 "키:" 줄)을 모두 채운다
//   --check: 발행·수정 없이 검사만 (--fill 은 채운 본문을 출력, --body-file 로 로컬 본문 사용)
//   node issue-create.mjs --hook                        PreToolUse hook: gh issue create 직접 실행을 막는다
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const FORMAT = new URL("../../../../docs/issue-format.md", import.meta.url);
const FIELD = /^([^\s#>*|`-][^:]{0,40}):(?: (.*))?$/; // "키: 값" 줄
const BOX = /^\s*[-*] \[[ xX]\]/;
const args = process.argv.slice(2);
const check = args.includes("--check");
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

if (args[0] === "--hook") {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  // 명령 위치의 gh 만 본다: 커밋 메시지·echo·grep 문자열 속 언급은 막지 않는다.
  if (/(^|[;&|({\n]|\$\(|=)\s*gh(\.exe)?\s+issue\s+(create|new)\b/.test(JSON.parse(input).tool_input?.command ?? "")) {
    console.error("gh issue create 직접 실행 금지 → node .claude/skills/moai-setup/scripts/issue-create.mjs <같은 인자> (docs/issue-format.md 검증 후 발행, --check = 검증만)");
    process.exit(2);
  }
  process.exit(0);
}

// "## " 줄로 나눈 절 목록. 첫 "## " 앞(작업 헤더)은 검사하지 않는다.
const sections = (text) => {
  const out = [];
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    if (line.startsWith("## ")) out.push({ heading: line.trimEnd(), lines: [] });
    else out.at(-1)?.lines.push(line);
  }
  return out;
};

const ghArgs = args.filter((a) => a !== "--check");
const option = (...names) => {
  for (const [i, a] of ghArgs.entries()) {
    for (const n of names) {
      if (a === n) return ghArgs[i + 1] ?? "";
      if (a.startsWith(`${n}=`)) return a.slice(n.length + 1);
    }
  }
};
const file = option("--body-file", "-F");
let body = option("--body", "-b");
if (file !== undefined) {
  try {
    body = readFileSync(file, "utf8");
  } catch {
    fail(`본문 파일을 읽을 수 없음: ${file}`);
  }
}

let format;
try {
  format = readFileSync(FORMAT, "utf8");
} catch {
  fail("docs/issue-format.md 없음 → /moai-setup 이 기본 형식을 만든다");
}
const plain = format.replace(/\r\n/g, "\n").replace(/<!--[\s\S]*?-->/g, "");
const template = sections(plain);
if (!template.length) fail('docs/issue-format.md 에 "## " 절 없음');
// 첫 "## " 앞의 `코드` = 허용 제목. <…> 자리는 1글자 이상.
const titles = [...plain.split(/^## /m)[0].matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
const titleRe = (p) => new RegExp(`^${p.split(/<[^>]*>/).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".+")}$`);

if (args[0] === "--fill") {
  const n = args[1] ?? "";
  // 형식에서 값이 빈 "키:" 줄 = 작업 후 칸. 모두 채워야 하고 다른 줄은 건드리지 않는다.
  const post = template.flatMap((t) => t.lines.map((l) => l.match(FIELD)).filter((m) => m && !m[2]?.trim()).map((m) => ({ heading: t.heading, key: m[1] })));
  const values = new Map(args.slice(2).filter((a) => /^[^-][^=]*=/.test(a) && a !== file).map((a) => [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1).trim()]));
  const errors = [
    ...(/^\d+$/.test(n) ? [] : ["이슈 번호 없음 → --fill <번호>"]),
    ...[...values.keys()].filter((k) => !post.some((f) => f.key === k)).map((k) => `"${k}"는 작업 후 칸이 아님`),
    ...post.filter((f) => !values.get(f.key)).map((f) => `"${f.key}" 값 없음`),
  ];
  if (errors.length) fail(`근거 채우기 실패 (작업 후 칸: ${post.map((f) => f.key).join(", ")})\n${errors.map((e) => `- ${e}`).join("\n")}`);
  if (body === undefined) {
    const view = spawnSync("gh", ["issue", "view", n, "--json", "body"], { encoding: "utf8" });
    if (view.status !== 0) fail(`gh issue view ${n} 실패: ${view.stderr || view.error?.message}`);
    body = JSON.parse(view.stdout).body;
  }
  let heading = "";
  const filled = new Set();
  const out = body
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => {
      if (l.startsWith("## ")) heading = l.trimEnd();
      const f = post.find((x) => x.heading === heading && l.startsWith(`${x.key}:`));
      if (!f) return l;
      filled.add(f.key);
      return `${f.key}: ${values.get(f.key)}`;
    })
    .join("\n");
  const missing = post.filter((f) => !filled.has(f.key)).map((f) => `${f.heading} / ${f.key}:`);
  if (missing.length) fail(`본문에 작업 후 칸 없음 (형식 이전 이슈?) → ${missing.join(", ")}`);
  if (check) {
    console.log(out);
    process.exit(0);
  }
  const edit = spawnSync("gh", ["issue", "edit", n, "--body-file", "-"], { input: out, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] });
  if (edit.error) fail(`gh 실행 실패: ${edit.error.message}`);
  process.exit(edit.status ?? 1);
}

if (body === undefined) fail("본문 없음 → --body-file <파일>");

const errors = [];
const title = option("--title", "-t") ?? "";
if (titles.length && !titles.some((p) => titleRe(p).test(title))) errors.push(`제목 "${title}"이 형식과 다름 → ${titles.map((p) => `"${p}"`).join(", ")} 중 하나`);
const got = sections(body);
let from = 0;
for (const t of template) {
  const i = got.findIndex((s, k) => k >= from && s.heading === t.heading);
  if (i < 0) {
    errors.push(`"${t.heading}" 절이 없거나 순서가 다름`);
    continue;
  }
  from = i + 1;
  const lines = got[i].lines;
  const fields = t.lines.map((l) => l.match(FIELD)).filter(Boolean);
  for (const [, key, example] of fields) {
    const line = lines.find((l) => l.startsWith(`${key}:`));
    if (line === undefined) errors.push(`"${key}:" 줄 없음 (${t.heading})`);
    else if (example?.trim() && !line.slice(key.length + 1).trim()) errors.push(`"${key}:" 값이 비어 있음 (${t.heading})`);
  }
  if (t.lines.some((l) => BOX.test(l)) && !lines.some((l) => BOX.test(l))) errors.push(`체크박스(- [ ]) 없음 (${t.heading})`);
  const prose = (l) => l.trim() && !BOX.test(l) && !fields.some(([, key]) => l.startsWith(`${key}:`));
  if (t.lines.some(prose) && !lines.some(prose)) errors.push(`내용이 비어 있음 (${t.heading})`);
}
if (errors.length) fail(`이슈 형식 위반 (docs/issue-format.md) → 발행 안 함\n${errors.map((e) => `- ${e}`).join("\n")}`);
if (check) {
  console.log("이슈 형식 통과 (docs/issue-format.md)");
  process.exit(0);
}

const gh = spawnSync("gh", ["issue", "create", ...ghArgs], { stdio: "inherit" });
if (gh.error) fail(`gh 실행 실패: ${gh.error.message}`);
process.exit(gh.status ?? 1);
