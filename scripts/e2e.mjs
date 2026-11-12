import {spawn} from "node:child_process";
import {existsSync, mkdtempSync, readFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const PORT = Number(process.env.E2E_PORT ?? 3130);
const BASE = `http://127.0.0.1:${PORT}`;
const ALLOWED_EXTERNAL = (process.env.E2E_ALLOW_EXTERNAL ?? "").split(",").filter(Boolean);

const results = [];
const check = (name, ok, detail = "") => {
  results.push({name, ok, detail});
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n        ${detail}`}`);
};

async function waitForHealth(timeoutMs = 60_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Server did not become healthy in time");
}

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT), "-H", "127.0.0.1"], {
  env: {...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", LOG_LEVEL: "silent"},
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));

let browser;
let exitCode = 0;
const downloads = mkdtempSync(join(tmpdir(), "slate-e2e-"));

try {
  await waitForHealth();

  const health = await (await fetch(`${BASE}/api/health`)).json();
  check("health endpoint reports ok", health.status === "ok" && health.service === "slate");

  const home = await fetch(`${BASE}/`);
  const csp = home.headers.get("content-security-policy") ?? "";
  check("CSP is present and locked down", csp.includes("default-src 'self'") && csp.includes("object-src 'none'") && csp.includes("frame-ancestors 'none'") && !csp.includes("unsafe-eval"), csp);
  check("security headers are set", home.headers.get("x-content-type-options") === "nosniff" && home.headers.get("x-frame-options") === "DENY" && !!home.headers.get("strict-transport-security") && !home.headers.get("x-powered-by"));

  const cross = await fetch(`${BASE}/api/website-screenshot?url=${encodeURIComponent("https://example.com")}`);
  check("capture API refuses requests that are not from the site's own pages", cross.status === 403, `status ${cross.status}`);
  const internal = await fetch(`${BASE}/api/website-screenshot?url=${encodeURIComponent("http://169.254.169.254/latest/meta-data")}`, {headers: {"sec-fetch-site": "same-origin"}});
  check("capture API refuses cloud-metadata address with 400", internal.status === 400, `status ${internal.status}`);
  check("metrics endpoint is hidden unless a token is configured", (await fetch(`${BASE}/api/metrics`)).status === 404);

for (const path of ["/", "/privacy", "/terms", "/contact", "/editor"]) {
  const response = await fetch(`${BASE}${path}`);
  check(`page ${path} returns HTTP 200`, response.status === 200);
}

  chromium.setGraphicsMode = false;
  const local = process.env.CHROME_EXECUTABLE_PATH;
  browser = await puppeteer.launch({
    executablePath: local || (await chromium.executablePath()),
    headless: local ? true : "shell",
    args: local ? (process.env.CHROME_NO_SANDBOX === "1" ? ["--no-sandbox"] : []) : chromium.args,
  });

  async function open(path) {
    const page = await browser.newPage();
    await page.setViewport({width: 1440, height: 900});
    const state = {external: new Set(), errors: [], csp: []};
    page.on("request", (r) => {
      const url = r.url();
      if (url.startsWith("data:") || url.startsWith("blob:")) return;
      const {origin, hostname} = new URL(url);
      if (origin !== BASE && !ALLOWED_EXTERNAL.includes(hostname)) state.external.add(url);
    });
    page.on("pageerror", (e) => state.errors.push(String(e).slice(0, 200)));
    page.on("console", (m) => {
      const text = m.text();
      if (ALLOWED_EXTERNAL.some((h) => text.includes(h))) return; // explicitly allow-listed host
      if (/Content Security Policy|Refused to/i.test(text)) state.csp.push(text.slice(0, 200));
      else if (m.type() === "error") state.errors.push(text.slice(0, 200));
    });
    const res = await page.goto(`${BASE}${path}`, {waitUntil: "networkidle2", timeout: 45_000});
    return {page, state, status: res.status()};
  }

  const landing = await open("/");
  check("landing page loads", landing.status === 200);
  check("landing page: no third-party requests", landing.state.external.size === 0, [...landing.state.external].join(", "));
  check("landing page: no CSP violations or console errors", landing.state.csp.length + landing.state.errors.length === 0, [...landing.state.csp, ...landing.state.errors].join(" | "));
  check("landing page shows the Slate brand", (await landing.page.title()).includes("Slate"));
  const brokenImages = await landing.page.$$eval("img", (imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
  check("landing page: no broken images", brokenImages.length === 0, brokenImages.join(", "));
  await landing.page.close();

  const code = await open("/editor?mode=code");
  await code.page.waitForSelector(".monaco-editor .view-line", {timeout: 30_000});
  check("code editor: Monaco loads from this site, no third-party requests", code.state.external.size === 0, [...code.state.external].join(", "));
  check("code editor: no CSP violations or console errors", code.state.csp.length + code.state.errors.length === 0, [...code.state.csp, ...code.state.errors].join(" | "));

  const client = await code.page.createCDPSession();
  await client.send("Page.setDownloadBehavior", {behavior: "allow", downloadPath: downloads});
  await code.page.click('button[aria-label="Export image"]');
  await code.page.waitForSelector("#export-actions");
  await code.page.evaluate(() => [...document.querySelectorAll("#export-actions button")].find((b) => /download/i.test(b.textContent ?? ""))?.click());
  await code.page.waitForSelector('button[aria-label="Save code snippet as PNG"]');
  await code.page.click('button[aria-label="Save code snippet as PNG"]');
  const file = join(downloads, "code.png");
  for (let i = 0; i < 60 && !existsSync(file); i++) await new Promise((r) => setTimeout(r, 250));
  const png = existsSync(file) ? readFileSync(file) : Buffer.alloc(0);
  const isPng = png.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  const width = isPng ? png.readUInt32BE(16) : 0;
  check("code editor: exporting produces a real PNG", isPng && width >= 300 && png.length > 5_000, `bytes=${png.length} width=${width}`);
  await code.page.close();

  const shot = await open("/");
  await shot.page.click('button[aria-label="Open launch example"]');
  await shot.page.waitForFunction(() => location.pathname === "/editor", {timeout: 20_000});
  await shot.page.waitForFunction(() => [...document.querySelectorAll("img")].some((i) => i.naturalWidth > 600), {timeout: 20_000}).catch(() => {});
  const loaded = await shot.page.$$eval("img", (imgs) => imgs.filter((i) => i.naturalWidth > 600).length);
  check("screenshot editor: example image loads onto the canvas", loaded > 0, `${loaded} large images`);
  check("screenshot editor: no CSP violations or console errors", shot.state.csp.length + shot.state.errors.length === 0, [...shot.state.csp, ...shot.state.errors].join(" | "));
  await shot.page.close();
} catch (error) {
  check("e2e run completed without crashing", false, String(error?.stack ?? error));
} finally {
  await browser?.close().catch(() => {});
  server.kill("SIGTERM");
  rmSync(downloads, {recursive: true, force: true});
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    exitCode = 1;
    console.log("\n--- last server output ---\n" + serverLog.slice(-1500));
  }
}
process.exit(exitCode);
