/**
 * Logger utility for the Bun Badges application
 *
 * This module provides a consistent logging interface that can be used
 * throughout the application. It respects the LOG_LEVEL environment variable.
 */

// LogLevels in order of verbosity (most to least verbose)
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Map string log levels from environment to enum values
const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
};

// Get log level from environment, default to INFO
const getLogLevelFromEnv = (): LogLevel => {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  return envLevel && envLevel in LOG_LEVEL_MAP
    ? LOG_LEVEL_MAP[envLevel]
    : LogLevel.INFO;
};

// Current log level from environment
const currentLogLevel = getLogLevelFromEnv();

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

// Primary logger class
class Logger {
  // Context for this logger instance
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Log a debug message - most verbose, for detailed troubleshooting
   */
  debug(message: string, ...args: unknown[]): void {
    if (currentLogLevel <= LogLevel.DEBUG) {
      console.debug(
        `${colors.dim}${formatTime()} ${colors.cyan}[DEBUG]${colors.reset} ${colors.dim}[${this.context}]${colors.reset} ${message}`,
        ...args,
      );
    }
  }

  /**
   * Log an info message - normal operational messages
   */
  info(message: string, ...args: unknown[]): void {
    if (currentLogLevel <= LogLevel.INFO) {
      console.info(
        `${colors.dim}${formatTime()} ${colors.green}[INFO]${colors.reset} ${colors.dim}[${this.context}]${colors.reset} ${message}`,
        ...args,
      );
    }
  }

  /**
   * Log a warning message - potential issues that don't prevent operation
   */
  warn(message: string, ...args: unknown[]): void {
    if (currentLogLevel <= LogLevel.WARN) {
      console.warn(
        `${colors.dim}${formatTime()} ${colors.yellow}[WARN]${colors.reset} ${colors.dim}[${this.context}]${colors.reset} ${message}`,
        ...args,
      );
    }
  }

  /**
   * Log an error message - serious issues that may impact operation
   */
  error(message: string, ...args: unknown[]): void {
    if (currentLogLevel <= LogLevel.ERROR) {
      console.error(
        `${colors.dim}${formatTime()} ${colors.red}[ERROR]${colors.reset} ${colors.dim}[${this.context}]${colors.reset} ${message}`,
        ...args,
      );
    }
  }
}

/**
 * Create a logger instance for a specific context
 * @param context The context for this logger (usually the class or file name)
 */
export const createLogger = (context: string): Logger => {
  return new Logger(context);
};

// Export a default logger for quick usage
export const logger = createLogger("app");

// Re-export for convenience
export default {
  createLogger,
  logger,
  LogLevel,
};
