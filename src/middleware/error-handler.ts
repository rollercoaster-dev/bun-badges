import { Context, Next } from "hono";
import { APIError } from "../utils/errors";

// Global error handler middleware
export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
    return;
  } catch (error) {
    console.error("Error:", error);

    if (error instanceof APIError) {
      return c.json({ error: error.message }, error.status as any);
    }

    // Default to 500 for unknown errors
    return c.json({ error: "Internal Server Error" }, 500 as any);
  }
}
