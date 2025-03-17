import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import auth from "@routes/auth.routes";
import badges from "@routes/badges.routes";
import assertions from "@routes/assertions.routes";
import issuers from "@routes/issuers.routes";
import { createOAuthRouter } from "@routes/oauth.routes";
import { OAuthController } from "@controllers/oauth.controller";
import { errorHandler } from "@middleware/error-handler";
import { createAuthMiddleware } from "@middleware/auth.middleware";
import { DatabaseService } from "@services/db.service";
import { createSwaggerUI } from "./swagger";

const app = new Hono();

// Initialize services and controllers
const db = new DatabaseService();
const oauthController = new OAuthController(db);

// Create the auth middleware
const authMiddleware = createAuthMiddleware(db);

// Middleware
app.use("*", logger());
app.use("*", cors());
app.use("*", secureHeaders());
app.use("*", errorHandler);

// Routes
app.route("/auth", auth);
app.route("/oauth", createOAuthRouter(oauthController));

// API routes with selective auth middleware
const api = new Hono();

// Apply auth middleware only to mutation operations
api.use("/badges", async (c, next) => {
  if (["POST", "PUT", "DELETE"].includes(c.req.method)) {
    return authMiddleware(c, next);
  }
  await next();
  return;
});

api.use("/assertions", async (c, next) => {
  if (["POST", "PUT", "DELETE"].includes(c.req.method)) {
    return authMiddleware(c, next);
  }
  await next();
  return;
});

api.use("/issuers", async (c, next) => {
  if (["POST", "PUT", "DELETE"].includes(c.req.method)) {
    return authMiddleware(c, next);
  }
  await next();
  return;
});

// Mount the API routes
api.route("/badges", badges);
api.route("/assertions", assertions);
api.route("/issuers", issuers);
app.route("/api", api);

// Mount Swagger UI
app.route("/docs", createSwaggerUI());

// Root route
app.get("/", (c) => c.json({ message: "Bun Badges API" }));

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.0.1",
  });
});

// Log server startup
const port = parseInt(process.env.PORT || "7777", 10);
console.log(`Server will start on port ${port}...`);

// Export the app without manually calling serve()
// Bun will automatically serve this when using 'bun run'
export default app;
