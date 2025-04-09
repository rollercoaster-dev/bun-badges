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
  const protected = new Hono();

  // Apply authentication middleware to all routes
  protected.use("*", createAuthMiddleware(db));

  // Role-based access control examples

  // Admin-only route
  protected.get("/admin", requireRole(Role.ADMIN), (c) => {
    return c.json({ message: "Admin access granted", user: c.get("user") });
  });

  // Issuer-only route
  protected.get("/issuer", requireRole(Role.ISSUER), (c) => {
    return c.json({ message: "Issuer access granted", user: c.get("user") });
  });

  // Permission-based access control examples

  // Route requiring credential creation permission
  protected.post(
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
  protected.get("/profile", requirePermission(Permission.READ_PROFILE), (c) => {
    return c.json({
      message: "Profile read access granted",
      user: c.get("user"),
    });
  });

  // Scope-based access control examples

  // Route requiring ob:credentials:read scope
  protected.get("/credentials", requireScope("ob:credentials:read"), (c) => {
    return c.json({
      message: "Credential read access granted",
      tokenPayload: c.get("tokenPayload"),
    });
  });

  // Route requiring ob:profile:write scope
  protected.put("/profile", requireScope("ob:profile:write"), (c) => {
    return c.json({
      message: "Profile write access granted",
      tokenPayload: c.get("tokenPayload"),
    });
  });

  return protected;
};
