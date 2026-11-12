import {NextRequest, NextResponse} from "next/server";

import {captureWebsite} from "@/lib/screenshot/capture";
import {screenshotConfig} from "@/lib/screenshot/config";
import {getScreenshotGuards} from "@/lib/screenshot/guards";
import {rateLimitKeyFor} from "@/lib/screenshot/ip";
import {getClientIp} from "@/lib/screenshot/limits";
import {isTrustedRequestOrigin} from "@/lib/screenshot/origin";
import {
  ScreenshotError,
  parseTargetUrl,
  resolvePublicAddresses,
} from "@/lib/screenshot/url-guard";
import {hashIp, logEvent} from "@/lib/observability/logger";
import {
  incrementMetric,
  observeCaptureDuration,
  type MetricName,
} from "@/lib/observability/metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 45;

function jsonError(message: string, code: string, status: number, headers?: HeadersInit) {
  return NextResponse.json(
    {error: message, code},
    {status, headers: {"Cache-Control": "no-store", ...headers}},
  );
}

export async function GET(request: NextRequest) {
  const {rateLimiter, gate, budget} = getScreenshotGuards();
  const clientHash = hashIp(getClientIp(request.headers));
  const reject = (
    metric: MetricName,
    event: string,
    message: string,
    code: string,
    status: number,
    headers?: HeadersInit,
    fields: Record<string, string | number> = {},
  ) => {
    incrementMetric(metric);
    logEvent("warn", event, {client: clientHash, status, ...fields});
    return jsonError(message, code, status, headers);
  };

  if (!screenshotConfig.enabled) {
    return reject("capture_disabled", "capture.disabled", "Website capture is turned off right now.", "disabled", 503);
  }

  if (!isTrustedRequestOrigin(request.headers)) {
    return reject("capture_forbidden_origin", "capture.forbidden_origin", "This request isn't allowed.", "forbidden_origin", 403);
  }

  const limit = rateLimiter.check(rateLimitKeyFor(getClientIp(request.headers)));
  if (!limit.allowed) {
    const retryAfter = Math.max(Math.ceil(limit.retryAfterMs / 1000), 1);
    return reject(
      "capture_rate_limited", "capture.rate_limited",
      `You're capturing too fast. Try again in ${retryAfter}s.`, "rate_limited", 429,
      {"Retry-After": String(retryAfter)}, {retryAfter},
    );
  }

  try {
    const target = parseTargetUrl(request.nextUrl.searchParams.get("url"));
    await resolvePublicAddresses(target.hostname);

    if (!budget.tryConsume()) {
      return reject("capture_budget_exceeded", "capture.budget_exceeded", "Today's website-capture limit has been reached. Try again tomorrow.", "daily_budget", 503, {"Retry-After": "3600"});
    }
    const release = gate.tryAcquire();
    if (!release) {
      return reject("capture_busy", "capture.busy", "Website capture is busy right now. Try again in a few seconds.", "busy", 503, {"Retry-After": "5"});
    }

    const startedAt = Date.now();
    try {
      const image = await captureWebsite(target);
      const durationMs = Date.now() - startedAt;
      incrementMetric("capture_ok");
      observeCaptureDuration(durationMs);
      logEvent("info", "capture.ok", {client: clientHash, host: target.hostname, durationMs, bytes: image.length});
      return new NextResponse(new Uint8Array(image), {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "image/png",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } finally {
      release();
    }
  } catch (error) {
    if (error instanceof ScreenshotError) {
      const blocked = error.status === 400;
      incrementMetric(blocked ? "capture_blocked_url" : "capture_failed");
      logEvent(blocked ? "warn" : "error", blocked ? "capture.blocked_url" : "capture.failed", {
        client: clientHash, status: error.status, reason: error.message,
      });
      return jsonError(error.message, blocked ? "invalid_url" : "capture_failed", error.status);
    }
    incrementMetric("capture_failed");
    logEvent("error", "capture.failed", {
      client: clientHash, status: 502, reason: error instanceof Error ? error.name : "unknown",
    });
    return jsonError("Could not capture this website. Try another URL.", "capture_failed", 502);
  }
}
