/**
 * Open Badges 3.0 Credential Validation Test Example
 *
 * This file demonstrates how to validate a credential against the Open Badges 3.0 specification
 * using the e2e testing framework. It shows:
 *
 * 1. Creating a badge and assertion in OB3 format
 * 2. Validating the structure against OB3 requirements
 * 3. Verifying the cryptographic proof
 * 4. Testing against the official schema
 */

import { beforeAll, afterAll, describe, it, expect } from "bun:test";
import {
  createTestServer,
  cleanupTestResources,
  registerAndLoginUser,
  authenticatedRequest,
} from "../helpers/test-utils";
import { OB3_CREDENTIAL_SCHEMA_URL } from "@/constants/context-urls";
import { Hono } from "hono";

// Schema validation function (simplified example)
async function validateAgainstSchema(
  credential: any,
): Promise<{ valid: boolean; errors?: any[] }> {
  // In a real implementation, this would fetch the schema and validate the credential
  // For demonstration, this is a simplified placeholder
  if (
    !credential["@context"] ||
    !credential.type ||
    !credential.credentialSubject
  ) {
    return {
      valid: false,
      errors: [{ message: "Missing required fields" }],
    };
  }
  return { valid: true };
}

describe("Open Badges 3.0 Credential Validation", () => {
  // Create test app
  const testApp = new Hono();
  let server: any;
  let request: any;
  let user: { token: string; userId: string };
  let badgeId: string;
  let credentialId: string;

  // Required context URLs for OB3
  const REQUIRED_CONTEXTS = [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/vc/status-list/2021/v1",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
  ];

  // Required credential types
  const REQUIRED_TYPES = ["VerifiableCredential", "OpenBadgeCredential"];

  beforeAll(async () => {
    // Set up testing server
    ({ server, request } = createTestServer(testApp));

    // Register and login a test user
    user = await registerAndLoginUser(request);

    // Create a test badge
    const badgeData = {
      name: "OB3 Test Badge",
      description: "A badge for testing OB3 compliance",
      criteria: { narrative: "Complete the test suite" },
      image: "https://example.com/badges/test.png",
    };

    const badgeResponse = await authenticatedRequest(
      request,
      "post",
      "/api/badges",
      user.token,
      badgeData,
    );

    badgeId = badgeResponse.body.id;

    // Issue a credential in OB3 format
    const assertionData = {
      badgeId: badgeId,
      recipient: {
        identity: "test@example.com",
        type: "email",
      },
      format: "ob3", // Request OB3 format
    };

    const assertionResponse = await authenticatedRequest(
      request,
      "post",
      "/api/assertions",
      user.token,
      assertionData,
    );

    credentialId = assertionResponse.body.id;
  });

  afterAll(async () => {
    await cleanupTestResources(server);
  });

  describe("Structural Tests", () => {
    it("should include all required context URLs", async () => {
      const response = await request.get(
        `/api/assertions/${credentialId}?format=ob3`,
      );
      expect(response.status).toBe(200);

      // Check that all required contexts are present
      REQUIRED_CONTEXTS.forEach((contextUrl) => {
        expect(response.body["@context"]).toContain(contextUrl);
      });
    });

    it("should include the required credential types", async () => {
      const response = await request.get(
        `/api/assertions/${credentialId}?format=ob3`,
      );

      // Check that all required types are present
      REQUIRED_TYPES.forEach((type) => {
        expect(response.body.type).toContain(type);
      });
    });

    it("should include the proper credential schema reference", async () => {
      const response = await request.get(
        `/api/assertions/${credentialId}?format=ob3`,
      );

      expect(response.body.credentialSchema).toBeDefined();
      expect(response.body.credentialSchema.id).toBe(OB3_CREDENTIAL_SCHEMA_URL);
      expect(response.body.credentialSchema.type).toBe(
        "JsonSchemaValidator2018",
      );
    });

    it("should include all required credential components", async () => {
      const response = await request.get(
        `/api/assertions/${credentialId}?format=ob3`,
      );

      // Check basic structure
      expect(response.body.issuer).toBeDefined();
      expect(response.body.issuanceDate).toBeDefined();
      expect(response.body.credentialSubject).toBeDefined();
      expect(response.body.credentialSubject.achievement).toBeDefined();

      // Check achievement structure
      const achievement = response.body.credentialSubject.achievement;
      expect(achievement.type).toContain("Achievement");
      expect(achievement.name).toBeDefined();
      expect(achievement.criteria).toBeDefined();
    });
  });

  describe("Cryptographic Proof Tests", () => {
    it("should include a valid cryptographic proof", async () => {
      const response = await request.get(
        `/api/assertions/${credentialId}?format=ob3`,
      );

      // Check proof exists and has required properties
      expect(response.body.proof).toBeDefined();
      expect(response.body.proof.type).toBe("DataIntegrityProof");
      expect(response.body.proof.cryptosuite).toBe("eddsa-rdfc-2022");
      expect(response.body.proof.created).toBeDefined();
      expect(response.body.proof.verificationMethod).toBeDefined();
      expect(response.body.proof.proofValue).toBeDefined();
    });

    it("should verify the credential signature", async () => {
      // Get the credential
      const getResponse = await request.get(
        `/api/assertions/${credentialId}?format=ob3`,
      );

      // Verify the credential
      const verifyResponse = await request.post("/api/verify").send({
        credential: getResponse.body,
      });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.verified).toBe(true);
      expect(verifyResponse.body.verification.results.signature).toBe("valid");
    });

    it("should detect tampered credentials", async () => {
      // Get the credential
      const getResponse = await request.get(
        `/api/assertions/${credentialId}?format=ob3`,
      );

      // Tamper with the credential
      const tamperedCredential = { ...getResponse.body };
      tamperedCredential.credentialSubject.achievement.name = "Tampered Name";

      // Verify the tampered credential
      const verifyResponse = await request.post("/api/verify").send({
        credential: tamperedCredential,
      });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.verified).toBe(false);
    });
  });

  describe("Schema Validation Tests", () => {
    it("should validate against the official OB3 schema", async () => {
      // Get the credential
      const getResponse = await request.get(
        `/api/assertions/${credentialId}?format=ob3`,
      );

      // Validate against schema
      const validationResult = await validateAgainstSchema(getResponse.body);
      expect(validationResult.valid).toBe(true);
    });
  });

  describe("Status and Revocation Tests", () => {
    it("should include credential status information", async () => {
      const response = await request.get(
        `/api/assertions/${credentialId}?format=ob3`,
      );

      expect(response.body.credentialStatus).toBeDefined();
      expect(response.body.credentialStatus.type).toBe("StatusList2021Entry");
      expect(response.body.credentialStatus.statusListIndex).toBeDefined();
      expect(response.body.credentialStatus.statusListCredential).toBeDefined();
    });

    it("should properly handle credential revocation", async () => {
      // Revoke the credential
      await authenticatedRequest(
        request,
        "post",
        `/api/assertions/${credentialId}/revoke`,
        user.token,
        { reason: "Testing revocation" },
      );

      // Verify the revoked credential
      const verifyResponse = await request.post(`/api/verify`).send({
        credentialId: credentialId,
      });

      expect(verifyResponse.body.verified).toBe(false);
      expect(verifyResponse.body.verification.status).toBe("revoked");
    });
  });
});
