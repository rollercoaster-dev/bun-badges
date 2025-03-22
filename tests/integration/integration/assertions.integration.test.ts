import { describe, expect, test, beforeAll } from "bun:test";
import { db } from "@/db/config";
import { issuerProfiles, badgeClasses } from "@/db/schema";
import { AssertionController } from "@/controllers/assertions.controller";
import crypto from "crypto";
import { createMockContext, TestData } from "../../helpers/test-utils";

interface ApiResponse<T> {
  status: string;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

interface AssertionResponse {
  assertion: {
    assertionJson: {
      "@context": string | string[];
      type: string | string[];
      id: string;
      proof?: unknown;
      credentialStatus?: {
        type: string;
        id: string;
      };
    };
  };
  assertionId: string;
}

describe("AssertionController Integration Tests", () => {
  let controller: AssertionController;
  let testData: TestData;

  beforeAll(async () => {
    controller = new AssertionController();
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

  test("should create an OB2 assertion", async () => {
    const ctx = createMockContext({
      body: {
        badgeId: testData.get("badgeId"),
        recipient: {
          type: "email",
          identity: "test@example.com",
        },
      },
    });

    const result = await controller.createAssertion(ctx);
    const data = (await result.json()) as ApiResponse<AssertionResponse>;
    expect(data.status).toBe("success");

    const assertionData = data.data.assertion.assertionJson;
    expect(assertionData["@context"]).toBe("https://w3id.org/openbadges/v2");
    expect(assertionData.id).toContain(data.data.assertionId);
    expect(assertionData.type).toBe("Assertion");
  });

  test("should create an OB3 assertion", async () => {
    const ctx = createMockContext({
      query: { format: "ob3" },
      body: {
        badgeId: testData.get("badgeId"),
        recipient: {
          type: "email",
          identity: "test@example.com",
        },
      },
    });

    const result = await controller.createAssertion(ctx);
    const data = (await result.json()) as ApiResponse<AssertionResponse>;
    expect(data.status).toBe("success");

    const assertionData = data.data.assertion.assertionJson;
    expect(Array.isArray(assertionData["@context"])).toBe(true);
    expect(assertionData["@context"]).toContain(
      "https://www.w3.org/2018/credentials/v1",
    );
    expect(assertionData.type).toContain("OpenBadgeCredential");
    expect(assertionData.proof).toBeDefined();
  });

  test("should verify an OB2 assertion", async () => {
    const ctx = createMockContext({
      body: {
        badgeId: testData.get("badgeId"),
        recipient: {
          type: "email",
          identity: "test@example.com",
        },
      },
    });

    const result = await controller.createAssertion(ctx);
    const data = (await result.json()) as ApiResponse<AssertionResponse>;
    const assertionId = data.data.assertionId;

    const verifyCtx = createMockContext({
      params: { id: assertionId },
    });

    const verifyResult = await controller.getAssertion(verifyCtx);
    const verificationData =
      (await verifyResult.json()) as ApiResponse<AssertionResponse>;
    expect(verificationData.status).toBe("success");
  });

  test("should revoke an assertion", async () => {
    const ctx = createMockContext({
      body: {
        badgeId: testData.get("badgeId"),
        recipient: {
          type: "email",
          identity: "test@example.com",
        },
      },
    });

    const result = await controller.createAssertion(ctx);
    const data = (await result.json()) as ApiResponse<AssertionResponse>;
    const assertionId = data.data.assertionId;

    const revokeCtx = createMockContext({
      params: { id: assertionId },
      body: {
        reason: "Test revocation",
      },
    });

    const revokeResult = await controller.revokeAssertion(revokeCtx);
    const revokeData = (await revokeResult.json()) as ApiResponse<{
      success: boolean;
    }>;
    expect(revokeData.status).toBe("success");
  });

  test("should handle credential status list", async () => {
    const ctx = createMockContext({
      query: { format: "ob3" },
      body: {
        badgeId: testData.get("badgeId"),
        recipient: {
          type: "email",
          identity: "test@example.com",
        },
      },
    });

    const result = await controller.createAssertion(ctx);
    const data = (await result.json()) as ApiResponse<AssertionResponse>;
    const assertionData = data.data.assertion.assertionJson;

    expect(assertionData.credentialStatus).toBeDefined();
    expect(assertionData.credentialStatus?.type).toBe("StatusList2021Entry");
  });
});
