// End-to-end: real headless Chromium, forced through the egress proxy.
// Skips itself (loudly) if Chromium cannot start in this environment.
const {test, before, after} = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const load = require("./_ts-loader.cjs");

const {captureWebsite} = load("lib/screenshot/capture.ts");
const {ScreenshotError} = load("lib/screenshot/url-guard.ts");

const PUBLIC_IP = "127.0.0.1"; // stands in for "a public site" via the test seam
const INTERNAL_IP = "127.0.0.2"; // stands in for "internal network" (also loopback!)

let publicServer, internalServer, publicPort, internalPort;
let internalHits = 0;
let chromiumWorks = true;
let chromiumSkipReason = "";

const listen = (server, host) =>
  new Promise((resolve) => server.listen(0, host, () => resolve(server.address().port)));

function proxyOptions() {
  return {
    resolve: async (host) => (host === "internal.test" ? [INTERNAL_IP] : [PUBLIC_IP]),
    isAllowed: (address) => address === PUBLIC_IP,
    allowedPorts: [publicPort, internalPort],
  };
}

before(async () => {
  // Skip only when the browser itself cannot start (e.g. missing system libs).
  // Any failure after a successful launch is a real failure.
  try {
    const puppeteer = (await import("puppeteer-core")).default;
    const chromium = (await import("@sparticuz/chromium")).default;
    chromium.setGraphicsMode = false;
    const probe = await puppeteer.launch({
      executablePath: process.env.CHROME_EXECUTABLE_PATH || (await chromium.executablePath()),
      headless: process.env.CHROME_EXECUTABLE_PATH ? true : "shell",
      args: process.env.CHROME_EXECUTABLE_PATH ? [] : chromium.args,
    });
    await probe.close();
  } catch (error) {
    chromiumWorks = false;
    chromiumSkipReason = error.message.split("\n")[0];
  }

  internalServer = http.createServer((req, res) => {
    internalHits += 1;
    res.writeHead(200, {"Content-Type": "text/html", "Access-Control-Allow-Origin": "*"});
    res.end("SECRET");
  });
  internalPort = await listen(internalServer, INTERNAL_IP);

  publicServer = http.createServer((req, res) => {
    if (req.url.startsWith("/redirect")) {
      res.writeHead(302, {Location: `http://${INTERNAL_IP}:${internalPort}/`});
      return res.end();
    }
    if (req.url.startsWith("/missing")) {
      res.writeHead(404, {"Content-Type": "text/html"});
      return res.end("nope");
    }
    if (req.url.startsWith("/hang")) return; // never responds
    res.writeHead(200, {"Content-Type": "text/html"});
    res.end(`<!doctype html><body style="margin:0;background:#ff00aa">
      <h1 style="font:700 120px sans-serif;color:#fff">Hello capture</h1>
      <img src="http://${INTERNAL_IP}:${internalPort}/a.png">
      <img src="http://internal.test:${internalPort}/b.png">
      <script>
        fetch("http://${INTERNAL_IP}:${internalPort}/x", {mode: "no-cors"}).catch(() => {});
        fetch("http://internal.test:${internalPort}/y", {mode: "no-cors"}).catch(() => {});
        alert("dialog must not hang the capture");
      </script></body>`);
  });
  publicPort = await listen(publicServer, PUBLIC_IP);
});

after(async () => {
  await new Promise((r) => publicServer.closeAllConnections?.() ?? r());
  await new Promise((r) => publicServer.close(r));
  await new Promise((r) => internalServer.close(r));
});

function pngSize(buffer) {
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "PNG signature");
  return {width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20)};
}

test("captures a page as a 1440x810 PNG and never touches the internal network", async (t) => {
  if (!chromiumWorks) return t.skip(`Chromium cannot start here: ${chromiumSkipReason}`);
  const image = await captureWebsite(new URL(`http://public.test:${publicPort}/`), {proxy: proxyOptions()});
  assert.deepEqual(pngSize(image), {width: 1440, height: 810});
  assert.ok(image.length > 5_000, "image is not blank/trivial");
  assert.equal(internalHits, 0, "subresource/fetch requests to internal hosts must be blocked");
});

test("redirect into the internal network is blocked", async (t) => {
  if (!chromiumWorks) return t.skip(`Chromium cannot start here: ${chromiumSkipReason}`);
  await assert.rejects(
    () => captureWebsite(new URL(`http://public.test:${publicPort}/redirect`), {proxy: proxyOptions()}),
    (error) => error instanceof ScreenshotError && error.status === 502,
  );
  assert.equal(internalHits, 0);
});

test("HTTP error pages are reported, not screenshotted", async (t) => {
  if (!chromiumWorks) return t.skip(`Chromium cannot start here: ${chromiumSkipReason}`);
  await assert.rejects(
    () => captureWebsite(new URL(`http://public.test:${publicPort}/missing`), {proxy: proxyOptions()}),
    (error) => error instanceof ScreenshotError && /HTTP 404/.test(error.message),
  );
});
