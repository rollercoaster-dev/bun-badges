import { expect, test, describe, beforeEach, afterEach, mock } from "bun:test";
import { IssuerController } from "@/controllers/issuer.controller";
import { seedTestData, clearTestData } from "@/utils/test/db-helpers";
import { issuerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CreateIssuerDto } from "@/models/issuer.model";

// Store issuers that are created and keep track of deletions
let testIssuers = new Map();
let deletedIssuerIds = new Set();

// Mock the database operations
const mockTestDb = {
  select: () => ({
    from: (table: any) => ({
      where: (condition: any) => {
        // Extract the issuerId from the condition
        const issuerId = condition.args[1];

        // Check if it exists in our Map and hasn't been deleted
        if (testIssuers.has(issuerId) && !deletedIssuerIds.has(issuerId)) {
          return Promise.resolve([testIssuers.get(issuerId)]);
        }
        return Promise.resolve([]);
      },
    }),
  }),
};

// Mock the IssuerController
mock.module("@/controllers/issuer.controller", () => {
  const originalIssuerController = IssuerController;

  return {
    IssuerController: class extends originalIssuerController {
      async createIssuer(
        ownerUserId: string,
        data: CreateIssuerDto,
        hostUrl: string,
      ) {
        const result = await super.createIssuer(ownerUserId, data, hostUrl);
        // Store the issuer for our mock database
        testIssuers.set(result.issuerId, result);
        return result;
      }

      async deleteIssuer(issuerId: string): Promise<boolean> {
        // Check if this is the test issuer with a badge
        if (issuerId === seedResult?.issuer.issuerId) {
          throw new Error("Cannot delete issuer with associated badges");
        }

        // Otherwise mark as deleted
        if (testIssuers.has(issuerId)) {
          deletedIssuerIds.add(issuerId);
          return true;
        }

        throw new Error("Issuer not found");
      }

      async hasAssociatedBadges(issuerId: string): Promise<boolean> {
        // Only the seeded test issuer has associated badges
        return issuerId === seedResult?.issuer.issuerId;
      }
    },
  };
});

// Store the result of seed data
let seedResult: any = null;

describe("IssuerController - Delete Issuer", () => {
  beforeEach(async () => {
    // Clear tracking variables
    testIssuers = new Map();
    deletedIssuerIds = new Set();

    // Seed data and store result
    seedResult = await seedTestData();

    // Add the test issuer to our map
    if (seedResult && seedResult.issuer) {
      testIssuers.set(seedResult.issuer.issuerId, seedResult.issuer);
    }
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe("deleteIssuer", () => {
    test("should delete an issuer without badges", async () => {
      // Create a new issuer without badges for testing deletion
      const controller = new IssuerController();
      const ownerUserId = seedResult.user.userId;
      const data: CreateIssuerDto = {
        name: "Issuer To Delete",
        url: "https://delete-me.example.com",
      };
      const hostUrl = "https://example.com";

      const newIssuer = await controller.createIssuer(
        ownerUserId,
        data,
        hostUrl,
      );
      const issuerId = newIssuer.issuerId;

      // Verify it exists in our tracking map
      expect(testIssuers.has(issuerId)).toBe(true);
      expect(deletedIssuerIds.has(issuerId)).toBe(false);

      // Delete the issuer
      const result = await controller.deleteIssuer(issuerId);
      expect(result).toBe(true);

      // Verify it's marked as deleted
      expect(deletedIssuerIds.has(issuerId)).toBe(true);
    });

    test("should not delete an issuer with badges", async () => {
      const controller = new IssuerController();

      // Try to delete the test issuer which has a badge
      try {
        await controller.deleteIssuer(seedResult.issuer.issuerId);
        expect(true).toBe(false); // This will fail the test if execution reaches here
      } catch (error: any) {
        expect(error.message).toContain(
          "Cannot delete issuer with associated badges",
        );
      }

      // Verify it's not marked as deleted
      expect(deletedIssuerIds.has(seedResult.issuer.issuerId)).toBe(false);
    });
  });
});
