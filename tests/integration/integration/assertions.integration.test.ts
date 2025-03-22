import {
  describe,
  expect,
  test,
  beforeAll,
  afterAll,
  afterEach,
  mock,
} from "bun:test";
import { db } from "@/db/config";
import {
  issuerProfiles,
  badgeClasses,
  users,
  badgeAssertions,
} from "@/db/schema";
import { AssertionController } from "@/controllers/assertions.controller";
import crypto from "crypto";
import { createMockContext } from "@/utils/test/mock-context";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { seedTestData, clearTestData } from "@/utils/test/db-helpers";
import {
  mockCryptoForTests,
  setupAssertionTestUtils,
} from "@/utils/test/assertion-test-utils";

// Mock cryptographic operations for deterministic tests
mockCryptoForTests();

// Create a Map to store test data
const testData = new Map<string, string>();

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
      };
    };
  };
  assertionId?: string;
}

describe("AssertionController Integration Tests", () => {
  let controller: AssertionController;

  beforeAll(async () => {
    try {
      console.log("Setting up test environment with real database...");

      // Create controller - no mocking needed for integration tests
      controller = new AssertionController();

      // Clean up any existing test data
      await clearTestData();

      // Create test data
      const uniqueEmail = `test-${nanoid(8)}@example.com`;
      const userId = crypto.randomUUID();
      const issuerId = crypto.randomUUID();
      const badgeId = crypto.randomUUID();

      // Create test user
      await db
        .insert(users)
        .values({
          userId,
          email: uniqueEmail,
          name: "Test User",
          passwordHash: "test-password-hash", // Hash is not used in tests
          role: "admin",
        })
        .execute();

      // Create test issuer
      await db
        .insert(issuerProfiles)
        .values({
          issuerId,
          name: "Test Issuer",
          url: "https://example.com",
          email: "test@example.com",
          ownerUserId: userId,
          issuerJson: {
            "@context": "https://w3id.org/openbadges/v2",
            type: "Issuer",
            id: `https://example.com/issuers/${issuerId}`,
            name: "Test Issuer",
            url: "https://example.com",
            email: "test@example.com",
          },
        })
        .execute();

      // Create test badge
      await db
        .insert(badgeClasses)
        .values({
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
        })
        .execute();

      // Store the IDs for later use
      testData.set("userId", userId);
      testData.set("issuerId", issuerId);
      testData.set("badgeId", badgeId);

      console.log("Test environment set up with real database data");
      console.log(`Test issuerId: ${issuerId}, badgeId: ${badgeId}`);
    } catch (error) {
      console.error("Error setting up test environment:", error);
      throw error;
    }
  });

  test("should create an OB2 assertion", async () => {
    const ctx = createMockContext({
      method: "POST",
      query: { format: "ob2" },
      body: {
        badgeId: testData.get("badgeId"),
        recipient: {
          type: "email",
          identity: `test-recipient-${nanoid(6)}@example.com`,
          hashed: false,
        },
      },
    });

    const result = await controller.createAssertion(ctx);
    const data = (await result.json()) as ApiResponse<AssertionResponse>;

    expect(data.status).toBe("success");

    if (data.status === "success" && data.data.assertionId) {
      testData.set("ob2AssertionId", data.data.assertionId);
      console.log(`Created OB2 assertion: ${data.data.assertionId}`);

      // Verify the assertion was actually created in the database
      const dbAssertion = await db
        .select()
        .from(badgeAssertions)
        .where(eq(badgeAssertions.assertionId, data.data.assertionId))
        .limit(1);

      expect(dbAssertion.length).toBe(1);
      expect(dbAssertion[0].badgeId).toBe(testData.get("badgeId"));
    }
  });

  test("should create an OB3 assertion", async () => {
    const ctx = createMockContext({
      method: "POST",
      query: { format: "ob3" },
      body: {
        badgeId: testData.get("badgeId"),
        recipient: {
          type: "email",
          identity: `test-recipient-${nanoid(6)}@example.com`,
          hashed: false,
        },
      },
    });

    const result = await controller.createAssertion(ctx);
    const data = (await result.json()) as ApiResponse<AssertionResponse>;

    expect(data.status).toBe("success");

    if (data.status === "success" && data.data.assertionId) {
      testData.set("ob3AssertionId", data.data.assertionId);
      console.log(`Created OB3 assertion: ${data.data.assertionId}`);

      // Verify the assertion was actually created in the database
      const dbAssertion = await db
        .select()
        .from(badgeAssertions)
        .where(eq(badgeAssertions.assertionId, data.data.assertionId))
        .limit(1);

      expect(dbAssertion.length).toBe(1);

      // Check that it has the OB3 context
      const assertionJson = dbAssertion[0].assertionJson as any;
      expect(Array.isArray(assertionJson["@context"])).toBe(true);
      expect(
        assertionJson["@context"].includes(
          "https://www.w3.org/2018/credentials/v1",
        ),
      ).toBe(true);
    }
  });

  test("should verify an OB2 assertion", async () => {
    // Skip this test if we don't have an assertion ID from the previous test
    if (!testData.get("ob2AssertionId")) {
      console.log("Skipping test: no OB2 assertion ID available");
      return;
    }

    const assertionId = testData.get("ob2AssertionId")!;
    const ctx = createMockContext({
      method: "GET",
      params: { id: assertionId },
      url: `https://example.com/assertions/${assertionId}`,
    });

    const result = await controller.getAssertion(ctx);
    const data = (await result.json()) as ApiResponse<AssertionResponse>;

    expect(data.status).toBe("success");

    if (data.status === "success") {
      expect(data.data.assertion.assertionJson["@context"]).toBe(
        "https://w3id.org/openbadges/v2",
      );
    }
  });

  test("should revoke an assertion", async () => {
    // Skip this test if we don't have an assertion ID from the previous tests
    if (!testData.get("ob2AssertionId")) {
      console.log("Skipping test: no assertion ID available");
      return;
    }

    const assertionId = testData.get("ob2AssertionId")!;
    const ctx = createMockContext({
      method: "POST",
      params: { id: assertionId },
      url: `https://example.com/assertions/${assertionId}/revoke`,
      body: {
        reason: "Test revocation",
      },
    });

    const result = await controller.revokeAssertion(ctx);
    const data = (await result.json()) as ApiResponse<AssertionResponse>;

    expect(data.status).toBe("success");

    if (data.status === "success") {
      // Verify that the assertion was actually revoked in the database
      const revokedAssertion = await db
        .select()
        .from(badgeAssertions)
        .where(eq(badgeAssertions.assertionId, assertionId))
        .limit(1);

      expect(revokedAssertion.length).toBe(1);
      expect(revokedAssertion[0].revoked).toBe(true);
      expect(revokedAssertion[0].revocationReason).toBe("Test revocation");
    }
  });

  test("should handle credential status list", async () => {
    // Skip this test if we don't have an OB3 assertion ID from the previous test
    if (!testData.get("ob3AssertionId")) {
      console.log("Skipping test: no OB3 assertion ID available");
      return;
    }

    const assertionId = testData.get("ob3AssertionId")!;
    const ctx = createMockContext({
      method: "GET",
      params: { id: assertionId },
      query: { format: "ob3" },
      url: `https://example.com/assertions/${assertionId}`,
    });

    const result = await controller.getAssertion(ctx);
    const data = (await result.json()) as ApiResponse<AssertionResponse>;

    expect(data.status).toBe("success");

    if (data.status === "success") {
      const assertionData = data.data.assertion.assertionJson;
      expect(assertionData.credentialStatus).toBeDefined();
    }
  });

  // Clean up after each test to prevent test pollution
  afterEach(async () => {
    // We don't need to clean up after each test for these tests since they build on each other
    // But in other test suites, this would be a good place to reset state
  });

  // Add afterAll block for cleanup
  afterAll(async () => {
    try {
      // Clean up test data to leave the database in a clean state
      await clearTestData();
      console.log("Test data cleanup successful");
    } catch (error) {
      console.error("Error cleaning up test data:", error);
    }
  });
});
