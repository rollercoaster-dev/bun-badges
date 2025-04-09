import { Context, Next } from "hono";
import { verifyToken } from "@utils/auth/jwt";

// Import as type-only to avoid circular dependency
// Remove unused import: import type { DatabaseService } from "@services/db.service";
import type { IDatabaseService } from "@/interfaces/db.interface";
import { Role } from "./auth";
import logger from "../utils/logger";

export interface AuthContext extends Context {
  user?: {
    username: string;
    tokenType: "access" | "refresh";
    roles: Role[];
  };
  tokenPayload?: Record<string, unknown>;
}

export const createAuthMiddleware = (db: IDatabaseService) => {
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

      // Get user roles from database
      let userRoles = [Role.ISSUER_VIEWER]; // Default role
      try {
        // In a real implementation, we would fetch the user's roles from the database
        // For now, we'll use a mock implementation based on the token's scope
        const scope = (payload.scope as string) || "";

        if (scope.includes("ob:credentials:create")) {
          userRoles = [Role.ISSUER_OWNER];
        } else if (scope.includes("ob:credentials:read")) {
          userRoles = [Role.ISSUER_VIEWER];
        }

        // Special case for admin
        if (payload.sub === "admin") {
          userRoles = [Role.ADMIN];
        }
      } catch (roleError) {
        logger.error("Error getting user roles", { error: roleError });
      }

      // Add user info to context
      (c as AuthContext).user = {
        username: payload.sub,
        tokenType: payload.type as "access" | "refresh",
        roles: userRoles,
      };

      // Add token payload to context for scope-based authorization
      (c as AuthContext).tokenPayload = payload;

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
