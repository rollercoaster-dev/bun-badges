import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import * as dotenv from "dotenv";
import * as path from "path";

// --- Load environment-specific .env file ---
const nodeEnv = process.env.NODE_ENV;
if (nodeEnv === "development") {
  dotenv.config({
    path: path.resolve(process.cwd(), ".env.development"),
    override: true,
  });
} else if (nodeEnv === "test") {
  dotenv.config({
    path: path.resolve(process.cwd(), ".env.test"),
    override: true,
  });
} else {
  // In production, load from .env file if it exists
  // This should be used only as a fallback, as production should use
  // environment variables set at the system/container level
  dotenv.config();
}
// --- End environment loading ---

import auth from "@routes/auth.routes";
import badges from "@routes/badges.routes";
import assertions from "@routes/assertions.routes";
import issuers from "@routes/issuers.routes";
import verification from "@routes/verification.routes";
import status from "@routes/status.routes";
import health from "@routes/health.routes";
import { createOAuthRouter } from "@routes/oauth.routes";
import { OAuthController } from "@controllers/oauth.controller";
import { errorHandler } from "@middleware/error-handler";
import { createAuthMiddleware } from "@middleware/auth.middleware";
import { DatabaseService } from "@services/db.service";
import { createProtectedRoutes } from "@routes/protected.routes";
import { createKeyManagementRoutes } from "@routes/key-management.routes";
import { createCredentialSigningRoutes } from "@routes/credential-signing.routes";
import { createCredentialVerificationRoutes } from "@routes/credential-verification.routes";
import { createSwaggerUI } from "./swagger";
import logger from "@utils/logger";

// Log environment configuration
logger.info(`Server starting in ${process.env.NODE_ENV || "production"} mode`);

// Create the Hono app instance
const app = new Hono();

// Initialize services and controllers
const db = new DatabaseService();
const oauthController = new OAuthController(db);

// Create the auth middleware
const authMiddleware = createAuthMiddleware(db);

// Middleware
app.use("*", honoLogger());
app.use("*", cors());
app.use("*", secureHeaders());
app.use("*", errorHandler);

// Add the auth middleware to protected routes
app.use("/api/*", authMiddleware);

// Create the OAuth router with Open Badges 3.0 endpoints
const oauthRouter = createOAuthRouter({
  registerClient: (c) => oauthController.registerClient(c),
  authorize: (c) => oauthController.authorize(c),
  token: (c) => oauthController.token(c),
  introspect: (c) => oauthController.introspect(c),
  revoke: (c) => oauthController.revoke(c),
  getServiceDescription: (c) => oauthController.getServiceDescription(c),
  getJwks: (c) => oauthController.getJwks(c),
});

// Add routes
app.route("/api/auth", auth);
app.route("/api/badges", badges);
app.route("/api/assertions", assertions);
app.route("/api/issuers", issuers);
app.route("/api/verify", verification);
app.route("/status", status);
app.route("/health", health);
app.route("/oauth", oauthRouter);

// Add protected routes with role-based access control
const protectedRoutes = createProtectedRoutes(db);
app.route("/protected", protectedRoutes);

// Add key management routes
const keyManagementRoutes = createKeyManagementRoutes(db);
app.route("/keys", keyManagementRoutes);

// Add credential signing routes
const credentialSigningRoutes = createCredentialSigningRoutes(db);
app.route("/credentials", credentialSigningRoutes);

// Add credential verification routes
const credentialVerificationRoutes = createCredentialVerificationRoutes(db);
app.route("/verify", credentialVerificationRoutes);

// Add Swagger UI in development
if (process.env.NODE_ENV === "development") {
  app.route("/docs", createSwaggerUI());
}

// Environment variables
const portEnv = process.env.PORT;
if (!portEnv) {
  throw new Error("PORT environment variable is not set.");
}
const port = parseInt(portEnv, 10);
const environment = process.env.NODE_ENV || "development";

// Start server
const server = Bun.serve({
  port,
  hostname: process.env.HOST,
  fetch: app.fetch,
});

logger.info(`🚀 Server running at http://${server.hostname}:${server.port}`);
logger.info(`Environment: ${environment}`);

if (environment === "development") {
  logger.info(
    `📚 API documentation available at: http://${server.hostname}:${server.port}/docs`,
  );
}

export default server;

// Export the app instance directly for testing purposes
export { app as honoApp };
