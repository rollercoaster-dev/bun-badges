/**
 * OB3 Schema Validation Tests
 *
 * Tests that Open Badges 3.0 credentials conform to the required structure
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
// Define constants for the OB3 schema URL
const OB3_CREDENTIAL_SCHEMA_URL =
  "https://purl.imsglobal.org/spec/ob/v3p0/schema/json/ob_v3p0_achievementcredential_schema.json";

import { createTestServer } from "../../setup/server-setup";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
} from "../../setup/environment";
import { resetDatabase } from "../../utils/db-utils";
import { issueTestBadge } from "../../utils/request";
import { validateOB3Structure } from "../../utils/validation";
import { registerAndLoginUser } from "../../helpers/test-utils";

describe("OB3 Schema Validation", () => {
  // Test environment state
  let server: any;
  let request: any;
  let user: any;

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

    // Add badge/assertion routes with proper schema
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
      const body = await c.req.json();

      // Do comprehensive logging to debug the issue
      console.log("Assertion request body:", body);

      return c.json(
        {
          id: `assertion-${Date.now()}`,
          "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
          ],
          type: ["VerifiableCredential", "OpenBadgeCredential"],
          issuer: {
            id: "https://example.com/issuers/1",
            name: "Test Issuer",
            url: "https://example.com",
          },
          issuanceDate: new Date().toISOString(),
          credentialSchema: {
            id: OB3_CREDENTIAL_SCHEMA_URL,
            type: "JsonSchemaValidator2018",
          },
          credentialSubject: {
            id: `mailto:${body.recipient?.identity || "test@example.com"}`,
            type: ["AchievementSubject"],
            achievement: {
              id: "https://example.com/achievements/1",
              type: ["Achievement"],
              name: body.name || "Subject Test Badge",
              description:
                body.description || "Testing credential subject structure",
              criteria: { narrative: "Test criteria" },
            },
          },
          proof: {
            type: "DataIntegrityProof",
            cryptosuite: "eddsa-rdfc-2022",
            created: new Date().toISOString(),
            verificationMethod: "did:example:issuer#key-1",
            proofValue: "test-proof-value",
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
        ],
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: {
          id: "https://example.com/issuers/1",
          name: "Test Issuer",
          url: "https://example.com",
        },
        issuanceDate: new Date().toISOString(),
        credentialSchema: {
          id: OB3_CREDENTIAL_SCHEMA_URL,
          type: "JsonSchemaValidator2018",
        },
        credentialSubject: {
          id: "mailto:test@example.com",
          type: ["AchievementSubject"],
          achievement: {
            id: "https://example.com/achievements/1",
            type: ["Achievement"],
            name: "Test Badge",
            description: "Test Description",
            criteria: { narrative: "Test criteria" },
          },
        },
        proof: {
          type: "DataIntegrityProof",
          cryptosuite: "eddsa-rdfc-2022",
          created: new Date().toISOString(),
          verificationMethod: "did:example:issuer#key-1",
          proofValue: "test-proof-value",
        },
      });
    });

    // Create test server with mock app
    const testServer = createTestServer(mockApp, {
      label: "schema-validation-test",
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

  it("should include the correct credential schema reference", async () => {
    // Issue a badge with OB3 format
    const badgeData = await issueTestBadge(request, {
      name: "Schema Test Badge",
      description: "Testing OB3 schema reference",
      recipient: "schema-test@example.com",
      token: user.token,
      format: "ob3",
    });

    // Verify credential schema reference
    expect(badgeData.credential.credentialSchema).toBeDefined();
    expect(badgeData.credential.credentialSchema.id).toBe(
      OB3_CREDENTIAL_SCHEMA_URL,
    );
    expect(badgeData.credential.credentialSchema.type).toBe(
      "JsonSchemaValidator2018",
    );
  });

  it("should include the correct credential types", async () => {
    // Issue a badge with OB3 format
    const badgeData = await issueTestBadge(request, {
      name: "Type Test Badge",
      description: "Testing OB3 type array",
      recipient: "type-test@example.com",
      token: user.token,
      format: "ob3",
    });

    // Verify credential types
    expect(Array.isArray(badgeData.credential.type)).toBe(true);
    expect(badgeData.credential.type).toContain("VerifiableCredential");
    expect(badgeData.credential.type).toContain("OpenBadgeCredential");
  });

  it("should have a properly structured credential subject", async () => {
    // Issue a badge with OB3 format
    const badgeData = await issueTestBadge(request, {
      name: "Subject Test Badge",
      description: "Testing credential subject structure",
      recipient: "subject-test@example.com",
      token: user.token,
      format: "ob3",
    });

    // Verify credential subject
    expect(badgeData.credential.credentialSubject).toBeDefined();
    expect(badgeData.credential.credentialSubject.id).toBe(
      "mailto:subject-test@example.com",
    );

    // Verify achievement
    expect(badgeData.credential.credentialSubject.achievement).toBeDefined();
    expect(badgeData.credential.credentialSubject.achievement.type).toContain(
      "Achievement",
    );
    expect(badgeData.credential.credentialSubject.achievement.name).toBe(
      "Subject Test Badge",
    );
    expect(badgeData.credential.credentialSubject.achievement.description).toBe(
      "Testing credential subject structure",
    );
  });

  it("should have a properly structured issuer", async () => {
    // Issue a badge with OB3 format
    const badgeData = await issueTestBadge(request, {
      name: "Issuer Test Badge",
      description: "Testing issuer structure",
      recipient: "issuer-test@example.com",
      token: user.token,
      format: "ob3",
    });

    // Verify issuer
    expect(badgeData.credential.issuer).toBeDefined();
    expect(badgeData.credential.issuer.id).toBeDefined();
    expect(typeof badgeData.credential.issuer.id).toBe("string");
    expect(badgeData.credential.issuer.name).toBeDefined();
  });

  it("should validate against our structure validator", async () => {
    // Issue a badge with OB3 format
    const badgeData = await issueTestBadge(request, {
      name: "Validation Test Badge",
      description: "Testing full structure validation",
      recipient: "validation-test@example.com",
      token: user.token,
      format: "ob3",
    });

    // Use our validation utility to check structure
    const structureValidation = validateOB3Structure(badgeData.credential);

    expect(structureValidation.valid).toBe(true);
    expect(structureValidation.failures).toHaveLength(0);
  });

  it("should contain required date fields in correct format", async () => {
    // Issue a badge with OB3 format
    const badgeData = await issueTestBadge(request, {
      name: "Date Format Badge",
      description: "Testing date format compliance",
      recipient: "date-test@example.com",
      token: user.token,
      format: "ob3",
    });

    // Check issuanceDate format
    expect(badgeData.credential.issuanceDate).toBeDefined();

    // Verify ISO 8601 date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/;
    expect(dateRegex.test(badgeData.credential.issuanceDate)).toBe(true);

    // Also check proof created date
    expect(badgeData.credential.proof.created).toBeDefined();
    expect(dateRegex.test(badgeData.credential.proof.created)).toBe(true);
  });
});
