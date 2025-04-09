import { Hono } from "hono";
import { createAuthMiddleware } from "../middleware/auth.middleware";
import {
  requirePermission,
  requireRole,
  requireScope,
} from "../middleware/authorization.middleware";
import { Permission, Role } from "../models/auth/roles";
import { DatabaseService } from "../services/db.service";

/**
 * Create protected routes with role-based and permission-based access control
 * @param db Database service
 * @returns Protected routes
 */
export const createProtectedRoutes = (db: DatabaseService) => {
  const protectedRoutes = new Hono();

  // Apply authentication middleware to all routes
  protectedRoutes.use("*", createAuthMiddleware(db));

  // Role-based access control examples

  // Admin-only route
  protectedRoutes.get("/admin", requireRole("ADMIN" as Role), (c) => {
    return c.json({ message: "Admin access granted", user: c.get("user") });
  });

  // Issuer-only route
  protectedRoutes.get("/issuer", requireRole("ISSUER_OWNER" as Role), (c) => {
    return c.json({ message: "Issuer access granted", user: c.get("user") });
  });

  // Permission-based access control examples

  // Route requiring credential creation permission
  protectedRoutes.post(
    "/credentials",
    requirePermission(Permission.CREATE_CREDENTIALS),
    (c) => {
      return c.json({
        message: "Credential creation access granted",
        user: c.get("user"),
      });
    },
  );

  // Route requiring profile read permission
  protectedRoutes.get(
    "/profile",
    requirePermission(Permission.READ_PROFILE),
    (c) => {
      return c.json({
        message: "Profile read access granted",
        user: c.get("user"),
      });
    },
  );

  // Scope-based access control examples

  // Route requiring ob:credentials:read scope
  protectedRoutes.get(
    "/credentials",
    requireScope("ob:credentials:read"),
    (c) => {
      return c.json({
        message: "Credential read access granted",
        tokenPayload: c.get("tokenPayload") as Record<string, unknown>,
      });
    },
  );

  // Route requiring ob:profile:write scope
  protectedRoutes.put("/profile", requireScope("ob:profile:write"), (c) => {
    return c.json({
      message: "Profile write access granted",
      tokenPayload: c.get("tokenPayload") as Record<string, unknown>,
    });
  });

  return protectedRoutes;
};
