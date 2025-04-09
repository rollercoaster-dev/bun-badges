/**
 * Credential Verification Routes
 *
 * This module defines the routes for credential verification API endpoints.
 */

import { Hono } from "hono";
import { credentialVerificationController } from "@/controllers/credential-verification.controller";
import { createAuthMiddleware } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/authorization.middleware";
import { Role } from "@/middleware/auth";
import { DatabaseService } from "@/services/db.service";

/**
 * Route constants for credential verification
 */
export const CREDENTIAL_VERIFICATION_ROUTES = {
  VERIFY_CREDENTIAL: "/credentials/:credentialId",
  VERIFY_CREDENTIAL_JWT: "/verify/jwt",
  VERIFY_CREDENTIAL_LD: "/verify/ld",
  CHECK_CREDENTIAL_STATUS: "/status/:credentialId",
  REVOKE_CREDENTIAL: "/revoke",
};

/**
 * Create credential verification routes
 * @param db Database service
 * @returns Credential verification routes
 */
export const createCredentialVerificationRoutes = (db: DatabaseService) => {
  const verification = new Hono();

  // Apply authentication middleware to protected routes
  const authMiddleware = createAuthMiddleware(db);

  // Public verification endpoints
  verification.get(CREDENTIAL_VERIFICATION_ROUTES.VERIFY_CREDENTIAL, (c) =>
    credentialVerificationController.verifyCredential(c),
  );

  verification.post(CREDENTIAL_VERIFICATION_ROUTES.VERIFY_CREDENTIAL_JWT, (c) =>
    credentialVerificationController.verifyCredentialJwt(c),
  );

  verification.post(CREDENTIAL_VERIFICATION_ROUTES.VERIFY_CREDENTIAL_LD, (c) =>
    credentialVerificationController.verifyCredentialLd(c),
  );

  verification.get(
    CREDENTIAL_VERIFICATION_ROUTES.CHECK_CREDENTIAL_STATUS,
    (c) => credentialVerificationController.checkCredentialStatus(c),
  );

  // Protected routes (require authentication)
  verification.use(
    CREDENTIAL_VERIFICATION_ROUTES.REVOKE_CREDENTIAL,
    authMiddleware,
  );

  // Only issuers can revoke credentials
  verification.post(
    CREDENTIAL_VERIFICATION_ROUTES.REVOKE_CREDENTIAL,
    requireRole(Role.ISSUER_OWNER),
    (c) => credentialVerificationController.revokeCredential(c),
  );

  return verification;
};

export default createCredentialVerificationRoutes;
