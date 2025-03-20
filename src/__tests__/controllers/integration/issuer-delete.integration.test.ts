import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { IssuerController } from "@/controllers/issuer.controller";
import { seedTestData, clearTestData } from "@/utils/test/db-helpers";
import { testDb } from "@/utils/test/integration-setup";
import { issuerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CreateIssuerDto } from "@/models/issuer.model";

describe("IssuerController - Delete Issuer", () => {
  let testData: any;

  beforeEach(async () => {
    testData = await seedTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe("deleteIssuer", () => {
    test("should delete an issuer without badges", async () => {
      // Create a new issuer without badges for testing deletion
      const controller = new IssuerController();
      const ownerUserId = testData.user.userId;
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

      // Verify it exists first
      const beforeDelete = await testDb
        .select()
        .from(issuerProfiles)
        .where(eq(issuerProfiles.issuerId, issuerId));

      expect(beforeDelete.length).toBe(1);

      // Delete the issuer
      const result = await controller.deleteIssuer(issuerId);
      expect(result).toBe(true);

      // Verify it's gone
      const afterDelete = await testDb
        .select()
        .from(issuerProfiles)
        .where(eq(issuerProfiles.issuerId, issuerId));

      expect(afterDelete.length).toBe(0);
    });

    test("should not delete an issuer with badges", async () => {
      const controller = new IssuerController();

      // Try to delete the test issuer which has a badge
      try {
        await controller.deleteIssuer(testData.issuer.issuerId);
        expect(true).toBe(false); // This will fail the test if execution reaches here
      } catch (error: any) {
        expect(error.message).toContain(
          "Cannot delete issuer with associated badges",
        );
      }

      // Verify it still exists
      const issuers = await testDb
        .select()
        .from(issuerProfiles)
        .where(eq(issuerProfiles.issuerId, testData.issuer.issuerId));

      expect(issuers.length).toBe(1);
    });
  });
});
