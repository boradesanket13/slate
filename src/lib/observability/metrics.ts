/**
 * Tiny in-memory counters. They reset when the server instance restarts and
 * are per-instance on serverless platforms; they exist to answer "is something
 * wrong right now?", not to be a long-term analytics store.
 */
export const METRIC_NAMES = [
  "capture_ok",
  "capture_failed",
  "capture_blocked_url",
  "capture_rate_limited",
  "capture_busy",
  "capture_budget_exceeded",
  "capture_disabled",
  "capture_forbidden_origin",
] as const;

export type MetricName = (typeof METRIC_NAMES)[number];

type State = {
  startedAt: number;
  counts: Record<MetricName, number>;
  captureDurationMsTotal: number;
  captureDurationCount: number;
};

const globalState = globalThis as unknown as {__slateMetrics?: State};

function createState(): State {
  return {
    startedAt: Date.now(),
    counts: Object.fromEntries(METRIC_NAMES.map((name) => [name, 0])) as Record<MetricName, number>,
    captureDurationMsTotal: 0,
    captureDurationCount: 0,
  };
}

function state() {
  return (globalState.__slateMetrics ??= createState());
}

export function incrementMetric(name: MetricName) {
  state().counts[name] += 1;
}

export function observeCaptureDuration(ms: number) {
  const current = state();
  current.captureDurationMsTotal += ms;
  current.captureDurationCount += 1;
}

export function metricsSnapshot(now = Date.now()) {
  const current = state();
  return {
    scope: "this server instance only",
    uptimeSeconds: Math.round((now - current.startedAt) / 1000),
    counts: {...current.counts},
    captureAvgDurationMs: current.captureDurationCount
      ? Math.round(current.captureDurationMsTotal / current.captureDurationCount)
      : null,
  };
}

export function resetMetricsForTests() {
  globalState.__slateMetrics = createState();
}
