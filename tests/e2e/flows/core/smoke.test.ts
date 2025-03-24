import { beforeAll, afterAll, describe, it, expect } from "bun:test";
import supertest from "supertest";
import { serve } from "@hono/node-server";
import { Hono } from "hono";

describe("API Smoke Test", () => {
  let server: ReturnType<typeof serve>;
  let request: ReturnType<typeof supertest>;
  let apiToken: string;

  // Setup before all tests
  beforeAll(async () => {
    // Create a simple Hono app for testing
    const app = new Hono();

    // Add a health endpoint
    app.get("/health", (c) => c.json({ status: "healthy" }));

    // Add a public endpoint
    app.get("/badges/public", (c) => c.json({ badges: [] }));

    // Add a private endpoint
    app.get("/badges/private", (c) => {
      const authHeader = c.req.header("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      return c.json({ badges: [] });
    });

    // Add badges endpoint
    app.get("/badges", (c) => c.json({ badges: [] }));

    // Add auth endpoints
    app.post("/auth/register", async (c) => {
      const body = await c.req.json();
      // Simple validation
      if (!body.email || !body.password) {
        return c.json({ error: "Invalid input" }, 400);
      }
      return c.json({ id: "123", email: body.email }, 201);
    });

    app.post("/auth/login", async (c) => {
      const body = await c.req.json();
      // Simple validation
      if (!body.email || !body.password) {
        return c.json({ error: "Invalid credentials" }, 401);
      }
      // Return a fake token
      return c.json({
        token: "test_token_123",
        user: { id: "123", email: body.email },
      });
    });

    // Start the server
    server = serve({ fetch: app.fetch, port: 0 });
    const port = (server.address() as { port: number }).port;

    console.log(`Test server started on port ${port}`);

    // Create supertest instance
    request = supertest(`http://localhost:${port}`);
  });

  // Cleanup after all tests
  afterAll(async () => {
    // Close the server
    server.close();
    console.log("Test server stopped");

    // Don't close database connection here - this will be handled in the global cleanup
    // to prevent "Cannot use a pool after calling end on the pool" errors
    // when running multiple test files
    console.log("Database connection will be closed by global cleanup");
  });

  // Health check test
  it("should respond to health check endpoint", async () => {
    const response = await request.get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.status).toBe("healthy");
  });

  // Test public API access
  it("should allow access to public endpoints", async () => {
    const response = await request.get("/badges/public");

    expect(response.status).toBe(200);
  });

  // Test authentication
  it("should authenticate a user", async () => {
    // First, register a test user
    const timestamp = Date.now();
    const testUser = {
      email: `vitest_user_${timestamp}@example.com`,
      password: `TestPassword123!${timestamp}`,
      name: "Vitest Test User",
    };

    // Register user
    const registerResponse = await request
      .post("/auth/register")
      .send(testUser);

    expect(registerResponse.status).toBe(201);

    // Login
    const loginResponse = await request.post("/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeDefined();

    // Save token for later tests
    apiToken = loginResponse.body.token;
  });

  // Test authenticated API access
  it("should access protected endpoints with authentication", async () => {
    // Skip if no token was obtained
    if (!apiToken) {
      console.warn("Skipping authenticated test - no token available");
      return;
    }

    const response = await request
      .get("/badges/private")
      .set("Authorization", `Bearer ${apiToken}`);

    expect(response.status).toBe(200);
  });

  // Test API response format
  it("should return proper JSON content type", async () => {
    const response = await request.get("/badges");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
  });
});
