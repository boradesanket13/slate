function readInt(name: string, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

/** Tunable via environment variables; defaults suit a free public tool. */
export const screenshotConfig = {
  /** Master kill switch: set SCREENSHOT_ENABLED=false to turn capture off. */
  enabled: process.env.SCREENSHOT_ENABLED !== "false",
  /** Browser launches allowed per instance per UTC day. */
  dailyLimit: readInt("SCREENSHOT_DAILY_LIMIT", 150, 1, 100_000),
  /** Requests allowed per client per minute. */
  ratePerMinute: readInt("SCREENSHOT_RATE_LIMIT_PER_MINUTE", 4, 1, 1000),
  /** Requests allowed per client per hour. */
  ratePerHour: readInt("SCREENSHOT_RATE_LIMIT_PER_HOUR", 20, 1, 10_000),
  /** Simultaneous browser sessions per server instance. */
  maxConcurrent: readInt("SCREENSHOT_MAX_CONCURRENCY", 2, 1, 16),
  /** Page navigation timeout. */
  navigationTimeoutMs: readInt("SCREENSHOT_NAVIGATION_TIMEOUT_MS", 20_000, 3_000, 55_000),
  /** Absolute cap for a whole capture; the browser is killed after this. */
  hardTimeoutMs: readInt("SCREENSHOT_HARD_TIMEOUT_MS", 40_000, 5_000, 58_000),
  /** Largest PNG we will return. */
  maxImageBytes: 10 * 1024 * 1024,
  viewport: {width: 1440, height: 810},
} as const;
