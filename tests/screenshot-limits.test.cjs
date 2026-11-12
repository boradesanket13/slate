const {test} = require("node:test");
const assert = require("node:assert/strict");
const load = require("./_ts-loader.cjs");

const {SlidingWindowLimiter, MultiWindowLimiter, ConcurrencyGate, getClientIp} =
  load("lib/screenshot/limits.ts");

test("sliding window allows up to the limit, then blocks with a retry time", () => {
  const limiter = new SlidingWindowLimiter(3, 60_000);
  const t0 = 1_000_000;
  assert.equal(limiter.check("a", t0).allowed, true);
  assert.equal(limiter.check("a", t0 + 1_000).allowed, true);
  const third = limiter.check("a", t0 + 2_000);
  assert.equal(third.allowed, true);
  assert.equal(third.remaining, 0);

  const blocked = limiter.check("a", t0 + 3_000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterMs, 57_000); // first hit expires at t0 + 60s
});

test("window slides: capacity returns as old hits expire", () => {
  const limiter = new SlidingWindowLimiter(2, 10_000);
  limiter.check("a", 0);
  limiter.check("a", 5_000);
  assert.equal(limiter.check("a", 9_999).allowed, false);
  assert.equal(limiter.check("a", 10_001).allowed, true); // first hit aged out
  assert.equal(limiter.check("a", 10_002).allowed, false); // hits at 5s and 10.001s still count
  assert.equal(limiter.check("a", 15_001).allowed, true);
});

test("blocked attempts are not recorded, so waiting the stated time works", () => {
  const limiter = new SlidingWindowLimiter(1, 10_000);
  limiter.check("a", 0);
  for (let i = 1; i < 50; i++) limiter.check("a", i * 100); // hammering while blocked
  assert.equal(limiter.check("a", 10_000 + 1).allowed, true);
});

test("clients are isolated from each other", () => {
  const limiter = new SlidingWindowLimiter(1, 60_000);
  assert.equal(limiter.check("a", 0).allowed, true);
  assert.equal(limiter.check("a", 1).allowed, false);
  assert.equal(limiter.check("b", 2).allowed, true);
});

test("key table is bounded so memory cannot grow without limit", () => {
  const limiter = new SlidingWindowLimiter(1, 60_000, 100);
  for (let i = 0; i < 1_000; i++) limiter.check(`ip-${i}`, i);
  assert.ok(limiter.hits.size <= 100, `size was ${limiter.hits.size}`);
});

test("multi-window limiter enforces the strictest window", () => {
  const limiter = new MultiWindowLimiter([
    new SlidingWindowLimiter(2, 60_000),
    new SlidingWindowLimiter(3, 3_600_000),
  ]);
  const t = 0;
  assert.equal(limiter.check("a", t).allowed, true);
  assert.equal(limiter.check("a", t + 1).allowed, true);
  assert.equal(limiter.check("a", t + 2).allowed, false); // minute window
  assert.equal(limiter.check("a", t + 61_000).allowed, true); // third of the hour
  assert.equal(limiter.check("a", t + 122_000).allowed, false); // hour window exhausted
});

test("concurrency gate caps parallel work, never queues, and releases once", () => {
  const gate = new ConcurrencyGate(2);
  const first = gate.tryAcquire();
  const second = gate.tryAcquire();
  assert.ok(first && second);
  assert.equal(gate.tryAcquire(), null);

  first();
  first(); // double release must not free extra capacity
  assert.ok(gate.tryAcquire());
  assert.equal(gate.tryAcquire(), null);
});

test("getClientIp prefers platform-set headers over x-forwarded-for", () => {
  const make = (obj) => ({get: (name) => obj[name] ?? null});
  assert.equal(getClientIp(make({"x-vercel-forwarded-for": "1.1.1.1", "x-forwarded-for": "9.9.9.9"})), "1.1.1.1");
  assert.equal(getClientIp(make({"x-real-ip": "2.2.2.2", "x-forwarded-for": "9.9.9.9"})), "2.2.2.2");
  assert.equal(getClientIp(make({"x-forwarded-for": " 3.3.3.3 , 4.4.4.4"})), "3.3.3.3");
  assert.equal(getClientIp(make({})), "unknown");
});
