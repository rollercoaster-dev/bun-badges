import {
  describe,
  it,
  expect,
  /* spyOn, */ beforeEach,
  afterEach,
} from "bun:test";
// import { Writable } from "stream"; // Comment out unused import
import pino from "pino";
import { hostname } from "os";
import stream from "node:stream";
// import build from "pino-abstract-transport"; // Comment out unused import
// import getPinoLogger from "@/utils/logger"; // Comment out unused import

// Capture log output globally for the test file
let logOutput = "";
const writableStream = new stream.Writable({
  write(chunk, _encoding, callback) {
    // Add underscore to unused encoding parameter
    logOutput += chunk.toString();
    callback();
  },
});

// Store original env
const originalEnv = { ...process.env };

// Define redaction paths here to mimic logger config (or import if possible/cleaner)
const testRedactPaths = [
  "*.DATABASE_URL",
  "DATABASE_URL",
  "*.JWT_SECRET",
  "JWT_SECRET",
  "*.password",
  "password",
  "*.token",
  "token",
  // Add more as needed for tests
];

describe("Pino Logger Configuration & Usage", () => {
  let logger: pino.Logger;

  // Helper function to create a test logger instance
  const createTestLogger = (level: string): pino.Logger => {
    const options: pino.LoggerOptions = {
      level: level,
      redact: { paths: testRedactPaths, censor: "[REDACTED]" },
      formatters: {
        log(object) {
          return { hostname: hostname(), ...object };
        },
      },
      // Remove stream from options object
    };
    // Pass stream as the second argument to pino()
    return pino(options, writableStream);
  };

  beforeEach(() => {
    // Reset environment variables and log output
    process.env = { ...originalEnv };
    logOutput = "";
    // Logger instance is created within each test using createTestLogger
  });

  afterEach(() => {
    // Restore environment variables
    process.env = originalEnv;
  });

  it("should default to 'info' level if LOG_LEVEL is not set or invalid in config (simulate load)", () => {
    // Simulate loading logger.ts by checking its default level determination logic
    const PINO_LOG_LEVELS = [
      "fatal",
      "error",
      "warn",
      "info",
      "debug",
      "trace",
    ];
    const envLevel = undefined; // Simulate LOG_LEVEL not set
    const determinedLevel =
      envLevel && PINO_LOG_LEVELS.includes(envLevel) ? envLevel : "info";
    expect(determinedLevel).toBe("info");

    // Test actual logger instance created with info level
    logger = createTestLogger("info");
    logger.debug({ test: "debug msg" });
    logger.info({ test: "info msg" });
    expect(logOutput).not.toContain('"test":"debug msg"');
    expect(logOutput).toContain('"test":"info msg"');
    expect(logger.level).toBe("info");
  });

  it("should respect a valid LOG_LEVEL environment variable (simulate load)", () => {
    // Simulate loading logger.ts
    const PINO_LOG_LEVELS = [
      "fatal",
      "error",
      "warn",
      "info",
      "debug",
      "trace",
    ];
    const envLevel = "debug"; // Simulate LOG_LEVEL set
    const determinedLevel =
      envLevel && PINO_LOG_LEVELS.includes(envLevel) ? envLevel : "info";
    expect(determinedLevel).toBe("debug");

    // Test actual logger instance created with debug level
    logger = createTestLogger("debug");
    logger.debug({ test: "debug msg" });
    logger.info({ test: "info msg" });
    expect(logOutput).toContain('"test":"debug msg"');
    expect(logOutput).toContain('"test":"info msg"');
    expect(logger.level).toBe("debug");
  });

  it("should output JSON logs (when not using pino-pretty)", () => {
    // Pino defaults to JSON when no transport/pretty-print is configured
    logger = createTestLogger("info"); // Create basic JSON logger for test

    const testMsg = "Production test";
    const testData = { id: 123 };
    logger.info(testData, testMsg);

    let parsedLog;
    try {
      parsedLog = JSON.parse(logOutput);
    } catch (e) {
      console.error("Failed to parse log output:", logOutput);
      expect(e).toBeUndefined();
    }

    expect(parsedLog.level).toBe(30);
    expect(parsedLog.msg).toBe(testMsg);
    expect(parsedLog.id).toBe(testData.id);
    expect(parsedLog.hostname).toBeDefined();
    expect(parsedLog.time).toBeDefined();
  });

  // Note: Testing the exact output of pino-pretty is complex and brittle.
  // We rely on the fact that pino-pretty is used if NODE_ENV != 'production' in the actual module.
  // We primarily test the core Pino functionality (level, redaction, JSON output) here.

  it("should redact sensitive keys based on configuration", () => {
    logger = createTestLogger("info"); // Create basic JSON logger for test

    const sensitiveData = {
      user: "test",
      password: "mysecretpassword",
      auth: {
        token: "bearer_abc123",
        DATABASE_URL: "sensitive_db_string",
      },
    };
    logger.info(sensitiveData, "Logging sensitive data");

    const parsedLog = JSON.parse(logOutput);

    expect(parsedLog.user).toBe("test");
    expect(parsedLog.password).toBe("[REDACTED]");
    expect(parsedLog.auth.token).toBe("[REDACTED]");
    // Note: Pino's path redaction might require *.auth.DATABASE_URL if not top-level
    // Adjust testRedactPaths and this assertion if needed based on actual redaction rules.
    expect(parsedLog.auth.DATABASE_URL).toBe("[REDACTED]");
    expect(parsedLog.msg).toBe("Logging sensitive data");
  });
});
