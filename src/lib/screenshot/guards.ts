import {screenshotConfig} from "./config";
import {DailyBudget} from "./budget";
import {ConcurrencyGate, MultiWindowLimiter, SlidingWindowLimiter} from "./limits";

/** Shared per-instance state, kept on globalThis so dev hot-reloads don't reset it. */
const globalState = globalThis as unknown as {
  __slateScreenshotGuards?: {
    rateLimiter: MultiWindowLimiter;
    gate: ConcurrencyGate;
    budget: DailyBudget;
  };
};

export function getScreenshotGuards() {
  if (!globalState.__slateScreenshotGuards) {
    globalState.__slateScreenshotGuards = {
      rateLimiter: new MultiWindowLimiter([
        new SlidingWindowLimiter(screenshotConfig.ratePerMinute, 60_000),
        new SlidingWindowLimiter(screenshotConfig.ratePerHour, 3_600_000),
      ]),
      gate: new ConcurrencyGate(screenshotConfig.maxConcurrent),
      budget: new DailyBudget(screenshotConfig.dailyLimit),
    };
  }
  return globalState.__slateScreenshotGuards;
}
