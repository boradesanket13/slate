const {test, before, after} = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const net = require("node:net");
const load = require("./_ts-loader.cjs");

const {startEgressProxy} = load("lib/screenshot/egress-proxy.ts");

let upstream;
let upstreamPort;
let upstreamHits = 0;

before(async () => {
  upstream = http.createServer((req, res) => {
    upstreamHits += 1;
    res.writeHead(200, {"Content-Type": "text/plain", "X-Seen-Host": req.headers.host ?? ""});
    res.end("secret-internal-data");
  });
  await new Promise((r) => upstream.listen(0, "127.0.0.1", r));
  upstreamPort = upstream.address().port;
});

after(() => new Promise((r) => upstream.close(r)));

function rawConnect(proxyPort, target) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(proxyPort, "127.0.0.1", () => {
      socket.write(`CONNECT ${target} HTTP/1.1\r\nHost: ${target}\r\n\r\n`);
    });
    let data = "";
    socket.on("data", (chunk) => {
      data += chunk.toString();
      if (data.includes("\r\n\r\n")) {
        socket.destroy();
        resolve(data.split("\r\n")[0]);
      }
    });
    socket.on("error", reject);
    socket.on("close", () => resolve(data.split("\r\n")[0] || "closed"));
  });
}

function proxiedGet(proxyPort, absoluteUrl) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {host: "127.0.0.1", port: proxyPort, method: "GET", path: absoluteUrl, headers: {Host: new URL(absoluteUrl).host}},
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({status: res.statusCode, body, headers: res.headers}));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

test("CONNECT to loopback / metadata / private literals is refused (default policy)", async () => {
  const proxy = await startEgressProxy();
  try {
    for (const target of [
      `127.0.0.1:${upstreamPort}`, "127.0.0.1:443", "169.254.169.254:443",
      "10.0.0.1:443", "[::1]:443", "[::ffff:127.0.0.1]:443", "localhost:443",
    ]) {
      const status = await rawConnect(proxy.port, target);
      assert.match(status, /403/, `${target} -> ${status}`);
    }
    assert.equal(upstreamHits, 0, "no request may reach the internal server");
  } finally {
    await proxy.close();
  }
});

test("CONNECT to non-web ports is refused even for public hosts", async () => {
  const proxy = await startEgressProxy({
    resolve: async () => ["93.184.216.34"],
  });
  try {
    for (const port of [22, 25, 3306, 6379, 8080]) {
      assert.match(await rawConnect(proxy.port, `example.com:${port}`), /403/, String(port));
    }
  } finally {
    await proxy.close();
  }
});

test("plain-HTTP proxying to internal addresses is refused", async () => {
  const proxy = await startEgressProxy();
  try {
    const before = upstreamHits;
    const res = await proxiedGet(proxy.port, `http://127.0.0.1:${upstreamPort}/`);
    assert.equal(res.status, 403);
    assert.equal(upstreamHits, before);
    assert.ok(proxy.blockedCount() >= 1);
  } finally {
    await proxy.close();
  }
});

test("DNS rebinding: hostname that resolves to an internal IP is refused", async () => {
  const proxy = await startEgressProxy({resolve: async () => ["127.0.0.1"]});
  try {
    const before = upstreamHits;
    const res = await proxiedGet(proxy.port, `http://rebind.example.com/`);
    assert.equal(res.status, 403);
    assert.match(await rawConnect(proxy.port, "rebind.example.com:443"), /403/);
    assert.equal(upstreamHits, before);
  } finally {
    await proxy.close();
  }
});

test("port allow-list is enforced before any DNS work", async () => {
  let lookups = 0;
  const proxy = await startEgressProxy({
    resolve: async () => { lookups += 1; return ["93.184.216.34"]; },
  });
  try {
    const res = await proxiedGet(proxy.port, "http://ok.example.com:9999/");
    assert.equal(res.status, 403);
    assert.equal(lookups, 0);
  } finally {
    await proxy.close();
  }
});

test("HTTP is forwarded to the validated IP, keeping the original Host header", async () => {
  // Test seam: treat loopback as "public" and allow the ephemeral test port.
  const lookups = [];
  const proxy = await startEgressProxy({
    resolve: async (host) => { lookups.push(host); return ["127.0.0.1"]; },
    isAllowed: () => true,
    allowedPorts: [upstreamPort],
  });
  try {
    const res = await proxiedGet(proxy.port, `http://pinned.example.com:${upstreamPort}/path?x=1`);
    assert.equal(res.status, 200);
    assert.equal(res.body, "secret-internal-data");
    assert.equal(res.headers["x-seen-host"], `pinned.example.com:${upstreamPort}`);
    assert.deepEqual(lookups, ["pinned.example.com"], "exactly one DNS lookup per request");
  } finally {
    await proxy.close();
  }
});

test("CONNECT tunnels bytes to the validated IP", async () => {
  const proxy = await startEgressProxy({
    resolve: async () => ["127.0.0.1"],
    isAllowed: () => true,
    allowedPorts: [upstreamPort],
  });
  try {
    const body = await new Promise((resolve, reject) => {
      const socket = net.connect(proxy.port, "127.0.0.1", () => {
        socket.write(`CONNECT tunnel.example.com:${upstreamPort} HTTP/1.1\r\nHost: x\r\n\r\n`);
      });
      let buffer = "";
      let tunneled = false;
      socket.on("data", (chunk) => {
        buffer += chunk.toString();
        if (!tunneled && buffer.includes("200 Connection Established\r\n\r\n")) {
          tunneled = true;
          buffer = "";
          socket.write("GET / HTTP/1.1\r\nHost: tunnel.example.com\r\nConnection: close\r\n\r\n");
        }
      });
      socket.on("close", () => resolve(buffer));
      socket.on("error", reject);
    });
    assert.match(body, /secret-internal-data/);
  } finally {
    await proxy.close();
  }
});

test("close() tears down open tunnels and the listener", async () => {
  const proxy = await startEgressProxy();
  const port = proxy.port;
  await proxy.close();
  await assert.rejects(
    () => new Promise((resolve, reject) => {
      const s = net.connect(port, "127.0.0.1", () => { s.destroy(); resolve(); });
      s.on("error", reject);
    }),
  );
});
