import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
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
import { createSwaggerUI } from "./swagger";
import logger from "@utils/logger";
import { findAvailablePort } from "@utils/network";

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
app.route("/auth", auth);
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

// Add Swagger UI in development
if (process.env.NODE_ENV === "development") {
  app.route("/docs", createSwaggerUI("/docs"));
}

// Server startup configuration
const isDevEnv = process.env.NODE_ENV === "development";

// Get port configuration
const requestedPort = parseInt(process.env.PORT || "7777", 10);

// Find an available port starting from the requested port
const port = await findAvailablePort(requestedPort);

// Log server startup information
logger.info(
  `Server starting on port ${port} in ${process.env.NODE_ENV || "development"} mode...`,
);

// Display development tips
if (isDevEnv && !process.env.DOCKER_CONTAINER) {
  logger.info("Development Tips:");
  logger.info(
    '• For local database development, run: "bun run dev:docker" to use Docker Compose',
  );
  logger.info(`• Access API documentation at: http://localhost:${port}/docs`);
  logger.info(
    '• Try the Open Badges 3.0 example: "bun run examples/ob3-workflow.ts"',
  );
}

// Configure TLS if HTTPS is enabled
const useHttps = process.env.USE_HTTPS === "true";
const tlsConfig = useHttps
  ? {
      tls: {
        cert: process.env.TLS_CERT_FILE
          ? Bun.file(process.env.TLS_CERT_FILE)
          : undefined,
        key: process.env.TLS_KEY_FILE
          ? Bun.file(process.env.TLS_KEY_FILE)
          : undefined,
        passphrase: process.env.TLS_PASSPHRASE,
      },
    }
  : {};

// Log HTTPS status information
if (useHttps) {
  logger.info(`HTTPS enabled with certificate.`);
  logger.info(`Key file is configured.`);
  logger.info(`Using port: ${port} for HTTPS server`);
} else {
  logger.info("HTTPS is disabled. Running in HTTP mode.");
  logger.info(`Using port: ${port} for HTTP server`);
}

// Export the app with optional TLS configuration
// When USE_HTTPS is not set, this behaves exactly like the original export
export default {
  port,
  fetch: app.fetch,
  ...tlsConfig,
};

// Export the app instance directly for testing purposes
export { app as honoApp };
