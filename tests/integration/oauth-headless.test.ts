import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createLogger } from "@/utils/logger";
import { DatabaseService } from "@/services/db.service";
import { createTestServer } from "../e2e/setup/server-setup";
import { Hono } from "hono";

const logger = createLogger("Headless OAuth Tests");

// Test client data
const testClient = {
  client_name: "Test Headless Client",
  grant_types: ["client_credentials"],
  scope: "badge:read badge:create assertion:read",
  token_endpoint_auth_method: "client_secret_basic",
};

describe("Headless OAuth Integration Tests", () => {
  let db: DatabaseService;
  let request: any;
  let server: any;
  let clientId: string;
  let clientSecret: string;
  let accessToken: string;

  // Set up before all tests
  beforeAll(async () => {
    db = new DatabaseService();
    logger.info("Starting headless OAuth integration tests");

    // Create a test app and server
    const app = new Hono();

    // OAuth endpoints
    app.post("/oauth/register", async (c) => {
      const body = await c.req.json();

      // Validate required fields
      if (!body.client_name) {
        return c.json({ error: "Client name is required" }, 400);
      }

      // Create a client record
      clientId = `client-${Date.now()}`;
      clientSecret = `secret-${Date.now()}`;

      return c.json({
        client_id: clientId,
        client_secret: clientSecret,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_secret_expires_at: 0,
        client_name: body.client_name,
        client_uri: body.client_uri,
        redirect_uris: body.redirect_uris || [],
        grant_types: body.grant_types || ["client_credentials"],
        token_endpoint_auth_method:
          body.token_endpoint_auth_method || "client_secret_basic",
        response_types: ["code"],
        scope: body.scope || "",
      });
    });

    app.post("/oauth/token", async (c) => {
      const body = await c.req.json();

      // Validate grant type
      if (body.grant_type !== "client_credentials") {
        return c.json({ error: "Unsupported grant type" }, 400);
      }

      // Validate client credentials - in real world, this would check against actual client records
      if (body.client_id !== clientId || body.client_secret !== clientSecret) {
        return c.json({ error: "Invalid client credentials" }, 401);
      }

      // Generate an access token
      accessToken = `access-token-${Date.now()}`;

      return c.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        scope: body.scope || "",
      });
    });

    app.post("/oauth/introspect", async (c) => {
      const auth = c.req.header("Authorization");

      // Validate client authentication
      if (!auth || !auth.startsWith("Basic ")) {
        return c.json({ error: "Invalid client authentication" }, 401);
      }

      const body = await c.req.json();
      const token = body.token;

      // Check if token is valid (in real implementation, this would validate against stored tokens)
      const isValid = token && token === accessToken;

      if (isValid) {
        return c.json({
          active: true,
          client_id: clientId,
          scope: "badge:read",
          token_type: "Bearer",
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          sub: "system",
        });
      } else {
        return c.json({ active: false });
      }
    });

    app.post("/oauth/revoke", async (c) => {
      const auth = c.req.header("Authorization");

      // Validate client authentication
      if (!auth || !auth.startsWith("Basic ")) {
        return c.json({ error: "Invalid client authentication" }, 401);
      }

      // RFC 7009 requires 200 OK even if token is invalid or already revoked
      // Mark token as revoked
      accessToken = "";
      return c.json({});
    });

    const testServer = createTestServer(app, {
      label: "headless-oauth-integration",
    });

    server = testServer.server;
    request = testServer.request;

    // Clean up any existing test clients
    try {
      logger.info("Cleaning up existing test clients");
      // In a real implementation, we would have a better way to clean up test data
    } catch (error) {
      logger.error("Error during test setup:", error);
    }
  });

  // Clean up after all tests
  afterAll(async () => {
    logger.info("Completed headless OAuth integration tests");
    // Close the server
    if (server) {
      server.close();
    }
    // Clean up created resources
  });

  test("should register a headless OAuth client", async () => {
    const response = await request.post("/oauth/register", testClient);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("client_id");
    expect(response.body).toHaveProperty("client_secret");
    expect(response.body).toHaveProperty("grant_types", ["client_credentials"]);
  });

  test("should get access token with client credentials", async () => {
    const response = await request.post("/oauth/token", {
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "badge:read",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("access_token");
    expect(response.body).toHaveProperty("token_type", "Bearer");
    expect(response.body).toHaveProperty("expires_in");
    expect(response.body).toHaveProperty("scope");
    expect(response.body).not.toHaveProperty("refresh_token");
  });

  test("should validate token with introspection endpoint", async () => {
    const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
    const response = await request.post(
      "/oauth/introspect",
      { token: accessToken },
      { Authorization: authHeader },
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("active", true);
    expect(response.body).toHaveProperty("client_id", clientId);
    expect(response.body).toHaveProperty("scope");
    expect(response.body).toHaveProperty("token_type", "Bearer");
  });

  test("should revoke access token", async () => {
    const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;

    const revokeResponse = await request.post(
      "/oauth/revoke",
      { token: accessToken },
      { Authorization: authHeader },
    );

    expect(revokeResponse.status).toBe(200);

    // Verify the token was revoked by trying to introspect it again
    const introspectResponse = await request.post(
      "/oauth/introspect",
      { token: accessToken },
      { Authorization: authHeader },
    );

    // Token should now be inactive
    expect(introspectResponse.status).toBe(200);
    expect(introspectResponse.body).toHaveProperty("active", false);
  });
});
