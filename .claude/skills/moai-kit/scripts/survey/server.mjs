// 설문 서버: 127.0.0.1 전용. Host·Origin·세션 token 을 검사하고, 제출(/initialize)이 오면 닫히면서 spec 을 돌려준다.
import { spawn } from "node:child_process";
import { randomBytes, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkSpec, DEFAULT_CHOICES, FIELD_TYPES, planSteps, PRESETS, VARIATIONS } from "./catalog.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" };
const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

// kdsRoot: base 또는 프로젝트의 public/kds (설문·프로토타입이 실제 KDS 토큰을 쓴다)
// boot: 화면 초기값 {name, title} 또는 기존 프로젝트 {mode:"update", initial, existing}. check·plan: spec 검증·계획(기존 프로젝트는 kit 이 감싼다).
export function runSurvey({ kdsRoot, destination, boot: extra, check = checkSpec, plan = planSteps, port = 0, open = true }) {
  const token = randomBytes(32).toString("hex");
  return new Promise((resolve, reject) => {
    const send = (res, status, body, type = "application/json; charset=utf-8") => {
      res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...(type.startsWith("text/html") ? { "Content-Security-Policy": CSP } : {}) });
      res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
    };
    const server = http.createServer(async (req, res) => {
      try {
        const origin = `http://127.0.0.1:${server.address().port}`;
        if (req.headers.host !== new URL(origin).host) return send(res, 403, { error: "Host 불일치" });
        const url = new URL(req.url ?? "/", origin);
        if (req.method === "GET") {
          if (url.pathname === "/") {
            const boot = JSON.stringify({ variations: VARIATIONS, presets: PRESETS, defaults: DEFAULT_CHOICES, fieldTypes: FIELD_TYPES, token, destination, ...extra }).replaceAll("<", "\\u003c");
            return send(res, 200, fs.readFileSync(path.join(HERE, "index.html"), "utf8").replace('{"__BOOTSTRAP__":true}', boot), "text/html; charset=utf-8");
          }
          if (url.pathname === "/survey.js" || url.pathname === "/survey.css") return send(res, 200, fs.readFileSync(path.join(HERE, url.pathname.slice(1))), TYPES[path.extname(url.pathname)]);
          if (url.pathname === "/kds/fonts/kt-flow.css") {
            const folder = path.resolve(kdsRoot, "..", "..", ".kds-private", "fonts");
            if (fs.existsSync(path.join(folder, "KTFLOW-BOLD.woff2"))) return send(res, 200,
              [500, 700].map((weight) => `@font-face { font-family: "KT Flow"; font-weight: ${weight}; font-display: swap; src: url("/api/v1/local-fonts?weight=${weight}") format("woff2"); }`).join("\n"), TYPES[".css"]);
          }
          if (url.pathname === "/api/v1/local-fonts") {
            const filename = { "500": "KTFLOW-MEDIUM.woff2", "700": "KTFLOW-BOLD.woff2" }[url.searchParams.get("weight")];
            if (!filename) return send(res, 404, { error: "찾을 수 없습니다." });
            const font = path.resolve(kdsRoot, "..", "..", ".kds-private", "fonts", filename);
            if (!fs.existsSync(font)) return send(res, 404, { error: "찾을 수 없습니다." });
            return send(res, 200, fs.readFileSync(font), TYPES[".woff2"]);
          }
          if (url.pathname.startsWith("/kds/")) {
            const file = path.resolve(kdsRoot, decodeURIComponent(url.pathname.slice(5)));
            if (file.startsWith(kdsRoot + path.sep) && TYPES[path.extname(file)] && fs.existsSync(file)) {
              // Organizer HTML uses inline token styles; this separate reference page has no submission endpoint.
              if (file.endsWith(".html")) {
                res.writeHead(200, { "Content-Type": TYPES[".html"], "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'" });
                return res.end(fs.readFileSync(file, "utf8").replace("</head>", '<link rel="stylesheet" href="/kds/fonts/kt-flow.css"></head>'));
              }
              return send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)]);
            }
          }
          return send(res, 404, { error: "찾을 수 없습니다." });
        }
        if (req.method !== "POST" || !["/plan", "/initialize"].includes(url.pathname)) return send(res, 404, { error: "찾을 수 없습니다." });
        const header = req.headers["x-init-token"];
        if (req.headers.origin !== origin || typeof header !== "string" || Buffer.byteLength(header) !== token.length || !timingSafeEqual(Buffer.from(header), Buffer.from(token))) return send(res, 403, { error: "설문 화면에서 제출하세요." });
        if (req.headers["content-type"] !== "application/json") return send(res, 415, { error: "JSON만 받습니다." });
        const chunks = [];
        let size = 0;
        // 끝까지 읽은 뒤 거절한다: 루프 안에서 return 하면 요청 스트림이 소켓째 닫혀 413 이 전달되지 않는다.
        for await (const chunk of req) { size += chunk.length; if (size <= 65536) chunks.push(chunk); }
        if (size > 65536) return send(res, 413, { error: "입력이 너무 큽니다(64KiB)." });
        const { spec, errors } = check(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        if (url.pathname === "/plan") return send(res, 200, { steps: plan(spec), errors });
        if (errors.length) return send(res, 400, { errors });
        send(res, 202, { destination, steps: plan(spec) });
        server.close();
        resolve(spec);
      } catch (error) {
        if (!res.headersSent) send(res, 400, { error: error instanceof SyntaxError ? "JSON 형식 오류" : "요청을 처리하지 못했습니다." });
      }
    });
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const url = `http://127.0.0.1:${server.address().port}`;
      console.log(`설문: ${url}  (제출하면 이어서 생성합니다. 중단: Ctrl+C)`);
      if (!open) return;
      const opener = process.platform === "win32" ? ["powershell.exe", ["-NoProfile", "-Command", `Start-Process '${url}'`]] : [process.platform === "darwin" ? "open" : "xdg-open", [url]];
      spawn(opener[0], opener[1], { stdio: "ignore", windowsHide: true }).on("error", () => {}).unref();
    });
  });
}
