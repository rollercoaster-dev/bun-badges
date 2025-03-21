import { type Context as HonoContext } from "hono";
import { DatabaseService } from "@services/db.service";
import { inferAsyncReturnType } from "@trpc/server";

/**
 * Create context for tRPC procedures
 * This will be used to create a context for each request
 */
export async function createContext({
  c,
  db,
}: {
  c: HonoContext;
  db: DatabaseService;
}) {
  // Get the session from the request if it exists
  const user = c.get("user") || null;

  return {
    c,
    db,
    user,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
