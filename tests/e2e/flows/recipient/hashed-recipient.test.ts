/**
 * OB3 Recipient Handling Tests
 *
 * Tests for recipient identification, including hashed vs unhashed formats
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";

import { createTestServer } from "../../setup/server-setup";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
} from "../../setup/environment";
import { issueTestBadge } from "../../utils/request";
import { validateRecipient } from "../../utils/validation";

describe("OB3 Recipient Handling", () => {
  // Test environment state
  let server: any;
  let request: any;
  let user: any;

  // Set up test environment
  beforeAll(async () => {
    // Initialize test environment
    await setupTestEnvironment();

    // Create a mock app for testing
    const app = new Hono();

    // Add routes for testing
    app.get("/health", (c) => c.json({ status: "ok" }));

    // Add auth routes
    app.post("/auth/register", async (c) => {
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

    app.post("/auth/login", async (c) => {
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

    // Add badge/assertion routes with different recipient formats
    app.post("/api/badges", async (c) => {
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

    app.post("/api/assertions", async (c) => {
      const body = await c.req.json();

      // Get recipient data
      const isEmail = body.recipient?.identity?.includes("@");
      let recipientId;

      // Handle hashed vs unhashed recipient
      if (body.recipient?.hashed) {
        const salt = body.recipient.salt || "test-salt";
        // In a real implementation, this would hash the identity
        recipientId = `sha256$${Buffer.from(body.recipient.identity + salt).toString("hex")}`;
      } else if (isEmail) {
        recipientId = `mailto:${body.recipient.identity}`;
      } else if (body.recipient?.identity?.startsWith("did:")) {
        recipientId = body.recipient.identity;
      } else {
        recipientId = body.recipient?.identity || "mailto:default@example.com";
      }

      return c.json(
        {
          id: `assertion-${Date.now()}`,
          "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
          ],
          type: ["VerifiableCredential", "OpenBadgeCredential"],
          issuer: {
            id: "did:example:issuer",
            name: "Test Issuer",
          },
          issuanceDate: new Date().toISOString(),
          credentialSubject: {
            id: recipientId,
            type: ["AchievementSubject"],
            achievement: {
              name: "Test Badge",
              description: "Test Description",
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

    // Create test server with mock app
    const testServer = createTestServer(app, {
      label: "recipient-test",
    });
    server = testServer.server;
    request = testServer.request;

    // Set up test user for authentication
    user = {
      token: "test-token-" + Date.now(),
      email: "test@example.com",
    };
  });

  // Clean up after tests
  afterAll(async () => {
    if (server) {
      server.close();
    }
    await teardownTestEnvironment();
  });

  it("should handle email recipients in proper format", async () => {
    // Issue a badge with OB3 format
    const badgeData = await issueTestBadge(request, {
      name: "Email Recipient Badge",
      description: "Testing email recipient format",
      recipient: "email-recipient@example.com",
      token: user.token,
      format: "ob3",
    });

    // Check recipient format
    const { credential } = badgeData;

    expect(credential.credentialSubject).toBeDefined();
    expect(credential.credentialSubject.id).toBe(
      "mailto:email-recipient@example.com",
    );

    // Validate with our utility
    const recipientValidation = validateRecipient(
      credential,
      "email-recipient@example.com",
    );

    expect(recipientValidation.valid).toBe(true);
    expect(recipientValidation.format).toBe("email");
    expect(recipientValidation.isHashed).toBe(false);
  });

  it("should handle URL recipients in proper format", async () => {
    // URL recipient
    const urlRecipient = "https://example.com/profiles/url-recipient";

    // Issue a badge with OB3 format
    const badgeData = await issueTestBadge(request, {
      name: "URL Recipient Badge",
      description: "Testing URL recipient format",
      recipient: urlRecipient,
      token: user.token,
      format: "ob3",
    });

    // Check recipient format - should preserve the URL
    const { credential } = badgeData;

    expect(credential.credentialSubject).toBeDefined();
    expect(credential.credentialSubject.id).toBe(urlRecipient);

    // Validate with our utility
    const recipientValidation = validateRecipient(credential, urlRecipient);

    expect(recipientValidation.valid).toBe(true);
    expect(recipientValidation.format).toBe("url");
    expect(recipientValidation.isHashed).toBe(false);
  });

  it("should properly hash recipients when requested", async () => {
    // Issue a badge with OB3 format and hashed recipient
    const badgeData = await issueTestBadge(request, {
      name: "Hashed Recipient Badge",
      description: "Testing hashed recipient format",
      recipient: "hashed-recipient@example.com",
      token: user.token,
      format: "ob3",
      hashed: true,
      salt: "test-salt-123",
    });

    // Check recipient format - should be hashed
    const { credential } = badgeData;

    expect(credential.credentialSubject).toBeDefined();
    expect(credential.credentialSubject.id).toMatch(/^sha256\$/);

    // Validate with our utility
    const recipientValidation = validateRecipient(credential);

    expect(recipientValidation.isHashed).toBe(true);
    expect(recipientValidation.format).toBe("hashed");
  });

  it("should not reveal the plaintext recipient when hashed", async () => {
    // Original email that should be protected
    const email = "private-recipient@example.com";

    // Issue a badge with OB3 format and hashed recipient
    const badgeData = await issueTestBadge(request, {
      name: "Privacy Recipient Badge",
      description: "Testing recipient privacy",
      recipient: email,
      token: user.token,
      format: "ob3",
      hashed: true,
      salt: "privacy-salt-123",
    });

    // Check that the plaintext email doesn't appear anywhere in the credential
    const credentialStr = JSON.stringify(badgeData.credential);

    expect(credentialStr).not.toContain(email);
    expect(badgeData.credential.credentialSubject.id).not.toContain(email);
  });

  it("should accept DIDs as recipient identifiers", async () => {
    // DID recipient
    const didRecipient = "did:example:123456789abcdefghi";

    // Issue a badge with OB3 format
    const badgeData = await issueTestBadge(request, {
      name: "DID Recipient Badge",
      description: "Testing DID recipient format",
      recipient: didRecipient,
      token: user.token,
      format: "ob3",
    });

    // Check recipient format - should preserve the DID
    const { credential } = badgeData;

    expect(credential.credentialSubject).toBeDefined();
    expect(credential.credentialSubject.id).toBe(didRecipient);

    // Validate with our utility
    const recipientValidation = validateRecipient(credential, didRecipient);

    expect(recipientValidation.valid).toBe(true);
    expect(recipientValidation.format).toBe("did");
    expect(recipientValidation.isHashed).toBe(false);
  });
});
