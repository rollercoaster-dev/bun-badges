import { expect, test, describe } from "bun:test";
import { RateLimiter } from "@utils/auth/rateLimiter";

describe("Rate Limiter", () => {
  test("allows attempts within limit", () => {
    const limiter = new RateLimiter({
      maxAttempts: 3,
      windowMs: 1000,
    });

    expect(limiter.attempt("test-key")).toBe(true);
    expect(limiter.attempt("test-key")).toBe(true);
    expect(limiter.attempt("test-key")).toBe(true);
  });

  test("blocks attempts over limit", () => {
    const limiter = new RateLimiter({
      maxAttempts: 2,
      windowMs: 1000,
    });

    expect(limiter.attempt("test-key")).toBe(true);
    expect(limiter.attempt("test-key")).toBe(true);
    expect(limiter.attempt("test-key")).toBe(false);
  });

  test("tracks attempts separately by key", () => {
    const limiter = new RateLimiter({
      maxAttempts: 2,
      windowMs: 1000,
    });

    expect(limiter.attempt("key1")).toBe(true);
    expect(limiter.attempt("key1")).toBe(true);
    expect(limiter.attempt("key1")).toBe(false);

    expect(limiter.attempt("key2")).toBe(true);
    expect(limiter.attempt("key2")).toBe(true);
    expect(limiter.attempt("key2")).toBe(false);
  });

  test("resets after window expires", async () => {
    const limiter = new RateLimiter({
      maxAttempts: 2,
      windowMs: 100,
    });

    expect(limiter.attempt("test-key")).toBe(true);
    expect(limiter.attempt("test-key")).toBe(true);
    expect(limiter.attempt("test-key")).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(limiter.attempt("test-key")).toBe(true);
  });

  test("returns correct remaining attempts", () => {
    const limiter = new RateLimiter({
      maxAttempts: 3,
      windowMs: 1000,
    });

    expect(limiter.getRemainingAttempts("test-key")).toBe(3);

    limiter.attempt("test-key");
    expect(limiter.getRemainingAttempts("test-key")).toBe(2);

    limiter.attempt("test-key");
    expect(limiter.getRemainingAttempts("test-key")).toBe(1);

    limiter.attempt("test-key");
    expect(limiter.getRemainingAttempts("test-key")).toBe(0);
  });

  test("returns time to reset", () => {
    const limiter = new RateLimiter({
      maxAttempts: 2,
      windowMs: 1000,
    });

    limiter.attempt("test-key");
    const timeToReset = limiter.getTimeToReset("test-key");

    expect(timeToReset).toBeGreaterThan(0);
    expect(timeToReset).toBeLessThanOrEqual(1000);
  });
});
