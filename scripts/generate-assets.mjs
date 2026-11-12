import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");
const svgUrl = (path) => `data:image/svg+xml;base64,${readFileSync(join(pub, path)).toString("base64")}`;
const logo = readFileSync(join(root, "src/app/icon.svg"), "utf8");

const font = `font-family: Inter, 'Segoe UI', Carlito, 'DejaVu Sans', system-ui, Helvetica, Arial, sans-serif;`;

function dashboard(dark) {
  const scope = dark ? "dash-dark" : "dash-light";
  const c = dark
    ? {bg: "#0b1020", side: "#0f1630", card: "#141c3a", line: "#232d52", text: "#e6eaf7", sub: "#8b95b8", acc: "#6ee7b7"}
    : {bg: "#f4f6fb", side: "#ffffff", card: "#ffffff", line: "#e4e8f2", text: "#0f172a", sub: "#64748b", acc: "#0d9488"};
  const stat = (label, value, delta) => `<div class="card"><div class="sub">${label}</div><div class="big">${value}</div><div class="delta">${delta}</div></div>`;
  const rows = [["Ada Lovelace", "Upgraded plan", "2m ago"], ["Grace Hopper", "Created project", "14m ago"], ["Alan Turing", "Invited 3 members", "1h ago"], ["Edsger Dijkstra", "Exported report", "3h ago"]]
    .map(([n, a, t]) => `<div class="row"><span class="av"></span><b>${n}</b><span class="sub">${a}</span><span class="sub" style="margin-left:auto">${t}</span></div>`).join("");
  const pts = [18, 26, 22, 34, 30, 44, 41, 58, 52, 66, 72, 88];
  const path = pts.map((v, i) => `${i ? "L" : "M"}${60 + i * 96} ${300 - v * 2.6}`).join(" ");
  return `<div class="${scope}" style="${font}background:${c.bg};color:${c.text}">
<style>
.${scope}{width:1600px;height:1000px;display:flex;position:relative;overflow:hidden}
.${scope} *{box-sizing:border-box}
.${scope} .side{width:260px;background:${c.side};border-right:1px solid ${c.line};padding:32px 24px}
.${scope} .brand{display:flex;align-items:center;gap:12px;font-weight:700;font-size:24px;margin-bottom:40px}
.${scope} .dot{width:32px;height:32px;border-radius:50%;background:conic-gradient(${c.acc},#60a5fa,${c.acc})}
.${scope} .nav{padding:14px 16px;border-radius:12px;color:${c.sub};font-size:18px;margin-bottom:6px}
.${scope} .nav.on{background:${c.card};color:${c.text};border:1px solid ${c.line};font-weight:600}
.${scope} .main{flex:1;padding:40px 48px}
.${scope} h1{font-size:38px;margin:0 0 6px}
.${scope} .sub{color:${c.sub};font-size:17px}
.${scope} .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin:30px 0 22px}
.${scope} .card{background:${c.card};border:1px solid ${c.line};border-radius:16px;padding:22px}
.${scope} .big{font-size:40px;font-weight:700;margin:8px 0 4px}
.${scope} .delta{color:${c.acc};font-weight:600;font-size:16px}
.${scope} .chart{height:380px}
.${scope} .row{display:flex;align-items:center;gap:14px;padding:14px 0;border-top:1px solid ${c.line};font-size:18px}
.${scope} .av{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#ec4899)}
</style>
<div class="side"><div class="brand"><span class="dot"></span>Orbit</div>
<div class="nav on">Overview</div><div class="nav">Customers</div><div class="nav">Revenue</div><div class="nav">Reports</div><div class="nav">Settings</div></div>
<div class="main"><h1>Overview</h1><div class="sub">Last 12 weeks · all regions</div>
<div class="grid">${stat("Revenue", "$48,290", "+12.4%")}${stat("Active users", "9,413", "+6.1%")}${stat("Conversion", "3.8%", "+0.4%")}${stat("Churn", "1.2%", "-0.3%")}</div>
<div class="card chart"><div class="sub">Weekly growth</div>
<svg viewBox="0 0 1180 320" width="1180" height="320"><defs><linearGradient id="ar${dark ? "d" : "l"}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.acc}" stop-opacity=".35"/><stop offset="1" stop-color="${c.acc}" stop-opacity="0"/></linearGradient></defs>
<path d="${path} L1116 300 L60 300 Z" fill="url(#ar${dark ? "d" : "l"})"/><path d="${path}" fill="none" stroke="${c.acc}" stroke-width="5" stroke-linejoin="round"/></svg></div>
<div class="card" style="margin-top:22px;padding:8px 22px">${rows}</div></div></div>`;
}

const windowChrome = (inner, w, h, scale, radius = 16) => `<div style="width:${w * scale}px;height:${h * scale}px;border-radius:${radius}px;overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.12)"><div style="width:${w}px;height:${h}px;transform:scale(${scale});transform-origin:top left">${inner}</div></div>`;

