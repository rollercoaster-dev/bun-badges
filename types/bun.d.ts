// Type definitions for custom Bun test matchers
// Extends the built-in types from bun-types

declare module "bun:test" {
  interface Assertion<T> {
    // Add any custom matchers here if needed
    // Example:
    // toBeValidBadge(): void;
  }

  interface AsymmetricMatchers {
    // Add any custom asymmetric matchers here if needed
  }
}
