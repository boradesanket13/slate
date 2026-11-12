// Daily budget enforced by the real route. Own file = own process, so the
// small limit cannot affect other tests.
process.env.LOG_LEVEL = "silent";
process.env.SCREENSHOT_DAILY_LIMIT = "3";
process.env.SCREENSHOT_RATE_LIMIT_PER_MINUTE = "1000";
process.env.SCREENSHOT_RATE_LIMIT_PER_HOUR = "1000";

const {test} = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const dns = require("node:dns/promises");
const load = require("./_ts-loader.cjs");

dns.lookup = async () => [{address: "93.184.216.34", family: 4}];
let launches = 0;
const capturePath = require.resolve(path.join(__dirname, "../src/lib/screenshot/capture.ts"));
require.cache[capturePath] = {id: capturePath, filename: capturePath, loaded: true, exports: {captureWebsite: async () => { launches++; return Buffer.from("png"); }}};

const {NextRequest} = require("next/server");
const {GET} = load("app/api/website-screenshot/route.ts");

const call = (target) => GET(new NextRequest(`http://localhost:3000/api/website-screenshot?url=${encodeURIComponent(target)}`, {
  headers: {host: "localhost:3000", "sec-fetch-site": "same-origin", "x-real-ip": "198.51.100.1"},
}));

test("after the daily budget is spent, captures get 503 and never start a browser", async () => {
  for (let i = 0; i < 3; i++) assert.equal((await call("https://example.com")).status, 200);
  assert.equal(launches, 3);

  const res = await call("https://example.com");
  assert.equal(res.status, 503);
  assert.equal((await res.json()).code, "daily_budget");
  assert.equal(res.headers.get("retry-after"), "3600");
  assert.equal(launches, 3, "no browser was launched past the budget");
});

test("invalid input never consumes budget, so it is still answered with 400", async () => {
  // Budget is already spent here; validation happens first and must still respond.
  const res = await call("http://127.0.0.1");
  assert.equal(res.status, 400);
  assert.equal(launches, 3);
});
