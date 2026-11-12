process.env.LOG_LEVEL = "silent";
process.env.SCREENSHOT_ENABLED = "false";

const {test} = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const load = require("./_ts-loader.cjs");

let called = 0;
const capturePath = require.resolve(path.join(__dirname, "../src/lib/screenshot/capture.ts"));
require.cache[capturePath] = {id: capturePath, filename: capturePath, loaded: true, exports: {captureWebsite: async () => { called++; return Buffer.alloc(1); }}};

const {NextRequest} = require("next/server");
const {GET} = load("app/api/website-screenshot/route.ts");
const health = load("app/api/health/route.ts");

test("kill switch: capture is refused with 503 and the browser is never started", async () => {
  const res = await GET(new NextRequest("http://localhost:3000/api/website-screenshot?url=https%3A%2F%2Fexample.com", {
    headers: {host: "localhost:3000", "sec-fetch-site": "same-origin"},
  }));
  assert.equal(res.status, 503);
  assert.equal((await res.json()).code, "disabled");
  assert.equal(called, 0);
});

test("health endpoint reports the switch so you can see it from outside", async () => {
  const body = await health.GET().json();
  assert.equal(body.status, "ok");
  assert.equal(body.capture.enabled, false);
});
