// Exercises the real /api/website-screenshot handler with real NextRequest
// objects. Only the browser (capture) and DNS are stubbed.
process.env.LOG_LEVEL = "silent";
process.env.SCREENSHOT_RATE_LIMIT_PER_MINUTE = "3";
process.env.SCREENSHOT_RATE_LIMIT_PER_HOUR = "100";
process.env.SCREENSHOT_MAX_CONCURRENCY = "1";
process.env.SCREENSHOT_DAILY_LIMIT = "1000"; // budget has its own test file

const {test, beforeEach} = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const dns = require("node:dns/promises");
const load = require("./_ts-loader.cjs");

// --- stubs -----------------------------------------------------------------
dns.lookup = async () => [{address: "93.184.216.34", family: 4}];

let captureImpl;
let captureCalls = [];
const capturePath = require.resolve(path.join(__dirname, "../src/lib/screenshot/capture.ts"));
require.cache[capturePath] = {
  id: capturePath, filename: capturePath, loaded: true,
  exports: {captureWebsite: async (url) => { captureCalls.push(url.href); return captureImpl(url); }},
};

const {NextRequest} = require("next/server");
const {GET} = load("app/api/website-screenshot/route.ts");
const {ScreenshotError} = load("lib/screenshot/url-guard.ts");
const {setLogSink} = load("lib/observability/logger.ts");
const {metricsSnapshot, resetMetricsForTests} = load("lib/observability/metrics.ts");

const PNG = Buffer.from("89504e470d0a1a0a0000", "hex");
let ipCounter = 0;
const freshIp = () => `198.51.100.${++ipCounter}`; // documentation range, used only as a bucket key

function request(target, {ip = freshIp(), headers = {}, sameOrigin = true} = {}) {
  const url = `http://localhost:3000/api/website-screenshot${target === undefined ? "" : `?url=${encodeURIComponent(target)}`}`;
  return new NextRequest(url, {
    headers: {
      host: "localhost:3000",
      "x-real-ip": ip,
      ...(sameOrigin ? {"sec-fetch-site": "same-origin"} : {}),
      ...headers,
    },
  });
}

beforeEach(() => {
  captureCalls = [];
  captureImpl = async () => PNG;
  setLogSink(() => {});
  resetMetricsForTests();
});

// --- origin guard ----------------------------------------------------------
test("cross-site requests are rejected before any work happens", async () => {
  const res = await GET(request("https://example.com", {sameOrigin: false, headers: {"sec-fetch-site": "cross-site"}}));
  assert.equal(res.status, 403);
  assert.equal((await res.json()).code, "forbidden_origin");
  assert.equal(captureCalls.length, 0);
});

test("requests with no fetch metadata and no Origin/Referer (scripts, curl) are rejected", async () => {
  const res = await GET(request("https://example.com", {sameOrigin: false}));
  assert.equal(res.status, 403);
  assert.equal(captureCalls.length, 0);
});

test("older browsers: matching Referer host is accepted, foreign Referer is not", async () => {
  const ok = await GET(request("https://example.com", {sameOrigin: false, headers: {referer: "http://localhost:3000/editor"}}));
  assert.equal(ok.status, 200);
  const bad = await GET(request("https://example.com", {sameOrigin: false, headers: {referer: "https://evil.example/page"}}));
  assert.equal(bad.status, 403);
});

// --- happy path and validation --------------------------------------------
test("a valid same-origin request returns the PNG with safe headers", async () => {
  const res = await GET(request("https://example.com/page?x=1#frag"));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "image/png");
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), PNG);
  assert.deepEqual(captureCalls, ["https://example.com/page?x=1"], "hash fragment is stripped");
});

test("internal and malformed targets get a 400 and never reach the browser", async () => {
  for (const target of ["http://127.0.0.1", "http://localhost", "http://169.254.169.254/latest/meta-data", "http://[::1]/", "http://2130706433", "ftp://example.com", "file:///etc/passwd", "not a url", undefined]) {
    const res = await GET(request(target));
    assert.equal(res.status, 400, String(target));
    assert.equal((await res.json()).code, "invalid_url", String(target));
  }
  assert.equal(captureCalls.length, 0);
});

