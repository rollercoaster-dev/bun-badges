import { describe, it, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { Logger, createLogger } from "@/utils/logger";
import * as sanitizeUtil from "@/utils/sanitize";

// Store original console methods
// const originalConsole = {
//   debug: console.debug,
//   info: console.info,
//   warn: console.warn,
//   error: console.error,
// };

// Hold spies
let consoleSpies: {
  debug: ReturnType<typeof spyOn>;
  info: ReturnType<typeof spyOn>;
  warn: ReturnType<typeof spyOn>;
  error: ReturnType<typeof spyOn>;
};

describe("Logger Utility", () => {
  let logger: Logger;

  beforeEach(() => {
    // Create spies before each test
    consoleSpies = {
      debug: spyOn(console, "debug").mockImplementation(() => {}),
      info: spyOn(console, "info").mockImplementation(() => {}),
      warn: spyOn(console, "warn").mockImplementation(() => {}),
      error: spyOn(console, "error").mockImplementation(() => {}),
    };
    // Create a logger instance for tests
    logger = createLogger("TestContext");

    // Mock NODE_ENV for consistent testing
    process.env.NODE_ENV = "development"; // Default to dev (pretty-print) for most tests
    process.env.LOG_LEVEL = "debug"; // Default to most verbose
  });

  afterEach(() => {
    // Restore original console methods and spies after each test
    consoleSpies.debug.mockRestore();
    consoleSpies.info.mockRestore();
    consoleSpies.warn.mockRestore();
    consoleSpies.error.mockRestore();
    // Restore original NODE_ENV if needed (or set explicitly in tests)
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
  });

  it("should call the correct console method based on level (dev)", () => {
    logger.debug("Debug message");
    expect(consoleSpies.debug).toHaveBeenCalledTimes(1);

    logger.info("Info message");
    expect(consoleSpies.info).toHaveBeenCalledTimes(1);

    logger.warn("Warn message");
    expect(consoleSpies.warn).toHaveBeenCalledTimes(1);

    logger.error("Error message");
    expect(consoleSpies.error).toHaveBeenCalledTimes(1);
  });

  it("should respect LOG_LEVEL", () => {
    process.env.LOG_LEVEL = "warn";
    logger = createLogger("LogLevelTest"); // Recreate logger to pick up new level

    logger.debug("Should not be logged");
    expect(consoleSpies.debug).not.toHaveBeenCalled();

    logger.info("Should not be logged");
    expect(consoleSpies.info).not.toHaveBeenCalled();

    logger.warn("Should be logged");
    expect(consoleSpies.warn).toHaveBeenCalledTimes(1);

    logger.error("Should be logged");
    expect(consoleSpies.error).toHaveBeenCalledTimes(1);
  });

  // --- Sanitization Tests ---

  it("should sanitize message and arguments before logging (dev mode)", () => {
    const sensitiveMsg = "User password=foo";
    const sensitiveArg = { token: "Bearer sk_123" };
    const expectedSanitizedMsg = /User password=\[REDACTED\]/;
    const expectedSanitizedArg = { token: "Bearer [REDACTED]" };

    logger.info(sensitiveMsg, sensitiveArg);

    expect(consoleSpies.info).toHaveBeenCalledTimes(1);
    // Check the arguments passed to the actual console.info call
    const firstArg = consoleSpies.info.mock.calls[0][0] as string; // The formatted string
    const secondArg = consoleSpies.info.mock.calls[0][1]; // The sanitized object

    // Check if the formatted string contains the redacted message part
    expect(firstArg).toMatch(expectedSanitizedMsg);
    // Check if the argument object was sanitized
    expect(secondArg).toEqual(expectedSanitizedArg);
  });

  it("should sanitize message and arguments before logging (production mode - JSON)", () => {
    process.env.NODE_ENV = "production";
    logger = createLogger("ProdSanitizeTest");

    const sensitiveMsg = "Secret key: sk_abc";
    const sensitiveArg = { DATABASE_URL: "sensitive_url" };
    const expectedSanitizedMsg = "Secret key: [REDACTED_API_KEY]";
    const expectedSanitizedArg = { DATABASE_URL: "[REDACTED_ENV]" };

    logger.error(sensitiveMsg, sensitiveArg);

    expect(consoleSpies.error).toHaveBeenCalledTimes(1);
    // Check the argument passed to console.error (should be a JSON string)
    const logJsonString = consoleSpies.error.mock.calls[0][0] as string;
    const logEntry = JSON.parse(logJsonString);

    expect(logEntry.message).toEqual(expectedSanitizedMsg);
    expect(logEntry.data).toBeInstanceOf(Array);
    expect(logEntry.data[0]).toEqual(expectedSanitizedArg);
    expect(logEntry.level).toEqual("ERROR");
    expect(logEntry.context).toEqual("ProdSanitizeTest");
  });

  it("should call sanitizeLogArguments before logging", () => {
    const sanitizeSpy = spyOn(
      sanitizeUtil,
      "sanitizeLogArguments",
    ).mockImplementation((_msg, _args) => {
      // Return dummy sanitized data for spy verification
      return {
        sanitizedMessage: "SANITIZED_MSG",
        sanitizedArgs: ["SANITIZED_ARG"],
      };
    });

    logger.warn("Original message", { originalArg: 1 });

    // Verify sanitizer was called
    expect(sanitizeSpy).toHaveBeenCalledTimes(1);
    expect(sanitizeSpy).toHaveBeenCalledWith("Original message", [
      { originalArg: 1 },
    ]);

    // Verify console.warn was called with the *sanitized* data (in dev mode)
    expect(consoleSpies.warn).toHaveBeenCalledTimes(1);
    const firstArg = consoleSpies.warn.mock.calls[0][0] as string;
    const secondArg = consoleSpies.warn.mock.calls[0][1];
    expect(firstArg).toContain("SANITIZED_MSG");
    expect(secondArg).toEqual("SANITIZED_ARG");

    sanitizeSpy.mockRestore(); // Clean up the spy
  });
});
