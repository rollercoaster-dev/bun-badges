// Simple in-memory rate limiter
export class RateLimiter {
  private store: Map<string, { count: number; resetTime: number }>;
  private max: number;
  private period: number;

  constructor({ max, period }: { max: number; period: number }) {
    this.store = new Map();
    this.max = max;
    this.period = period;
  }

  async isLimited(key: string): Promise<boolean> {
    const now = Date.now();
    const record = this.store.get(key);

    // If no record exists or the period has expired, create new record
    if (!record || now > record.resetTime) {
      this.store.set(key, {
        count: 1,
        resetTime: now + this.period,
      });
      return false;
    }

    // Increment count and check limit
    record.count++;
    if (record.count > this.max) {
      return true;
    }

    return false;
  }

  // Clean up expired records periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}
