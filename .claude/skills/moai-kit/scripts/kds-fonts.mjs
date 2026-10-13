// Participant-only brand fonts are installed locally; never bundled in assets/base.tgz.
import fs from "node:fs";
import path from "node:path";

export function installKdsFonts(source, destination = process.cwd()) {
  const root = path.resolve(source);
  const candidates = [root, path.join(root, "web"), path.join(root, "fonts", "web"), path.join(root, "kds-hackathon-kit", "fonts", "web")];
  const fonts = candidates.find((folder) => ["KTFLOW-MEDIUM.woff2", "KTFLOW-BOLD.woff2"].every((name) => fs.existsSync(path.join(folder, name))));
  if (!fonts) throw new Error("KDS fonts/web 폴더(KTFLOW-MEDIUM/BOLD.woff2)를 지정하세요.");
  const output = path.resolve(destination, ".kds-private", "fonts");
  if (!fs.existsSync(path.join(destination, "public", "kds", "tokens", "kds-base.css"))) throw new Error("먼저 moai-kit init으로 프로젝트를 생성하세요.");
  fs.mkdirSync(output, { recursive: true });
  for (const name of ["KTFLOW-MEDIUM.woff2", "KTFLOW-BOLD.woff2"]) fs.copyFileSync(path.join(fonts, name), path.join(output, name));
  for (const name of ["KTFLOW-MEDIUM.woff2", "KTFLOW-BOLD.woff2"]) {
    const legacy = path.resolve(destination, "public", "kds", "fonts", "private", name);
    if (fs.existsSync(legacy)) fs.unlinkSync(legacy);
  }
  fs.writeFileSync(path.join(destination, "public", "kds", "fonts", "kt-flow.css"), [
    "/* KT Flow: hackathon participants only. Do not share or publicly deploy these font files. */",
    "/* npm run dev or the isolated E2E runner starts a loopback-only font companion. Production never serves participant bytes. */",
    "",
  ].join("\n"));
  const ignorePath = path.join(destination, ".gitignore");
  const previous = fs.existsSync(ignorePath) ? fs.readFileSync(ignorePath, "utf8") : "";
  const ignores = ["/.kds-private/", "/public/kds/fonts/kt-flow.css"];
  const missing = ignores.filter((entry) => !previous.split(/\r?\n/).includes(entry));
  if (missing.length) fs.appendFileSync(ignorePath, `${previous.endsWith("\n") || !previous ? "" : "\n"}${missing.join("\n")}\n`);
  return output;
}
