/**
 * In-memory abuse controls. No database or external service is required.
 *
 * State lives in one server instance. On serverless platforms each warm
 * instance keeps its own counters, so these limits are a per-instance safety
 * net; a platform firewall rule (see README) provides a global cap.
 */

export type LimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

/** Sliding-window-log limiter. Only allowed requests are recorded. */
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  check(key: string, now = Date.now()): LimitResult {
    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((time) => time > cutoff);

    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(recent[0] + this.windowMs - now, 0),
      };
    }

    recent.push(now);
    // Re-insert so Map iteration order approximates least-recently-used.
    this.hits.delete(key);
    this.hits.set(key, recent);

    if (this.hits.size > this.maxKeys) {
      const oldest = this.hits.keys().next().value;
      if (oldest !== undefined) this.hits.delete(oldest);
    }

    return {allowed: true, remaining: this.limit - recent.length, retryAfterMs: 0};
  }
}

/** Runs several windows (e.g. per-minute and per-hour) as one limiter. */
export class MultiWindowLimiter {
  constructor(private readonly limiters: SlidingWindowLimiter[]) {}

  check(key: string, now = Date.now()): LimitResult {
    let worst: LimitResult = {allowed: true, remaining: Infinity, retryAfterMs: 0};
    for (const limiter of this.limiters) {
      const result = limiter.check(key, now);
      if (!result.allowed) return result;
      worst = {
        allowed: true,
        remaining: Math.min(worst.remaining, result.remaining),
        retryAfterMs: 0,
      };
    }
    return worst;
  }
}

/** Caps simultaneous browser sessions per instance. Never queues. */
export class ConcurrencyGate {
  private active = 0;

  constructor(private readonly max: number) {}

  /** Returns a release function, or null when the gate is full. */
  tryAcquire(): (() => void) | null {
    if (this.active >= this.max) return null;
    this.active += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active -= 1;
    };
  }
}

/**
 * Best-effort client address. Vercel sets `x-vercel-forwarded-for` itself and
 * overwrites `x-forwarded-for`, so both are trustworthy there. If you expose
 * the Node server directly to the internet, put a reverse proxy in front that
 * sets `x-real-ip`, otherwise clients can spoof these headers.
 */
export function getClientIp(headers: {get(name: string): string | null}) {
  const candidate =
    headers.get("x-vercel-forwarded-for") ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0];
  return candidate?.trim() || "unknown";
}
