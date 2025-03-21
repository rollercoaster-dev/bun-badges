import { Context as HonoContext } from "hono";
import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "./context";
import { AppRouter } from "./index";
import { DatabaseService } from "@services/db.service";

/**
 * Creates a Hono middleware to handle tRPC requests
 */
export function createTRPCHonoMiddleware(
  router: AppRouter,
  db: DatabaseService,
) {
  return async (c: HonoContext) => {
    // Convert Hono request to a standard Request object
    // that the tRPC fetch adapter understands
    const req = c.req.raw;

    try {
      // Use the tRPC fetch adapter to handle the request
      const response = await fetchRequestHandler({
        endpoint: "/trpc",
        req,
        router,
        createContext: async () => createContext({ c, db }),
        onError:
          process.env.NODE_ENV === "development"
            ? ({ path, error }) => {
                console.error(
                  `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
                );
              }
            : undefined,
      });

      // Return the response directly
      return response;
    } catch (error) {
      console.error("tRPC error:", error);

      return new Response(
        JSON.stringify({
          error: {
            message: error instanceof Error ? error.message : "Unknown error",
            code:
              error instanceof TRPCError ? error.code : "INTERNAL_SERVER_ERROR",
          },
        }),
        {
          status: 500,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    }
  };
}
