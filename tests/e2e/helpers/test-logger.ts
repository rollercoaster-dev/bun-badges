/**
 * Simple logger for E2E tests
 *
 * This provides a simplified logging interface for E2E tests that satisfies
 * ESLint requirements while maintaining important log output for test debugging.
 */

// Color codes for different log levels
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

// Timestamp formatter
const formatTime = (): string => {
  return new Date().toISOString();
};

// Determine if we're in a test environment
const isTestEnv =
  process.env.NODE_ENV === "test" ||
  process.env.VITEST ||
  process.env.JEST_WORKER_ID ||
  process.env.BUN_TEST;

/**
 * Simple logger class for tests
 */
class TestLogger {
  // Context for this logger instance
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Log an info message in tests
   */
  info(message: string, ...args: unknown[]): void {
    if (isTestEnv) {
      console.info(
        `${colors.dim}${formatTime()} ${colors.green}[INFO]${colors.reset} ${colors.dim}[${this.context}]${colors.reset} ${message}`,
        ...args,
      );
    }
  }

  /**
   * Log a warning message in tests
   */
  warn(message: string, ...args: unknown[]): void {
    if (isTestEnv) {
      console.warn(
        `${colors.dim}${formatTime()} ${colors.yellow}[WARN]${colors.reset} ${colors.dim}[${this.context}]${colors.reset} ${message}`,
        ...args,
      );
    }
  }

  /**
   * Log an error message in tests
   */
  error(message: string, ...args: unknown[]): void {
    if (isTestEnv) {
      console.error(
        `${colors.dim}${formatTime()} ${colors.red}[ERROR]${colors.reset} ${colors.dim}[${this.context}]${colors.reset} ${message}`,
        ...args,
      );
    }
  }
}

/**
 * Create a logger instance for a test context
 */
export const createTestLogger = (context: string): TestLogger => {
  return new TestLogger(context);
};

// Export a default logger for quick usage in tests
export const testLogger = createTestLogger("test");

export default {
  createTestLogger,
  testLogger,
};
