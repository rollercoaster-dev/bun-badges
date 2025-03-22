import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { AssertionController } from "@/controllers/assertion.controller";
import { VerificationController } from "@/controllers/verification.controller";
import {
  seedTestData,
  clearTestData,
  createMockContext,
} from "@/utils/test/db-helpers";

describe("AssertionController - API Integration", () => {
  let testData: any;
  let assertionId: string;

  beforeEach(async () => {
    testData = await seedTestData();
    assertionId = testData.assertion.assertionId;
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe("getAssertion", () => {
    test("should return an assertion by ID", async () => {
      const controller = new AssertionController();
      const mockContext = createMockContext({
        params: {
          id: assertionId,
        },
      });

      const response = await controller.getAssertion(mockContext);
      expect(response.status).toBe(200);

      const assertionData = await response.json();
      expect(assertionData["@context"]).toBe("https://w3id.org/openbadges/v2");
      expect(assertionData.id).toContain(assertionId);
      expect(assertionData.type).toBe("Assertion");
    });

    test("should return an assertion in OB3 format", async () => {
      const controller = new AssertionController();
      const mockContext = createMockContext({
        params: {
          id: assertionId,
        },
        query: {
          format: "ob3",
        },
      });

      const response = await controller.getAssertion(mockContext);
      expect(response.status).toBe(200);

      const assertionData = await response.json();
      expect(Array.isArray(assertionData["@context"])).toBe(true);
      expect(assertionData["@context"]).toContain(
        "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
      );
      expect(assertionData.type).toContain("OpenBadgeCredential");
      expect(assertionData.proof).toBeDefined();
    });

    test("should throw error for non-existent assertion", async () => {
      const controller = new AssertionController();
      const mockContext = createMockContext({
        params: {
          id: "non-existent-assertion-id",
        },
      });

      try {
        await controller.getAssertion(mockContext);
        expect(true).toBe(false); // This will fail the test if execution reaches here
      } catch (error: any) {
        expect(error.message).toContain("Failed to get assertion");
      }
    });
  });

  describe("verifyAssertion", () => {
    test("should verify an assertion", async () => {
      const controller = new VerificationController();
      const mockContext = createMockContext({
        params: {
          assertionId: assertionId,
        },
      });

      const response = await controller.verifyAssertion(mockContext);
      expect(response.status).toBe(200);

      const verificationResult = await response.json();
      expect(verificationResult.valid).toBe(true);
    });
  });

  describe("revokeAssertion", () => {
    test("should revoke an assertion", async () => {
      const controller = new AssertionController();
      const mockContext = createMockContext({
        params: {
          id: assertionId,
        },
        body: {
          reason: "Testing revocation",
        },
      });

      const response = await controller.revokeAssertion(mockContext);
      expect(response.status).toBe(200);

      // Now verify it's revoked by checking verification
      const verificationController = new VerificationController();
      const verifyContext = createMockContext({
        params: {
          assertionId: assertionId,
        },
      });

      const verifyResponse =
        await verificationController.verifyAssertion(verifyContext);
      const verificationResult = await verifyResponse.json();
      expect(verificationResult.valid).toBe(false);
      expect(verificationResult.revoked).toBe(true);
    });

    test("should include status info in OB3 credential after revocation", async () => {
      // First revoke the assertion
      const assertionController = new AssertionController();
      const revokeContext = createMockContext({
        params: {
          id: assertionId,
        },
        body: {
          reason: "Testing revocation",
        },
      });

      await assertionController.revokeAssertion(revokeContext);

      // Then get the OB3 credential and check status
      const getContext = createMockContext({
        params: {
          id: assertionId,
        },
        query: {
          format: "ob3",
        },
      });

      const response = await assertionController.getAssertion(getContext);
      expect(response.status).toBe(200);

      const assertionData = await response.json();
      expect(assertionData.credentialStatus).toBeDefined();
      expect(assertionData.credentialStatus.type).toBe(
        "RevocationList2020Status",
      );
      expect(assertionData.credentialStatus.status).toBe("revoked");
    });
  });
});
