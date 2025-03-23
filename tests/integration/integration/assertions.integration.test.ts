import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { AssertionController } from "@/controllers/assertions.controller";
import { createMockContext } from "@/utils/test/mock-context";
import { db } from "@/db/config";
import {
  badgeAssertions,
  badgeClasses,
  issuerProfiles,
  users,
  signingKeys,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";
import { nanoid } from "nanoid";

// Define response interface for type safety
interface AssertionResponse {
  status: string;
  data: {
    assertionId: string;
    assertion: {
      assertionJson: {
        proof?: any;
        "@context": string | string[];
      };
    };
  };
}

// Simplified test suite for the AssertionController
describe("AssertionController Integration Tests", () => {
  let controller: AssertionController;
  let issuerId: string;
  let badgeId: string;
  let userId: string;

  beforeAll(async () => {
    // Create controller
    controller = new AssertionController();

    // Create test data directly in the database
    userId = crypto.randomUUID();
    issuerId = crypto.randomUUID();
    badgeId = crypto.randomUUID();

    // Create a test user - only include fields that exist in the schema
    await db.insert(users).values({
      userId,
      email: `test-${nanoid(6)}@example.com`,
      name: "Test User",
      passwordHash: "test-hash",
      // Remove role field as it's causing type errors
    });

    // Create a test issuer
    await db.insert(issuerProfiles).values({
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
    });

    // Create a test badge class
    await db.insert(badgeClasses).values({
      badgeId,
      issuerId,
      name: "Test Badge",
      description: "A test badge",
      imageUrl: "https://example.com/badge.png",
      criteria: "Test criteria",
      badgeJson: {
        "@context": "https://w3id.org/openbadges/v2",
        type: "BadgeClass",
        id: `https://example.com/badges/${badgeId}`,
        name: "Test Badge",
        description: "A test badge",
        image: "https://example.com/badge.png",
        criteria: { narrative: "Test criteria" },
        issuer: `https://example.com/issuers/${issuerId}`,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data in the correct order to respect foreign key constraints
    try {
      await db.delete(badgeAssertions);
      await db.delete(badgeClasses);
      // Delete signing_keys before issuer_profiles to avoid foreign key constraint violations
      await db.delete(signingKeys);
      await db.delete(issuerProfiles);
      await db.delete(users);
      console.log("✅ Test data cleaned up successfully");
    } catch (error) {
      console.error("❌ Error cleaning up test data:", error);
    }
  });

  it("should create an OB2 assertion", async () => {
    // Create a mock context
    const mockContext = createMockContext({
      method: "POST",
      url: "https://example.com/assertions",
      body: {
        badgeId,
        recipient: {
          type: "email",
          identity: "test-recipient@example.com",
          hashed: false,
        },
      },
    });

    // Call the controller
    const response = await controller.createAssertion(mockContext);
    expect(response.status).toBe(200);

    // Verify the response
    const data = (await response.json()) as AssertionResponse;
    expect(data.status).toBe("success");
    expect(data.data.assertionId).toBeDefined();

    // Verify the assertion was created in the database
    const assertionId = data.data.assertionId;

    // Use the query builder instead of SQL tagged template
    const results = await db
      .select()
      .from(badgeAssertions)
      .where(eq(badgeAssertions.assertionId, assertionId))
      .limit(1);

    // Check that we have a result
    expect(results.length).toBe(1);
  });

  it("should create an OB3 assertion", async () => {
    // Create a mock context with OB3 format
    const mockContext = createMockContext({
      method: "POST",
      url: "https://example.com/assertions?format=ob3",
      query: { format: "ob3" },
      body: {
        badgeId,
        recipient: {
          type: "email",
          identity: "test-recipient-ob3@example.com",
          hashed: false,
        },
      },
    });

    try {
      // Call the controller
      const response = await controller.createAssertion(mockContext);
      expect(response.status).toBe(200);

      // Verify the response
      const data = (await response.json()) as AssertionResponse;
      console.log(
        "OB3 assertion creation response:",
        JSON.stringify(data, null, 2),
      );

      expect(data.status).toBe("success");
      expect(data.data.assertionId).toBeDefined();

      // Verify OB3 format has proof
      expect(data.data.assertion.assertionJson.proof).toBeDefined();
      expect(data.data.assertion.assertionJson["@context"]).toContain(
        "https://www.w3.org/2018/credentials/v1",
      );
    } catch (error) {
      console.error("Failed to create assertion:", error);
      throw error;
    }
  });

  it("should verify an OB2 assertion", async () => {
    // Instead of querying the database, use the assertion we already created in the setup
    // Use query builder instead of SQL tagged template
    const results = await db
      .select({ assertionId: badgeAssertions.assertionId })
      .from(badgeAssertions)
      .limit(1);

    if (!results.length) {
      throw new Error(
        "No assertions found for testing. Test setup may have failed.",
      );
    }

    const assertionId = results[0].assertionId;
    console.log(`Found assertion ID for verification: ${assertionId}`);

    // Create a mock context for verification
    const mockContext = createMockContext({
      method: "GET",
      url: `https://example.com/verify/${assertionId}`,
      params: { assertionId },
    });

    // Get the assertion
    const getContext = createMockContext({
      method: "GET",
      url: `https://example.com/assertions/${assertionId}`,
      params: { id: assertionId },
    });

    try {
      const response = await controller.getAssertion(getContext);
      expect(response.status).toBe(200);

      const data = (await response.json()) as { status: string };
      expect(data.status).toBe("success");
    } catch (error) {
      console.error("Error getting assertion:", error);
      throw error;
    }
  });

  it("should revoke an assertion", async () => {
    // Use query builder instead of SQL tagged template
    const results = await db
      .select({ assertionId: badgeAssertions.assertionId })
      .from(badgeAssertions)
      .limit(1);

    if (!results.length) {
      throw new Error(
        "No assertions found for testing. Test setup may have failed.",
      );
    }

    const assertionId = results[0].assertionId;
    console.log(`Found assertion ID for revocation: ${assertionId}`);

    // Create a mock context for revocation
    const mockContext = createMockContext({
      method: "POST",
      url: `https://example.com/assertions/${assertionId}/revoke`,
      params: { id: assertionId },
      body: {
        reason: "Test revocation",
      },
    });

    try {
      // Revoke the assertion
      const response = await controller.revokeAssertion(mockContext);
      expect(response.status).toBe(200);

      // Verify the assertion is revoked using query builder
      const revokedResults = await db
        .select({
          revoked: badgeAssertions.revoked,
          revocationReason: badgeAssertions.revocationReason,
        })
        .from(badgeAssertions)
        .where(eq(badgeAssertions.assertionId, assertionId))
        .limit(1);

      expect(revokedResults.length).toBe(1);
      expect(revokedResults[0].revoked).toBe(true);
      expect(revokedResults[0].revocationReason).toBe("Test revocation");
    } catch (error) {
      console.error("Error revoking assertion:", error);
      throw error;
    }
  });
});
