import http from "node:http";
import net from "node:net";
import type {Duplex} from "node:stream";

import {isPublicIp} from "./ip";
import {
  ALLOWED_PORTS,
  ScreenshotError,
  defaultResolver,
  normalizeHostname,
  resolvePublicAddresses,
  type HostResolver,
} from "./url-guard";

/**
 * A tiny forward proxy that Chromium is forced to use.
 *
 * Every connection the browser makes (the page, redirects, images, scripts,
 * fetch/XHR, WebSockets...) goes through here. We resolve DNS ourselves,
 * require every answer to be public, and connect to that exact IP. Because the
 * validated address is the address we connect to, DNS rebinding cannot swap in
 * a private one between "check" and "use".
 */

export type EgressProxyOptions = {
  /** Test seam: override DNS. Production uses the system resolver. */
  resolve?: HostResolver;
  /** Test seam: override the address policy. Production uses isPublicIp. */
  isAllowed?: (address: string) => boolean;
  /** Test seam: override the port allow-list. Production uses 80/443. */
  allowedPorts?: readonly number[];
  /** Idle timeout for upstream sockets. */
  socketTimeoutMs?: number;
};

export type EgressProxy = {
  port: number;
  blockedCount: () => number;
  close: () => Promise<void>;
};

const HOP_BY_HOP = new Set([
  "proxy-connection",
  "proxy-authorization",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
]);

export async function startEgressProxy(
  options: EgressProxyOptions = {},
): Promise<EgressProxy> {
  const resolve = options.resolve ?? defaultResolver;
  const isAllowed = options.isAllowed ?? isPublicIp;
  const allowedPorts = options.allowedPorts ?? ALLOWED_PORTS;
  const socketTimeoutMs = options.socketTimeoutMs ?? 20_000;
  const sockets = new Set<Duplex>();
  let blocked = 0;

  const track = (socket: Duplex) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  };

  const validate = async (hostname: string, port: number) => {
    if (!allowedPorts.includes(port)) {
      throw new ScreenshotError("Port not allowed.", 403);
    }
    const [address] = await resolvePublicAddresses(hostname, resolve, isAllowed);
    return address;
  };

  const server = http.createServer(async (req, res) => {
    try {
      const target = new URL(req.url ?? "");
      if (target.protocol !== "http:") throw new ScreenshotError("Unsupported.", 403);

      const port = target.port ? Number(target.port) : 80;
      const address = await validate(normalizeHostname(target.hostname), port);

      const headers = Object.fromEntries(
        Object.entries(req.headers).filter(([name]) => !HOP_BY_HOP.has(name)),
      );
      headers.host = target.host;

      const upstream = http.request(
        {
          host: address,
          port,
          method: req.method,
          path: `${target.pathname}${target.search}`,
          headers,
          timeout: socketTimeoutMs,
        },
        (upstreamRes) => {
          res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
          upstreamRes.pipe(res);
        },
      );
      upstream.on("timeout", () => upstream.destroy());
      upstream.on("error", () => {
        if (!res.headersSent) res.writeHead(502);
        res.end();
      });
      req.pipe(upstream);
    } catch {
      blocked += 1;
      if (!res.headersSent) res.writeHead(403, {"Content-Type": "text/plain"});
      res.end("Blocked");
    }
  });

  server.on("connection", track);

  // HTTPS goes through CONNECT tunnels.
  server.on("connect", async (req, clientSocket: Duplex, head: Buffer) => {
    track(clientSocket);
    clientSocket.on("error", () => clientSocket.destroy());

    try {
      const target = new URL(`http://${req.url}`);
      const port = Number(target.port || 443);
      const address = await validate(normalizeHostname(target.hostname), port);

      const upstream = net.connect({host: address, port});
      track(upstream);
      upstream.setTimeout(socketTimeoutMs, () => upstream.destroy());
      upstream.on("error", () => {
        clientSocket.destroy();
      });
      upstream.on("close", () => clientSocket.destroy());
      clientSocket.on("close", () => upstream.destroy());

      upstream.once("connect", () => {
        clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        if (head.length) upstream.write(head);
        upstream.pipe(clientSocket);
        clientSocket.pipe(upstream);
      });
    } catch {
      blocked += 1;
      clientSocket.end("HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n");
    }
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => resolveListen());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Egress proxy failed to bind.");
  }

  return {
    port: address.port,
    blockedCount: () => blocked,
    close: () =>
      new Promise<void>((resolveClose) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => resolveClose());
        server.closeAllConnections?.();
      }),
  };
}
