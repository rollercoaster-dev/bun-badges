/**
 * Credential Signing Routes
 *
 * This module defines the routes for credential signing and verification.
 */

import { Hono } from "hono";
import { credentialSigningController } from "../controllers/credential-signing.controller";
import { createAuthMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/authorization.middleware";
import { Role } from "../middleware/auth";
import { DatabaseService } from "../services/db.service";

/**
 * Create credential signing routes
 * @param db Database service
 * @returns Credential signing routes
 */
export const createCredentialSigningRoutes = (db: DatabaseService) => {
  const credentials = new Hono();

  // Apply authentication middleware to all routes
  credentials.use("*", createAuthMiddleware(db));

  // JWT signing and verification

  // Sign a credential using JWT (issuer only)
  credentials.post("/sign/jwt", requireRole(Role.ISSUER_OWNER), (c) =>
    credentialSigningController.signCredentialJwt(c),
  );

  // Verify a credential JWT (public)
  credentials.post("/verify/jwt", (c) =>
    credentialSigningController.verifyCredentialJwt(c),
  );

  // Linked Data Signatures signing and verification

  // Sign a credential using Linked Data Signatures (issuer only)
  credentials.post("/sign/ld", requireRole(Role.ISSUER_OWNER), (c) =>
    credentialSigningController.signCredentialLd(c),
  );

  // Verify a credential with Linked Data Signatures (public)
  credentials.post("/verify/ld", (c) =>
    credentialSigningController.verifyCredentialLd(c),
  );

  return credentials;
};
