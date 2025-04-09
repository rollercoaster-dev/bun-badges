/**
 * Key Management Routes
 *
 * This module defines the routes for key management operations.
 */

import { Hono } from "hono";
import { keyManagementController } from "../controllers/key-management.controller";
import { createAuthMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/authorization.middleware";
import { Role } from "../middleware/auth";
import { DatabaseService } from "../services/db.service";

/**
 * Create key management routes
 * @param db Database service
 * @returns Key management routes
 */
export const createKeyManagementRoutes = (db: DatabaseService) => {
  const keys = new Hono();

  // Apply authentication middleware to all routes
  keys.use("*", createAuthMiddleware(db));

  // Get all keys (admin only)
  keys.get("/", requireRole(Role.ADMIN), (c) =>
    keyManagementController.getKeys(c),
  );

  // Get a key by ID (admin only)
  keys.get("/:id", requireRole(Role.ADMIN), (c) =>
    keyManagementController.getKey(c),
  );

  // Create a new key (admin only)
  keys.post("/", requireRole(Role.ADMIN), (c) =>
    keyManagementController.createKey(c),
  );

  // Rotate a key (admin only)
  keys.post("/:id/rotate", requireRole(Role.ADMIN), (c) =>
    keyManagementController.rotateKey(c),
  );

  // Delete a key (admin only)
  keys.delete("/:id", requireRole(Role.ADMIN), (c) =>
    keyManagementController.deleteKey(c),
  );

  return keys;
};
