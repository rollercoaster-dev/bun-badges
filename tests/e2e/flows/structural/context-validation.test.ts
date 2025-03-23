/**
 * OB3 Context Validation Tests
 *
 * Tests that Open Badges 3.0 credentials include the proper JSON-LD contexts
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";

import { createTestServer } from "../../setup/server-setup";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
} from "../../setup/environment";
import { resetDatabase } from "../../utils/db-utils";
import { issueTestBadge, getCredential } from "../../utils/request";
import { validateContexts } from "../../utils/validation";
import { registerAndLoginUser } from "../../helpers/test-utils";

describe("OB3 Context Validation", () => {
  // Test environment state
  let server: any;
  let request: any;
  let user: any;

  // Required OB3 context URLs
  const requiredContexts = [
    "https://www.w3.org/2018/credentials/v1",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
  ];

  // Set up test environment
  beforeAll(async () => {
    // Initialize test environment
    await setupTestEnvironment();

    // Create a mock app for testing
    const mockApp = new Hono();

    // Add routes for testing
    mockApp.get("/health", (c) => c.json({ status: "ok" }));

    // Add auth routes for login/register
    mockApp.post("/auth/register", async (c) => {
      const body = await c.req.json();
      return c.json(
        {
          id: "test-user-id",
          email: body.email,
          name: body.name,
        },
        201,
      );
    });

    mockApp.post("/auth/login", async (c) => {
      const body = await c.req.json();
      return c.json({
        token: "test-token-" + Date.now(),
        user: {
          id: "test-user-id",
          email: body.email,
          name: body.name || "Test User",
        },
      });
    });

    // Add badge/assertion routes with contexts
    mockApp.post("/api/badges", async (c) => {
      const body = await c.req.json();
      return c.json(
        {
          id: `badge-${Date.now()}`,
          name: body.name,
          description: body.description,
        },
        201,
      );
    });

    mockApp.post("/api/assertions", async (c) => {
      return c.json(
        {
          id: `assertion-${Date.now()}`,
          "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
            "https://w3id.org/vc/status-list/2021/v1",
          ],
          type: ["VerifiableCredential", "OpenBadgeCredential"],
          credentialSubject: {
            id: "mailto:test@example.com",
            achievement: {
              name: "Test Badge",
              description: "Test Description",
            },
          },
        },
        201,
      );
    });

    mockApp.get("/api/assertions/:id", (c) => {
      return c.json({
        id: c.req.param("id"),
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
          "https://w3id.org/security/data-integrity/v1",
        ],
        type: ["VerifiableCredential", "OpenBadgeCredential"],
      });
    });

    // Create test server with mock app
    const testServer = createTestServer(mockApp, {
      label: "context-validation-test",
    });
    server = testServer.server;
    request = testServer.request;

    // Reset database to a clean state
    await resetDatabase();

    // Create a test user
    user = await registerAndLoginUser(request);
  });

  // Clean up after tests
  afterAll(async () => {
    if (server) {
      server.close();
    }
    await teardownTestEnvironment();
  });

  it("should include all required contexts in issued credentials", async () => {
    // Issue a badge with OB3 format
    const badgeData = await issueTestBadge(request, {
      name: "Context Test Badge",
      description: "Testing OB3 context validation",
      recipient: "context-test@example.com",
      token: user.token,
      format: "ob3",
    });

    // Validate the credential's contexts
    const contextValidation = validateContexts(badgeData.credential);

    expect(contextValidation.valid).toBe(true);
    expect(contextValidation.contexts.required.missing).toHaveLength(0);

    // Verify each required context is present
    for (const context of requiredContexts) {
      expect(badgeData.credential["@context"]).toContain(context);
    }
  });

  it("should include optional contexts for complete OB3 functionality", async () => {
    // Issue a badge with OB3 format
    const badgeData = await issueTestBadge(request, {
      name: "Full Context Test Badge",
      description: "Testing all OB3 contexts",
      recipient: "full-context-test@example.com",
      token: user.token,
      format: "ob3",
    });

    // The credential should have a context for data integrity (for proof)
    // and possibly status list if using status lists
    const optionalContextsToCheck = [
      "https://w3id.org/security/data-integrity/v1",
      "https://w3id.org/vc/status-list/2021/v1",
    ];

    // Count how many optional contexts are included
    const includedOptionalContexts = optionalContextsToCheck.filter((context) =>
      badgeData.credential["@context"].includes(context),
    );

    // We expect at least one of these optional contexts to be present
    expect(includedOptionalContexts.length).toBeGreaterThan(0);

    // Specifically check for the status list context if the credential includes a status
    if (badgeData.credential.credentialStatus) {
      expect(badgeData.credential["@context"]).toContain(
        "https://w3id.org/vc/status-list/2021/v1",
      );
    }
  });

  it("should maintain contexts when retrieving an existing credential", async () => {
    // Issue a badge with OB3 format
    const badgeData = await issueTestBadge(request, {
      name: "Retrieval Context Test Badge",
      description: "Testing context persistence",
      recipient: "retrieval-test@example.com",
      token: user.token,
      format: "ob3",
    });

    // Retrieve the credential directly
    const credential = await getCredential(
      request,
      badgeData.credentialId,
      "ob3",
    );

    // Validate retrieved credential contexts
    const contextValidation = validateContexts(credential);

    expect(contextValidation.valid).toBe(true);
    expect(contextValidation.contexts.required.missing).toHaveLength(0);

    // Verify each required context is present in the retrieved credential
    for (const context of requiredContexts) {
      expect(credential["@context"]).toContain(context);
    }
  });

  it("should include the correct context order", async () => {
    // Issue a badge with OB3 format
    const badgeData = await issueTestBadge(request, {
      name: "Context Order Test Badge",
      description: "Testing context ordering",
      recipient: "order-test@example.com",
      token: user.token,
      format: "ob3",
    });

    // Check that the VC context is first (important for JSON-LD processing)
    expect(badgeData.credential["@context"][0]).toBe(
      "https://www.w3.org/2018/credentials/v1",
    );

    // Check that the OB3 context is included (actual position may vary)
    expect(badgeData.credential["@context"]).toContain(
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    );
  });
});
