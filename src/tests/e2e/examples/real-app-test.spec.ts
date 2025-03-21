import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Hono } from "hono";
import {
  createTestServer,
  cleanupTestResources,
  registerAndLoginUser,
  authenticatedRequest,
  resetDatabase,
} from "../helpers/test-utils";

describe("Real Application E2E Test", () => {
  let server: ReturnType<typeof createTestServer>["server"];
  let request: ReturnType<typeof createTestServer>["request"];

  beforeAll(async () => {
    // Dynamic import of the app to ensure environment variables are set correctly
    const { default: appConfig } = await import("../../../index");

    // Create a Hono app that proxies to the real application
    const app = new Hono();
    app.all("*", async (c) => {
      try {
        // Pass the request to the real application
        return await appConfig.fetch(c.req.raw);
      } catch (error) {
        console.error("Error in app proxy:", error);
        return c.json({ error: "Internal Server Error" }, 500);
      }
    });

    // Create the test server with our proxy app
    const testServer = createTestServer(app);
    server = testServer.server;
    request = testServer.request;

    // Reset the database before tests
    await resetDatabase();
  });

  afterAll(async () => {
    await cleanupTestResources(server);
  });

  it("should check server health", async () => {
    const response = await request.get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    // The actual health check response structure depends on your implementation
    expect(response.body.status).toBeDefined();
  });

  it("should handle authentication flow", async () => {
    // This test will use the actual auth endpoints
    try {
      const user = await registerAndLoginUser(request);

      expect(user.token).toBeDefined();
      expect(user.userId).toBeDefined();

      // Test accessing a protected endpoint
      const badgesResponse = await authenticatedRequest(
        request,
        "get",
        "/badges",
        user.token,
      );

      expect(badgesResponse.status).toBe(200);
      expect(Array.isArray(badgesResponse.body)).toBe(true);
    } catch (error) {
      console.error("Auth flow error:", error);
      throw error;
    }
  });

  it("should access public endpoints without authentication", async () => {
    // Check if we can access public endpoints
    const publicResponse = await request.get("/badges/public");

    expect(publicResponse.status).toBe(200);
  });

  it("should reject access to protected endpoints without authentication", async () => {
    // Try to access a protected endpoint without authentication
    const protectedResponse = await request.get("/badges/private");

    // Should be rejected with 401 Unauthorized
    expect(protectedResponse.status).toBe(401);
  });
});