const stage = (bgPath, body, w, h) => `<div style="width:${w}px;height:${h}px;background:center/cover url(${svgUrl(bgPath)});display:flex;align-items:center;justify-content:center;gap:40px;position:relative">${body}</div>`;

const code = () => {
  const k = "#c792ea", s = "#c3e88d", f = "#82aaff", n = "#f78c6c", p = "#89ddff", d = "#6b7a99";
  return `<div style="${font}width:1180px;border-radius:20px;background:#0f172a;box-shadow:0 40px 90px rgba(0,0,0,.4),0 0 0 1px rgba(255,255,255,.1);overflow:hidden">
<div style="display:flex;align-items:center;gap:10px;padding:18px 22px;background:#111c33"><i style="width:15px;height:15px;border-radius:50%;background:#ff5f57"></i><i style="width:15px;height:15px;border-radius:50%;background:#febc2e"></i><i style="width:15px;height:15px;border-radius:50%;background:#28c840"></i><span style="margin-left:auto;margin-right:auto;color:${d};font-size:18px">create.ts</span></div>
<pre style="margin:0;padding:34px 40px 44px;font:400 31px/1.6 'JetBrains Mono','DejaVu Sans Mono',Menlo,Consolas,monospace;color:#d6deeb"><span style="color:${d}">// turn an idea into something shareable</span>
<span style="color:${k}">const</span> <span style="color:${f}">createSomething</span> <span style="color:${p}">=</span> <span style="color:${k}">async</span> (<span style="color:#ffcb6b">idea</span>) <span style="color:${p}">=&gt;</span> {
  <span style="color:${k}">const</span> draft <span style="color:${p}">=</span> <span style="color:${k}">await</span> <span style="color:${f}">build</span>(idea);

  <span style="color:${k}">return</span> {
    <span style="color:${p}">...</span>draft,
    readyToShare: <span style="color:${n}">true</span>,
  };
};

<span style="color:${f}">createSomething</span>(<span style="color:${s}">"your next big thing"</span>);</pre></div>`;
};

const og = () => `<div style="${font}width:1200px;height:630px;position:relative;overflow:hidden;background:#0b1220;color:#f1f5f9">
<div style="position:absolute;inset:0;background:center/cover url(${svgUrl("backgrounds/mesh/aurora-bay.svg")});opacity:.9"></div>
<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,12,24,.92) 0%,rgba(7,12,24,.55) 60%,rgba(7,12,24,.15) 100%)"></div>
<div style="position:relative;box-sizing:border-box;padding:88px 96px;display:flex;flex-direction:column;height:630px">
<div style="width:96px;height:96px">${logo.replace(/width="256" height="256"/, 'width="96" height="96"')}</div>
<div style="font-size:112px;font-weight:800;letter-spacing:-3px;margin-top:34px;line-height:1">Slate</div>
<div style="font-size:42px;margin-top:20px;color:#cbd5e1;max-width:760px;line-height:1.25">Screenshot &amp; code image studio.</div>
<div style="margin-top:auto;font-size:28px;color:#94a3b8">Free · No signup · Runs in your browser</div></div></div>`;

async function render(browser, html, width, height, file, opts = {}) {
  const page = await browser.newPage();
  await page.setViewport({width, height, deviceScaleFactor: 1});
  await page.setContent(`<!doctype html><html><body style="margin:0">${html}</body></html>`, {waitUntil: "load"});
  const type = file.endsWith(".png") ? "png" : "webp";
  const buffer = await page.screenshot({type, ...(type === "webp" ? {quality: opts.quality ?? 88} : {})});
  mkdirSync(dirname(join(pub, file)), {recursive: true});
  writeFileSync(join(pub, file), buffer);
  console.log(`${file}  ${(buffer.length / 1024).toFixed(0)} KB`);
  await page.close();
}

chromium.setGraphicsMode = false;
const local = process.env.CHROME_EXECUTABLE_PATH;
const browser = await puppeteer.launch({executablePath: local || (await chromium.executablePath()), headless: local ? true : "shell", args: local ? [] : chromium.args});
try {
  await render(browser, dashboard(false), 1600, 1000, "examples/product.webp", {quality: 90});
  await render(browser, dashboard(true), 1600, 1000, "examples/before.webp", {quality: 90});
  await render(browser, stage("backgrounds/mesh/ocean-silk.svg", windowChrome(dashboard(false), 1600, 1000, 0.76), 1600, 900), 1600, 900, "examples/launch.webp");
  await render(browser, stage("backgrounds/mesh/violet-dusk.svg", windowChrome(dashboard(true), 1600, 1000, 0.42) + windowChrome(dashboard(false), 1600, 1000, 0.42), 1600, 900), 1600, 900, "examples/comparison.webp");
  await render(browser, stage("backgrounds/mesh/peach-haze.svg", code(), 1600, 900), 1600, 900, "examples/code.webp");
  await render(browser, og(), 1200, 630, "og.png");
} finally {
  await browser.close();
}
