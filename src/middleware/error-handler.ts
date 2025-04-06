import { Context, Next } from "hono";
import { APIError } from "../utils/errors";
import { ContentfulStatusCode } from "hono/utils/http-status";
// Import default Pino logger instance
import logger from "../utils/logger";

// Create a child logger with context
const handlerLogger = logger.child({ context: "ErrorHandler" });

// Global error handler middleware
export const errorHandler = async (c: Context, next: Next) => {
  try {
    return await next();
  } catch (error: unknown) {
    // Log error object first for better stack trace handling in Pino
    handlerLogger.error(error, "Unhandled API Error caught by global handler");

    if (error instanceof APIError) {
      return c.json(
        { error: error.message },
        error.status as ContentfulStatusCode,
      );
    }

    // Default to 500 for unknown errors
    return c.json(
      { error: "Internal Server Error" },
      500 as ContentfulStatusCode,
    );
  }
};
