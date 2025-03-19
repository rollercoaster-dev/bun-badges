import { Context, Next } from "hono";
import { verifyToken } from "@utils/auth/jwt";

// Import as type-only to avoid circular dependency
import type { DatabaseService } from "@services/db.service";

export interface AuthContext extends Context {
  user?: {
    username: string;
    tokenType: "access" | "refresh";
  };
}

export const createAuthMiddleware = (db: DatabaseService) => {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Authorization header is required" }, 401);
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    try {
      // Check if token is revoked
      if (await db.isTokenRevoked(token)) {
        return c.json({ error: "Token has been revoked" }, 401);
      }

      // Verify the token (defaults to access token type)
      const payload = await verifyToken(token, "access");

      // Add user info to context
      (c as AuthContext).user = {
        username: payload.sub,
        tokenType: payload.type as "access" | "refresh",
      };

      await next();
      return;
    } catch (error) {
      // Normalize error messages for invalid tokens
      if (error instanceof Error && error.message === "Invalid Compact JWS") {
        return c.json({ error: "Invalid token" }, 401);
      }
      if (error instanceof Error) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: "Invalid token" }, 401);
    }
  };
};