test("a hostname that DNS-resolves to a private IP is rejected", async () => {
  const original = dns.lookup;
  dns.lookup = async () => [{address: "10.0.0.7", family: 4}];
  try {
    const res = await GET(request("https://innocent-looking.example"));
    assert.equal(res.status, 400);
    assert.equal(captureCalls.length, 0);
  } finally { dns.lookup = original; }
});

// --- error mapping ---------------------------------------------------------
test("capture failures map to the right status and never leak internals", async () => {
  captureImpl = async () => { throw new ScreenshotError("The website took too long to load. Try again or use another URL.", 504); };
  let res = await GET(request("https://slow.example"));
  assert.equal(res.status, 504);
  assert.equal((await res.json()).code, "capture_failed");

  captureImpl = async () => { throw new Error("ECONNRESET at /var/task/secret/path.js:42"); };
  res = await GET(request("https://boom.example"));
  assert.equal(res.status, 502);
  const body = await res.json();
  assert.doesNotMatch(JSON.stringify(body), /ECONNRESET|var\/task|secret/);
});

// --- rate limit ------------------------------------------------------------
test("rate limit: 3/min per client, then 429 with Retry-After; other clients unaffected", async () => {
  const ip = freshIp();
  for (let i = 0; i < 3; i++) assert.equal((await GET(request("http://127.0.0.1", {ip}))).status, 400);
  const limited = await GET(request("https://example.com", {ip}));
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).code, "rate_limited");
  assert.ok(Number(limited.headers.get("retry-after")) >= 1);
  assert.equal(captureCalls.length, 0, "a limited client never reaches the browser");

  assert.equal((await GET(request("https://example.com", {ip: freshIp()}))).status, 200);
});

test("IPv6 clients in the same /64 share one rate-limit bucket", async () => {
  const statuses = [];
  for (let i = 1; i <= 5; i++) {
    statuses.push((await GET(request("http://127.0.0.1", {ip: `2001:db8:abcd:12:${i}::${i}`}))).status);
  }
  assert.deepEqual(statuses, [400, 400, 400, 429, 429]);
});

// --- concurrency -----------------------------------------------------------
test("only one browser runs at a time here; the next request gets 503 immediately", async () => {
  let release;
  captureImpl = () => new Promise((resolve) => { release = () => resolve(PNG); });
  const first = GET(request("https://example.com/a"));
  await new Promise((r) => setTimeout(r, 20));

  const second = await GET(request("https://example.com/b"));
  assert.equal(second.status, 503);
  assert.equal((await second.json()).code, "busy");
  assert.equal(second.headers.get("retry-after"), "5");

  release();
  assert.equal((await first).status, 200);
  // capacity is returned once the first finishes
  captureImpl = async () => PNG;
  assert.equal((await GET(request("https://example.com/c"))).status, 200);
});

// --- logging and metrics ---------------------------------------------------
test("logs contain a hashed client and the hostname only, never the full URL or raw IP", async () => {
  const lines = [];
  setLogSink((level, line) => lines.push(JSON.parse(line)));
  const ip = "203.0.113.77";
  await GET(request("https://example.com/private/path?token=SECRET123", {ip}));
  await GET(request("http://127.0.0.1/admin", {ip: "203.0.113.78"}));

  const dump = JSON.stringify(lines);
  assert.doesNotMatch(dump, /SECRET123|private\/path|203\.0\.113\.7[78]|\/admin/);
  const ok = lines.find((l) => l.event === "capture.ok");
  assert.equal(ok.host, "example.com");
  assert.match(ok.client, /^[0-9a-f]{12}$/);
  assert.equal(typeof ok.durationMs, "number");
  assert.ok(lines.some((l) => l.event === "capture.blocked_url" && l.level === "warn"));
});

test("metrics count outcomes", async () => {
  await GET(request("https://example.com"));
  await GET(request("http://localhost"));
  await GET(request("https://example.com", {sameOrigin: false, headers: {"sec-fetch-site": "cross-site"}}));
  const {counts} = metricsSnapshot();
  assert.equal(counts.capture_ok, 1);
  assert.equal(counts.capture_blocked_url, 1);
  assert.equal(counts.capture_forbidden_origin, 1);
});
