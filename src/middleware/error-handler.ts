import { Context, Next } from "hono";
import { APIError } from "../utils/errors";
import { ContentfulStatusCode } from "hono/utils/http-status";

// Define type for error objects
interface ErrorObject {
  message: string;
  status?: number;
  [key: string]: unknown;
}

// Global error handler middleware
export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
    return;
  } catch (error: unknown) {
    console.error("Error:", error);

    // Type guard to check if error is an ErrorObject
    const isErrorObject = (err: unknown): err is ErrorObject => {
      return err !== null && typeof err === "object" && "message" in err;
    };

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
}
