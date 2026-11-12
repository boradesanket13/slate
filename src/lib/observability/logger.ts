import {createHash} from "node:crypto";

/**
 * Structured JSON logs written to stdout/stderr. Hosting platforms (and GitHub
 * Actions, Docker, systemd...) capture these for free. Never log full URLs,
 * raw IP addresses or user content.
 */
export type LogLevel = "info" | "warn" | "error";
export type LogFields = Record<string, string | number | boolean | null | undefined>;
export type LogSink = (level: LogLevel, line: string) => void;

const defaultSink: LogSink = (level, line) => {
  if (process.env.LOG_LEVEL === "silent") return;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

let sink: LogSink = defaultSink;

/** Test seam: capture log lines. Pass nothing to restore the default. */
export function setLogSink(next?: LogSink) {
  sink = next ?? defaultSink;
}

export function logEvent(level: LogLevel, event: string, fields: LogFields = {}) {
  sink(level, JSON.stringify({ts: new Date().toISOString(), level, event, ...fields}));
}

/** One-way, salted, truncated IP hash: enough to correlate abuse, not to identify someone. */
export function hashIp(ip: string) {
  const salt = process.env.LOG_HASH_SALT ?? "slate";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 12);
}
