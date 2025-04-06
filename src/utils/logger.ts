/**
 * Logger utility for the Bun Badges application
 *
 * This module provides a consistent logging interface that can be used
 * throughout the application. It respects the LOG_LEVEL environment variable.
 */

import pino from "pino";
import { hostname } from "os";

// Define log levels compatible with Pino
const PINO_LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace"];

// Determine log level from environment, default to 'info'
const logLevel = process.env.LOG_LEVEL?.toLowerCase() || "info";
const validLogLevel = PINO_LOG_LEVELS.includes(logLevel) ? logLevel : "info";

// Determine if running in production
const isProduction = process.env.NODE_ENV === "production";

// Define keys/paths to redact (adjust and expand as needed)
// Note: Simple paths for keys. Use wildcards (*) for array elements or deeper paths.
const redactPaths = [
  // Sensitive Env Vars often found in config objects
  "*.DATABASE_URL",
  "DATABASE_URL",
  "*.JWT_SECRET",
  "JWT_SECRET",
  "*.REFRESH_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "*.API_KEY",
  "API_KEY",
  "*.CLIENT_SECRET",
  "CLIENT_SECRET",
  // Common sensitive fields in objects
  "*.password",
  "password",
  "*.passwd",
  "passwd",
  "*.pwd",
  "pwd",
  "*.secret",
  "secret",
  "*.token",
  "token",
  "*.accessToken",
  "accessToken",
  "*.refreshToken",
  "refreshToken",
  // Headers
  "*.authorization",
  "authorization",
  "*.Authorization",
  "Authorization",
  "*.cookie",
  "cookie",
  "*.Cookie",
  "Cookie",
  // Example: Redact nested secrets
  "config.credentials.secretKey",
];

// Base Pino options
const pinoOptions: pino.LoggerOptions = {
  level: validLogLevel,
  // Redact sensitive information
  redact: {
    paths: redactPaths,
    censor: "[REDACTED]", // Character used for redaction
    remove: false, // Set to true to remove the key entirely instead of redacting
  },
  // Add hostname to logs
  formatters: {
    log(object) {
      return { hostname: hostname(), ...object };
    },
  },
};

// Conditional transport for pretty printing in development/test
if (!isProduction) {
  pinoOptions.transport = {
    target: "pino-pretty",
    options: {
      colorize: true, // Enable colors
      levelFirst: true, // Show level first
      translateTime: "SYS:standard", // Human-readable timestamp
      ignore: "pid,hostname", // Don't duplicate hostname
    },
  };
}

// Create the logger instance
const logger = pino(pinoOptions);

// Export the configured logger instance as default
export default logger;

// Optional: Re-export pino types if needed elsewhere, though direct usage is preferred
// export type { Logger } from 'pino';
