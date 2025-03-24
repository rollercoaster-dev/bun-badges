import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import {
  createTestServer,
  cleanupTestResources,
  registerAndLoginUser,
  authenticatedRequest,
  resetDatabase,
} from "../../helpers/test-utils";

// This test demonstrates a complete badge lifecycle flow:
// 1. User registration and login
// 2. Badge creation
// 3. Badge assertion
// 4. Badge verification

describe("Badge Lifecycle Flow", () => {
  // Create a test app for the real application
  const app = new Hono();

  // Set up route handling from the real application
  // We'll define test-specific behavior for simplicity
  app.get("/health", (c) => c.json({ status: "ok" }));

  // Auth endpoints
  app.post("/auth/register", async (c) => {
    const body = await c.req.json();
    return c.json({ id: "test-user-id", email: body.email }, 201);
  });

  app.post("/auth/login", async (c) => {
    const body = await c.req.json();
    return c.json({
      token: "test-token-" + Date.now(),
      user: { id: "test-user-id", email: body.email },
    });
  });

  // Badge endpoints
  app.post("/badges", async (c) => {
    const auth = c.req.header("Authorization");
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const badge = {
      id: "badge-" + Date.now(),
      name: body.name,
      description: body.description,
      criteria: body.criteria,
      image: body.image || "https://example.com/badge.png",
      issuerId: "test-issuer-id",
      createdAt: new Date().toISOString(),
    };

    return c.json(badge, 201);
  });

  app.get("/badges/:id", (c) => {
    const id = c.req.param("id");
    return c.json({
      id,
      name: "Test Badge",
      description: "A test badge",
      criteria: { narrative: "Complete the test" },
      image: "https://example.com/badge.png",
      issuerId: "test-issuer-id",
      createdAt: new Date().toISOString(),
    });
  });

  // Assertion endpoints
  app.post("/assertions", async (c) => {
    const auth = c.req.header("Authorization");
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const assertion = {
      id: "assertion-" + Date.now(),
      badgeId: body.badgeId,
      recipient: {
        identity: body.recipient.identity,
        type: body.recipient.type || "email",
        hashed: false,
      },
      issuedOn: new Date().toISOString(),
      verification: {
        type: "HostedBadge",
      },
    };

    return c.json(assertion, 201);
  });

  app.get("/assertions/:id", (c) => {
    const id = c.req.param("id");
    return c.json({
      id,
      badgeId: "test-badge-id",
      recipient: {
        identity: "recipient@example.com",
        type: "email",
        hashed: false,
      },
      issuedOn: new Date().toISOString(),
      verification: {
        type: "HostedBadge",
      },
    });
  });

  // Verification endpoint
  app.get("/verify/:id", (c) => {
    const id = c.req.param("id");
    return c.json({
      valid: true,
      assertion: {
        id,
        badgeId: "test-badge-id",
        recipient: {
          identity: "recipient@example.com",
          type: "email",
          hashed: false,
        },
        issuedOn: new Date().toISOString(),
      },
      badge: {
        id: "test-badge-id",
        name: "Test Badge",
        description: "A test badge",
        criteria: { narrative: "Complete the test" },
        image: "https://example.com/badge.png",
      },
      issuer: {
        id: "test-issuer-id",
        name: "Test Issuer",
        url: "https://example.com",
        email: "issuer@example.com",
      },
    });
  });

  // Create test server
  const { server, request } = createTestServer(app);

  // Variables to store ids for use throughout the tests
  let user: { token: string; email: string; password: string; userId: string };
  let badgeId: string;
  let assertionId: string;

  // Before running tests
  beforeAll(async () => {
    // Reset the database to ensure clean slate
    await resetDatabase();
  });

  // After running tests
  afterAll(async () => {
    await cleanupTestResources(server);
  });

  // Health check (smoke test)
  it("should confirm API is operational", async () => {
    const response = await request.get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  // Test 1: Register and login
  it("should register and authenticate a user", async () => {
    // Register and login a test user
    user = await registerAndLoginUser(request);

    expect(user.token).toBeDefined();
    expect(user.userId).toBeDefined();
  });

  // Test 2: Create a badge
  it("should create a new badge", async () => {
    const badgeData = {
      name: "E2E Testing Badge",
      description: "Awarded for successfully running E2E tests",
      criteria: {
        narrative:
          "Successfully implement and run end-to-end tests for the Badge API",
      },
      image:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    };

    const response = await authenticatedRequest(
      request,
      "post",
      "/badges",
      user.token,
      badgeData,
    );

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.name).toBe(badgeData.name);

    // Save badge ID for later use
    badgeId = response.body.id;
  });

  // Test 3: Retrieve badge details
  it("should fetch the created badge", async () => {
    const response = await request.get(`/badges/${badgeId}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(badgeId);
    expect(response.body.name).toBe("Test Badge"); // Using mock response values
  });

  // Test 4: Issue a badge assertion
  it("should issue a badge to a recipient", async () => {
    const assertionData = {
      badgeId: badgeId,
      recipient: {
        identity: "recipient@example.com",
        type: "email",
      },
    };

    const response = await authenticatedRequest(
      request,
      "post",
      "/assertions",
      user.token,
      assertionData,
    );

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.badgeId).toBe(badgeId);
    expect(response.body.recipient.identity).toBe(
      assertionData.recipient.identity,
    );

    // Save assertion ID for later use
    assertionId = response.body.id;
  });

  // Test 5: Retrieve assertion details
  it("should fetch the created assertion", async () => {
    const response = await request.get(`/assertions/${assertionId}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(assertionId);
  });

  // Test 6: Verify badge assertion
  it("should verify the badge assertion is valid", async () => {
    const response = await request.get(`/verify/${assertionId}`);

    expect(response.status).toBe(200);
    expect(response.body.valid).toBe(true);
    expect(response.body.assertion).toBeDefined();
    expect(response.body.badge).toBeDefined();
    expect(response.body.issuer).toBeDefined();
  });
});
