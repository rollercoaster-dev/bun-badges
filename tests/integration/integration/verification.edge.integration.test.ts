import { describe, expect, test, beforeAll } from "bun:test";
import { db } from "@/db/config";
import { issuerProfiles, badgeClasses } from "@/db/schema";
import { VerificationController } from "@/controllers/verification.controller";
import crypto from "crypto";
import {
  createMockContext,
  TestData,
  updateOB2AssertionJson,
  updateOB3CredentialJson,
} from "../../helpers/test-utils";

interface ApiResponse<T> {
  status: string;
  data: T;
  error?: {
    code: string;
    message: string;
  };
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

describe("VerificationController Edge Cases", () => {
  let controller: VerificationController;
  let testData: TestData;

  beforeAll(async () => {
    controller = new VerificationController();
    testData = new TestData();

    // Create test data
    const issuerId = crypto.randomUUID();
    const badgeId = crypto.randomUUID();

    // Create test issuer
    await db.insert(issuerProfiles).values({
      issuerId,
      name: "Test Issuer",
      url: "https://example.com",
      email: "test@example.com",
      ownerUserId: "test-user",
      issuerJson: {
        "@context": "https://w3id.org/openbadges/v2",
        type: "Issuer",
        id: `https://example.com/issuers/${issuerId}`,
        name: "Test Issuer",
        url: "https://example.com",
        email: "test@example.com",
      },
    });

    // Create test badge
    await db.insert(badgeClasses).values({
      badgeId,
      issuerId,
      name: "Test Badge",
      description: "Test badge description",
      imageUrl: "https://example.com/badge.png",
      criteria: JSON.stringify({ narrative: "Test criteria" }),
      badgeJson: {
        "@context": "https://w3id.org/openbadges/v2",
        type: "BadgeClass",
        id: `https://example.com/badges/${badgeId}`,
        name: "Test Badge",
        description: "Test badge description",
        image: "https://example.com/badge.png",
        criteria: { narrative: "Test criteria" },
        issuer: `https://example.com/issuers/${issuerId}`,
      },
    });

    testData.set("issuerId", issuerId);
    testData.set("badgeId", badgeId);
  });

  test("should handle missing context in OB2 assertion", async () => {
    const assertionId = crypto.randomUUID();
    const invalidAssertion = updateOB2AssertionJson(assertionId, {
      "@context": undefined,
    });

    const ctx = createMockContext({
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invalidAssertion),
    });

    const result = await controller.verifyAssertion(ctx);
    const data = (await result.json()) as ApiResponse<VerificationResponse>;
    expect(data.status).toBe("success");
    expect(data.data.valid).toBe(false);
    expect(data.data.checks.structure).toBe(false);
  });

  test("should handle missing type in OB2 assertion", async () => {
    const assertionId = crypto.randomUUID();
    const invalidAssertion = updateOB2AssertionJson(assertionId, {
      type: undefined,
    });

    const ctx = createMockContext({
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invalidAssertion),
    });

    const result = await controller.verifyAssertion(ctx);
    const data = (await result.json()) as ApiResponse<VerificationResponse>;
    expect(data.status).toBe("success");
    expect(data.data.valid).toBe(false);
    expect(data.data.checks.structure).toBe(false);
  });

  test("should handle missing recipient in OB2 assertion", async () => {
    const assertionId = crypto.randomUUID();
    const invalidAssertion = updateOB2AssertionJson(assertionId, {
      recipient: undefined,
    });

    const ctx = createMockContext({
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invalidAssertion),
    });

    const result = await controller.verifyAssertion(ctx);
    const data = (await result.json()) as ApiResponse<VerificationResponse>;
    expect(data.status).toBe("success");
    expect(data.data.valid).toBe(false);
    expect(data.data.checks.structure).toBe(false);
  });

  test("should handle missing badge in OB2 assertion", async () => {
    const assertionId = crypto.randomUUID();
    const invalidAssertion = updateOB2AssertionJson(assertionId, {
      badge: undefined,
    });

    const ctx = createMockContext({
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invalidAssertion),
    });

    const result = await controller.verifyAssertion(ctx);
    const data = (await result.json()) as ApiResponse<VerificationResponse>;
    expect(data.status).toBe("success");
    expect(data.data.valid).toBe(false);
    expect(data.data.checks.structure).toBe(false);
  });

  test("should handle missing context in OB3 credential", async () => {
    const assertionId = crypto.randomUUID();
    const invalidCredential = updateOB3CredentialJson(assertionId, {
      "@context": undefined,
    });

    const ctx = createMockContext({
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invalidCredential),
    });

    const result = await controller.verifyAssertion(ctx);
    const data = (await result.json()) as ApiResponse<VerificationResponse>;
    expect(data.status).toBe("success");
    expect(data.data.valid).toBe(false);
    expect(data.data.checks.structure).toBe(false);
  });

  test("should handle missing type in OB3 credential", async () => {
    const assertionId = crypto.randomUUID();
    const invalidCredential = updateOB3CredentialJson(assertionId, {
      type: undefined,
    });

    const ctx = createMockContext({
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invalidCredential),
    });

    const result = await controller.verifyAssertion(ctx);
    const data = (await result.json()) as ApiResponse<VerificationResponse>;
    expect(data.status).toBe("success");
    expect(data.data.valid).toBe(false);
    expect(data.data.checks.structure).toBe(false);
  });

  test("should handle missing credentialSubject in OB3 credential", async () => {
    const assertionId = crypto.randomUUID();
    const invalidCredential = updateOB3CredentialJson(assertionId, {
      credentialSubject: undefined,
    });

    const ctx = createMockContext({
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invalidCredential),
    });

    const result = await controller.verifyAssertion(ctx);
    const data = (await result.json()) as ApiResponse<VerificationResponse>;
    expect(data.status).toBe("success");
    expect(data.data.valid).toBe(false);
    expect(data.data.checks.structure).toBe(false);
  });

  test("should handle missing issuer in OB3 credential", async () => {
    const assertionId = crypto.randomUUID();
    const invalidCredential = updateOB3CredentialJson(assertionId, {
      issuer: undefined,
    });

    const ctx = createMockContext({
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invalidCredential),
    });

    const result = await controller.verifyAssertion(ctx);
    const data = (await result.json()) as ApiResponse<VerificationResponse>;
    expect(data.status).toBe("success");
    expect(data.data.valid).toBe(false);
    expect(data.data.checks.structure).toBe(false);
  });
});
