import { describe, expect, test, beforeAll } from "bun:test";
import { db } from "@/db/config";
import { issuerProfiles, badgeClasses } from "@/db/schema";
import { VerificationController } from "@/controllers/verification.controller";
import crypto from "crypto";
import {
  createMockContext,
  TestData,
  getOB2AssertionJson,
  getOB3CredentialJson,
  updateOB2AssertionJson,
  updateOB3CredentialJson,
} from "../../helpers/test-utils";
import { OB2BadgeAssertion } from "@/services/verification.service";
import { OpenBadgeCredential } from "@/models/credential.model";

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

describe("VerificationController Integration Tests", () => {
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

  test("should verify an OB2 assertion", async () => {
    const assertionId = crypto.randomUUID();
    const assertionJson = getOB2AssertionJson(assertionId);

    const ctx = createMockContext({
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(assertionJson),
    });

    const result = await controller.verifyAssertion(ctx);
    const data = (await result.json()) as ApiResponse<VerificationResponse>;
    expect(data.status).toBe("success");
    expect(data.data.valid).toBe(true);
    expect(data.data.checks.signature).toBe(true);
    expect(data.data.checks.revocation).toBe(true);
    expect(data.data.checks.structure).toBe(true);
  });

  test("should verify an OB3 credential", async () => {
    const assertionId = crypto.randomUUID();
    const credentialJson = getOB3CredentialJson(assertionId);

    const ctx = createMockContext({
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentialJson),
    });

    const result = await controller.verifyAssertion(ctx);
    const data = (await result.json()) as ApiResponse<VerificationResponse>;
    expect(data.status).toBe("success");
    expect(data.data.valid).toBe(true);
    expect(data.data.checks.signature).toBe(true);
    expect(data.data.checks.revocation).toBe(true);
    expect(data.data.checks.structure).toBe(true);
  });

  test("should detect invalid OB2 assertion", async () => {
    const assertionId = crypto.randomUUID();
    const invalidAssertion = updateOB2AssertionJson(assertionId, {
      type: "InvalidType",
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

  test("should detect invalid OB3 credential", async () => {
    const assertionId = crypto.randomUUID();
    const invalidCredential = updateOB3CredentialJson(assertionId, {
      type: ["InvalidType"],
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
