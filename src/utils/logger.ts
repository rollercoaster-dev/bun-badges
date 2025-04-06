/**
 * Logger utility for the Bun Badges application
 *
 * This module provides a consistent logging interface that can be used
 * throughout the application. It respects the LOG_LEVEL environment variable.
 */

import { hostname } from "os";

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
const isProduction = process.env.NODE_ENV === "production";

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

// Helper to safely stringify potential circular structures
const safeStringify = (key: string, value: unknown) => {
  if (value instanceof Error) {
    return {
      message: value.message,
      stack: value.stack,
      name: value.name,
    };
  }
  // Add other custom serializers if needed
  return value;
};

// Primary logger class
class Logger {
  // Context for this logger instance
  private context: string;
  private hostname: string;

  constructor(context: string) {
    this.context = context;
    this.hostname = hostname(); // Get hostname once
  }

  private log(level: LogLevel, message: string, args: unknown[]): void {
    if (currentLogLevel > level) {
      return; // Skip logging if level is below current setting
    }

    const timestamp = formatTime();
    const levelString = LogLevel[level];

    if (isProduction) {
      // Production: Output structured JSON
      const logEntry = {
        timestamp,
        level: levelString,
        context: this.context,
        hostname: this.hostname,
        message,
        ...(args.length > 0 && { data: args }), // Include args if present
      };
      // Use console.error/warn/info/debug based on level for semantic logging
      switch (level) {
        case LogLevel.ERROR:
          console.error(JSON.stringify(logEntry, safeStringify));
          break;
        case LogLevel.WARN:
          console.warn(JSON.stringify(logEntry, safeStringify));
          break;
        case LogLevel.INFO:
          console.info(JSON.stringify(logEntry, safeStringify));
          break;
        case LogLevel.DEBUG:
        default:
          console.debug(JSON.stringify(logEntry, safeStringify));
          break;
      }
    } else {
      // Development/Test: Output pretty-printed console logs
      const colorMap = {
        [LogLevel.DEBUG]: colors.cyan,
        [LogLevel.INFO]: colors.green,
        [LogLevel.WARN]: colors.yellow,
        [LogLevel.ERROR]: colors.red,
      };
      const color = colorMap[level] || colors.white;
      const consoleMethod =
        {
          [LogLevel.DEBUG]: console.debug,
          [LogLevel.INFO]: console.info,
          [LogLevel.WARN]: console.warn,
          [LogLevel.ERROR]: console.error,
        }[level] || console.log;

      consoleMethod(
        `${colors.dim}${timestamp} ${color}[${levelString}]${colors.reset} ${colors.dim}[${this.context}]${colors.reset} ${message}`,
        ...args,
      );
    }
  }

  /**
   * Log a debug message - most verbose, for detailed troubleshooting
   */
  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, args);
  }

  /**
   * Log an info message - normal operational messages
   */
  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, args);
  }

  /**
   * Log a warning message - potential issues that don't prevent operation
   */
  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, args);
  }

  /**
   * Log an error message - serious issues that may impact operation
   */
  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, args);
  }
}

// Explicitly export the Logger class
export { Logger };

/**
 * Create a logger instance for a specific context
 * @param context The context for this logger (usually the class or file name)
 */
export const createLogger = (context: string): Logger => {
  return new Logger(context);
};

// Export a default logger for quick usage
export const logger = createLogger("app");
