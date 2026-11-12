const {test} = require("node:test");
const assert = require("node:assert/strict");
const load = require("./_ts-loader.cjs");

const {isPublicIp, expandIPv6, rateLimitKeyFor} = load("lib/screenshot/ip.ts");
const {
  parseTargetUrl,
  resolvePublicAddresses,
  ScreenshotError,
} = load("lib/screenshot/url-guard.ts");

test("public IPv4 addresses are allowed", () => {
  for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.32.0.1", "100.63.255.255"]) {
    assert.equal(isPublicIp(ip), true, ip);
  }
});

test("private, loopback, link-local and reserved IPv4 are denied", () => {
  const denied = [
    "0.0.0.0", "10.0.0.1", "10.255.255.255", "100.64.0.1", "127.0.0.1", "127.255.255.254",
    "169.254.169.254", "172.16.0.1", "172.31.255.255", "192.0.0.1", "192.0.2.10",
    "192.168.1.1", "198.18.0.1", "198.51.100.7", "203.0.113.9", "224.0.0.1",
    "240.0.0.1", "255.255.255.255",
  ];
  for (const ip of denied) assert.equal(isPublicIp(ip), false, ip);
});

test("IPv6 loopback, ULA, link-local, multicast and unspecified are denied", () => {
  for (const ip of ["::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1", "2001:db8::1"]) {
    assert.equal(isPublicIp(ip), false, ip);
  }
});

test("global unicast IPv6 is allowed", () => {
  for (const ip of ["2606:4700:4700::1111", "2001:4860:4860::8888", "2a00:1450:4001::200e"]) {
    assert.equal(isPublicIp(ip), true, ip);
  }
});

test("IPv4 hidden inside IPv6 is unwrapped and checked", () => {
  assert.equal(isPublicIp("::ffff:127.0.0.1"), false);
  assert.equal(isPublicIp("::ffff:7f00:1"), false);
  assert.equal(isPublicIp("::ffff:169.254.169.254"), false);
  assert.equal(isPublicIp("::ffff:10.0.0.1"), false);
  assert.equal(isPublicIp("64:ff9b::7f00:1"), false);
  assert.equal(isPublicIp("64:ff9b::a00:1"), false);
  assert.equal(isPublicIp("::ffff:8.8.8.8"), true);
  assert.equal(isPublicIp("2002:7f00:1::1"), false);
});

test("garbage is never public", () => {
  for (const value of ["", "example.com", "999.1.1.1", "not-an-ip"]) {
    assert.equal(isPublicIp(value), false, value);
  }
});

test("expandIPv6 handles compression and dotted tails", () => {
  assert.deepEqual(expandIPv6("::1"), [0, 0, 0, 0, 0, 0, 0, 1]);
  assert.deepEqual(expandIPv6("2001:db8::ff00:42:8329"), [0x2001, 0xdb8, 0, 0, 0, 0xff00, 0x42, 0x8329]);
  assert.deepEqual(expandIPv6("::ffff:1.2.3.4"), [0, 0, 0, 0, 0, 0xffff, 0x0102, 0x0304]);
  assert.equal(expandIPv6("1.2.3.4"), null);
});

test("IPv6 clients are rate-limited per /64", () => {
  assert.equal(rateLimitKeyFor("2001:db8:1:2:aaaa::1"), rateLimitKeyFor("2001:db8:1:2:bbbb::9"));
  assert.notEqual(rateLimitKeyFor("2001:db8:1:2::1"), rateLimitKeyFor("2001:db8:1:3::1"));
  assert.equal(rateLimitKeyFor("203.0.113.5"), "203.0.113.5");
});

test("parseTargetUrl accepts normal public URLs and strips the hash", () => {
  assert.equal(parseTargetUrl("https://example.com/a?b=1#frag").href, "https://example.com/a?b=1");
  assert.equal(parseTargetUrl("http://example.com:80/").hostname, "example.com");
  assert.equal(parseTargetUrl("https://example.com:443/").hostname, "example.com");
});

test("parseTargetUrl rejects unsafe or malformed input", () => {
  const bad = [
    null, "", "not a url", "ftp://example.com", "file:///etc/passwd", "javascript:alert(1)",
    "https://user:pass@example.com", "https://example.com:8080", "http://example.com:22",
    "http://localhost", "http://localhost.", "http://foo.localhost", "http://intranet",
    "http://printer.local", "http://svc.internal",
    "http://" + "a".repeat(3000) + ".com",
  ];
  for (const value of bad) {
    assert.throws(() => parseTargetUrl(value), ScreenshotError, String(value));
  }
});

test("IP-literal tricks are rejected at the resolve stage", async () => {
  // The WHATWG URL parser normalizes these to dotted-quad / bracketed forms.
  const tricks = [
    "http://127.0.0.1", "http://2130706433", "http://0x7f000001", "http://0177.0.0.1",
    "http://127.1", "http://169.254.169.254", "http://[::1]", "http://[::ffff:127.0.0.1]",
    "http://[fd00::1]", "http://10.1.2.3", "http://0",
  ];
  for (const raw of tricks) {
    const url = parseTargetUrl(raw);
    await assert.rejects(() => resolvePublicAddresses(url.hostname), ScreenshotError, raw);
  }
});

test("hostnames resolving to private space are rejected; mixed answers too", async () => {
  await assert.rejects(
    () => resolvePublicAddresses("evil.example.com", async () => ["127.0.0.1"]),
    ScreenshotError,
  );
  await assert.rejects(
    () => resolvePublicAddresses("rebind.example.com", async () => ["93.184.216.34", "10.0.0.5"]),
    ScreenshotError,
  );
  await assert.rejects(
    () => resolvePublicAddresses("v6.example.com", async () => ["::1"]),
    ScreenshotError,
  );
});

test("public resolution passes; DNS failure and empty answers give 502", async () => {
  assert.deepEqual(
    await resolvePublicAddresses("example.com", async () => ["93.184.216.34"]),
    ["93.184.216.34"],
  );
  await assert.rejects(
    () => resolvePublicAddresses("nx.example.com", async () => { throw new Error("ENOTFOUND"); }),
    (error) => error instanceof ScreenshotError && error.status === 502,
  );
  await assert.rejects(
    () => resolvePublicAddresses("empty.example.com", async () => []),
    (error) => error instanceof ScreenshotError && error.status === 502,
  );
});
