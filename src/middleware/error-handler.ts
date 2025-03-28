import { Context, Next } from "hono";
import { APIError } from "../utils/errors";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { createLogger } from "../utils/logger";

// Create logger instance
const logger = createLogger("ErrorHandler");

// Global error handler middleware
export const errorHandler = async (c: Context, next: Next) => {
  try {
    return await next();
  } catch (error: unknown) {
    logger.error("Unhandled API Error:", error);

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
