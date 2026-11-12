/**
 * Soft daily cap on browser launches for this server instance (UTC day).
 * It keeps a single noisy day from exhausting a free tier's monthly compute.
 */
export class DailyBudget {
  private day = "";
  private used = 0;

  constructor(private readonly limit: number) {}

  tryConsume(now = Date.now()): boolean {
    const today = new Date(now).toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.used = 0;
    }
    if (this.used >= this.limit) return false;
    this.used += 1;
    return true;
  }

  get remaining() {
    return Math.max(this.limit - this.used, 0);
  }
}
