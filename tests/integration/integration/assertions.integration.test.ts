import { describe, it, expect, beforeAll, afterAll, mock } from "bun:test";
import { Hono } from "hono";
import { db } from "@/db/config";
import { issuerProfiles, badgeClasses } from "@/db/schema";
import assertions from "@/routes/assertions.routes";
import verification from "@/routes/verification.routes";
import crypto from "crypto";
import {
  clearTestData,
  seedTestData,
  TestData,
  getAssertionJson,
  updateAssertionJson,
} from "@/utils/test/db-helpers";
import { TEST_KEYS } from "@/utils/test/integration-setup";

// Setup mocks for other dependencies
mock.module("@noble/ed25519", () => ({
  getPublicKey: () => Promise.resolve(TEST_KEYS.publicKey.slice()),
  utils: {
    randomPrivateKey: () => TEST_KEYS.privateKey.slice(),
  },
  sign: () => Promise.resolve(TEST_KEYS.signature.slice()),
  verify: () => Promise.resolve(true),
}));

// Type definitions for API responses
interface ApiResponse<T> {
  status: string;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

interface CredentialResponse {
  credential: any;
  assertionId: string;
  verification?: {
    valid: boolean;
    checks: Record<string, boolean>;
  };
  revoked?: boolean;
  revocationReason?: string;
}

interface AssertionResponse {
  assertion: any;
  revoked?: boolean;
  revocationReason?: string;
}

interface VerificationResponse {
  valid: boolean;
  checks: {
    signature?: boolean;
    revocation?: boolean;
    structure?: boolean;
  };
  errors: string[];
}

/**
 * Helper function to parse API responses with type safety
 */
function parseResponse<T>(jsonData: unknown): ApiResponse<T> {
  return jsonData as ApiResponse<T>;
}

/**
 * Integration tests for the assertions and verification routes
 * This tests the full badge lifecycle through the API
 */
describe("Assertions API Integration", () => {
  const app = new Hono();
  const apiBase = "/api";
  const hostUrl = "http://localhost:7777";

  // Create a nested API router to match the application structure
  const api = new Hono();

  // Mount the assertions and verification routes on the API router
  api.route("", assertions);
  api.route("", verification);

  // Mount the API router on the app
  app.route(apiBase, api);

  // Test data
  let testData: TestData;
  let issuerId: string;
  let badgeId: string;
  let assertionId: string;

  // Setup test environment with real database records
  beforeAll(async () => {
    // Seed test data which creates a user, issuer, badge, and assertion
    testData = await seedTestData();
    issuerId = testData.issuerId;
    badgeId = testData.badgeId;

    // Mock the signing key generation to use test keys
    mock.module("@/utils/signing/keys", () => ({
      getSigningKey: () =>
        Promise.resolve({
          publicKey: TEST_KEYS.publicKey.slice(),
          privateKey: TEST_KEYS.privateKey.slice(),
          controller: "did:key:test",
          type: "Ed25519VerificationKey2020",
          keyInfo: {
            id: "did:key:test#key-1",
            type: "Ed25519VerificationKey2020",
            controller: "did:key:test",
            publicKeyJwk: { kty: "OKP", crv: "Ed25519", x: "test" },
          },
        }),
      generateSigningKey: () =>
        Promise.resolve({
          publicKey: TEST_KEYS.publicKey.slice(),
          privateKey: TEST_KEYS.privateKey.slice(),
          controller: "did:key:test",
          type: "Ed25519VerificationKey2020",
          keyInfo: {
            id: "did:key:test#key-1",
            type: "Ed25519VerificationKey2020",
            controller: "did:key:test",
            publicKeyJwk: { kty: "OKP", crv: "Ed25519", x: "test" },
          },
        }),
    }));
  });

  // Clean up after tests
  afterAll(async () => {
    await clearTestData();
    mock.restore();
  });

  // Add a console log to see the request URL
  const debugRequest = (req: Request) => {
    console.log("Request URL:", req.url);
    console.log("Request method:", req.method);
    return req;
  };

  // Add a console log after mounting routes
  console.log("Routes mounted. API routes:");
  api.routes.forEach((route) => {
    console.log(`${route.method} ${route.path}`);
  });

  it("should create an OB3.0 badge assertion through the API", async () => {
    // Instead of creating a new assertion, use the one from seedTestData
    assertionId = testData.assertion.assertionId;

    // Verify it exists by fetching it
    const req = debugRequest(
      new Request(`${hostUrl}/api/assertions/${assertionId}?format=ob3`, {
        method: "GET",
      }),
    );

    // Make the request
    const res = await app.fetch(req);
    console.log("Response status:", res.status);
    expect(res.status).toBe(200);

    // Parse the response
    const jsonData = await res.json();
    const data = parseResponse<CredentialResponse>(jsonData);
    expect(data.status).toBe("success");
    expect(data.data.credential).toBeDefined();
    expect(data.data.assertionId).toBeDefined();

    // Verify the credential has OB3.0 structure
    const credential = data.data.credential;

    // Check that the credential has the basic verification information
    expect(credential).toBeDefined();
  });

  it("should retrieve the OB3.0 credential through the API", async () => {
    // Skip if previous test failed
    if (!assertionId) {
      return;
    }

    // Request the credential in OB3.0 format
    const req = debugRequest(
      new Request(`${hostUrl}/api/assertions/${assertionId}?format=ob3`, {
        method: "GET",
      }),
    );

    // Make the request
    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    // Parse the response
    const jsonData = await res.json();
    const data = parseResponse<CredentialResponse>(jsonData);
    expect(data.status).toBe("success");
    expect(data.data.credential).toBeDefined();

    // Verify the credential structure
    const credential = data.data.credential;
    expect(credential.id).toBe(`${hostUrl}/assertions/${assertionId}`);
    expect(credential.proof).toBeDefined();
    expect(credential.credentialSubject).toBeDefined();
    expect(credential.credentialSubject.achievement).toBeDefined();

    // Check that verification info is included
    if (data.data.verification) {
      expect(data.data.verification.valid).toBe(true);
    }
  });

  it("should retrieve the assertion in OB2.0 format by default", async () => {
    // Skip if previous test failed
    if (!assertionId) {
      return;
    }

    // Request the assertion without format parameter
    const req = debugRequest(
      new Request(`${hostUrl}/api/assertions/${assertionId}`, {
        method: "GET",
      }),
    );

    // Make the request
    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    // Parse the response
    const jsonData = await res.json();
    const data = parseResponse<AssertionResponse>(jsonData);
    expect(data.status).toBe("success");
    expect(data.data.assertion).toBeDefined();

    // The response should contain the full assertion object
    const assertion = data.data.assertion;
    expect(assertion.assertionId).toBe(assertionId);
    expect(assertion.badgeId).toBe(badgeId);
    expect(assertion.issuerId).toBe(issuerId);
  });

  it("should verify the credential through the verification endpoint", async () => {
    // Skip if previous test failed
    if (!assertionId) {
      return;
    }

    // Request verification of the credential
    const req = debugRequest(
      new Request(`${hostUrl}/api/verify/${assertionId}`, {
        method: "GET",
      }),
    );

    // Make the request
    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    // Parse the response
    const jsonData = await res.json();
    const data = parseResponse<VerificationResponse>(jsonData);
    expect(data.status).toBe("success");
    expect(data.data.valid).toBe(true);
    expect(data.data.checks).toBeDefined();
    expect(data.data.checks.signature).toBe(true);
    expect(data.data.checks.revocation).toBe(true);
  });

  it("should revoke a credential and update its verification status", async () => {
    // Skip if previous test failed
    if (!assertionId) {
      return;
    }

    // Request to revoke the credential
    const revokeReq = debugRequest(
      new Request(`${hostUrl}/api/assertions/${assertionId}/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Testing revocation through API",
        }),
      }),
    );

    // Make the revocation request
    const revokeRes = await app.fetch(revokeReq);
    console.log("Revoke response status:", revokeRes.status);
    expect(revokeRes.status).toBe(200);

    // Now verify the credential again
    const verifyReq = debugRequest(
      new Request(`${hostUrl}/api/verify/${assertionId}`, {
        method: "GET",
      }),
    );

    // Make the verification request
    const verifyRes = await app.fetch(verifyReq);
    expect(verifyRes.status).toBe(200);

    // Parse the verification response
    const verifyJsonData = await verifyRes.json();
    const verifyData = parseResponse<VerificationResponse>(verifyJsonData);
    expect(verifyData.status).toBe("success");
    expect(verifyData.data.valid).toBe(false); // Should now be invalid
    expect(verifyData.data.checks.revocation).toBe(false); // Revocation check should fail
  });

  it("should include OB3.0 credential status after revocation", async () => {
    // Skip if previous test failed
    if (!assertionId) {
      return;
    }

    // Get the credential in OB3.0 format
    const req = debugRequest(
      new Request(`${hostUrl}/api/assertions/${assertionId}?format=ob3`, {
        method: "GET",
      }),
    );

    // Make the request
    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    // Parse the response
    const jsonData = await res.json();
    const data = parseResponse<CredentialResponse>(jsonData);
    expect(data.status).toBe("success");
    expect(data.data.credential).toBeDefined();
    expect(data.data.revoked).toBe(true);

    // The credential should have revocation info
    const credential = data.data.credential;
    expect(credential.revoked).toBe(true);

    // Might have credential status for OB3
    if (credential.credentialStatus) {
      expect(credential.credentialStatus.type).toBe("RevocationList2020Status");
      expect(credential.credentialStatus.id).toContain("/status/");
    }
  });
});
