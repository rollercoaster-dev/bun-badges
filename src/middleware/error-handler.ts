import { Context, Next } from "hono";
import { APIError } from "../utils/errors";
import { ContentfulStatusCode } from "hono/utils/http-status";

// Global error handler middleware
export const errorHandler = async (c: Context, next: Next) => {
  try {
    return await next();
  } catch (error: unknown) {
    // Keep console.error for now, but prefix with a comment explaining why it's needed
    // TODO: Replace with proper logging mechanism
    console.error("Error:", error);

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
