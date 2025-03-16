type RateLimitKey = string;

interface RateLimitEntry {
  count: number;
  resetAt: Date;
  lastAttempt: Date;
}

interface RateLimitOptions {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs?: number;
}

export class RateLimiter {
  private store = new Map<RateLimitKey, RateLimitEntry>();
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.options = {
      blockDurationMs: options.windowMs * 2,
      ...options,
    };
  }

  attempt(key: RateLimitKey): boolean {
    this.cleanup();
    const now = new Date();
    const entry = this.store.get(key);

    if (!entry) {
      this.store.set(key, {
        count: 1,
        resetAt: new Date(now.getTime() + this.options.windowMs),
        lastAttempt: now,
      });
      return true;
    }

    if (now > entry.resetAt) {
      this.store.set(key, {
        count: 1,
        resetAt: new Date(now.getTime() + this.options.windowMs),
        lastAttempt: now,
      });
      return true;
    }

    if (entry.count >= this.options.maxAttempts) {
      const blockedUntil = new Date(entry.lastAttempt.getTime() + this.options.blockDurationMs);
      if (now < blockedUntil) {
        return false;
      }
      this.store.set(key, {
        count: 1,
        resetAt: new Date(now.getTime() + this.options.windowMs),
        lastAttempt: now,
      });
      return true;
    }

    entry.count += 1;
    entry.lastAttempt = now;
    return true;
  }

  getRemainingAttempts(key: RateLimitKey): number {
    const entry = this.store.get(key);
    if (!entry) {
      return this.options.maxAttempts;
    }
    return Math.max(0, this.options.maxAttempts - entry.count);
  }

  getTimeToReset(key: RateLimitKey): number {
    const entry = this.store.get(key);
    if (!entry) {
      return 0;
    }
    const now = new Date();
    if (now > entry.resetAt) {
      return 0;
    }
    return entry.resetAt.getTime() - now.getTime();
  }

  private cleanup(): void {
    const now = new Date();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
} 