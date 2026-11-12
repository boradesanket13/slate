process.env.LOG_LEVEL = "silent";
const {test} = require("node:test");
const assert = require("node:assert/strict");
const load = require("./_ts-loader.cjs");
const {NextRequest} = require("next/server");

const health = load("app/api/health/route.ts");
const metrics = load("app/api/metrics/route.ts");
const {isTrustedRequestOrigin} = load("lib/screenshot/origin.ts");
const {DailyBudget} = load("lib/screenshot/budget.ts");

const headers = (obj) => ({get: (name) => obj[name.toLowerCase()] ?? null});

test("health: 200, JSON, not cacheable, does not need a browser", async () => {
  const res = health.GET();
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const body = await res.json();
  assert.equal(body.status, "ok");
  assert.equal(body.service, "slate");
  assert.equal(body.capture.enabled, true);
  assert.ok(!Number.isNaN(Date.parse(body.time)));
});

test("metrics: invisible (404) unless METRICS_TOKEN is configured", () => {
  delete process.env.METRICS_TOKEN;
  assert.equal(metrics.GET(new NextRequest("http://localhost:3000/api/metrics")).status, 404);
});

test("metrics: requires the exact bearer token", async () => {
  process.env.METRICS_TOKEN = "correct-horse-battery";
  const call = (auth) => metrics.GET(new NextRequest("http://localhost:3000/api/metrics", {headers: auth ? {authorization: auth} : {}}));
  assert.equal(call().status, 401);
  assert.equal(call("Bearer wrong").status, 401);
  assert.equal(call("Bearer correct-horse-battery-extra").status, 401);
  assert.equal(call("correct-horse-battery").status, 401);
  const ok = call("Bearer correct-horse-battery");
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.scope, "this server instance only");
  assert.ok("capture_ok" in body.counts);
  delete process.env.METRICS_TOKEN;
});

test("origin guard decision table", () => {
  const cases = [
    [{"sec-fetch-site": "same-origin"}, true],
    [{"sec-fetch-site": "same-site"}, false],
    [{"sec-fetch-site": "cross-site"}, false],
    [{"sec-fetch-site": "none"}, false], // typed into the address bar
    [{host: "slate.vercel.app", origin: "https://slate.vercel.app"}, true],
    [{host: "slate.vercel.app", referer: "https://slate.vercel.app/editor"}, true],
    [{host: "slate.vercel.app", origin: "https://evil.example"}, false],
    [{host: "slate.vercel.app", referer: "https://slate.vercel.app.evil.example/"}, false],
    [{host: "slate.vercel.app", origin: "null"}, false],
    [{host: "slate.vercel.app"}, false],
    [{}, false],
    [{"x-forwarded-host": "slate.vercel.app", host: "internal:3000", origin: "https://slate.vercel.app"}, true],
  ];
  for (const [h, expected] of cases) assert.equal(isTrustedRequestOrigin(headers(h)), expected, JSON.stringify(h));
});

test("daily budget: limit holds within a UTC day and resets at midnight", () => {
  const budget = new DailyBudget(2);
  const noon = Date.UTC(2026, 9, 4, 12, 0, 0);
  assert.equal(budget.tryConsume(noon), true);
  assert.equal(budget.tryConsume(noon + 1000), true);
  assert.equal(budget.tryConsume(noon + 2000), false);
  assert.equal(budget.remaining, 0);
  assert.equal(budget.tryConsume(Date.UTC(2026, 9, 4, 23, 59, 59)), false);
  assert.equal(budget.tryConsume(Date.UTC(2026, 9, 5, 0, 0, 1)), true, "new UTC day");
  assert.equal(budget.remaining, 1);
});
