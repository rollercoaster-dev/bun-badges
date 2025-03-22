import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { IssuerController } from "@/controllers/issuer.controller";
import {
  seedTestData,
  clearTestData,
  createMockContext,
} from "@/utils/test/db-helpers";
import { testDb } from "@/utils/test/integration-setup";
import { issuerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { UpdateIssuerDto } from "@/models/issuer.model";

describe("IssuerController - Update Issuer", () => {
  let testData: any;

  beforeEach(async () => {
    testData = await seedTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe("updateIssuer", () => {
    test("should update an existing issuer", async () => {
      const controller = new IssuerController();
      const mockContext = createMockContext({
        params: {
          id: testData.issuer.issuerId,
        },
      });

      const data: UpdateIssuerDto = {
        name: "Updated Issuer Name",
        url: "https://updated-issuer.example.com",
        description: "Updated description",
        email: "updated@example.com",
      };
      const hostUrl = "https://example.com";

      const response = await controller.updateIssuer(
        mockContext,
        data,
        hostUrl,
      );
      expect(response.status).toBe(200);

      const updatedIssuer = (await response.json()) as any;
      expect(updatedIssuer.issuerId).toBe(testData.issuer.issuerId);
      expect(updatedIssuer.name).toBe(data.name);
      expect(updatedIssuer.url).toBe(data.url);

      // Handle optional fields with type safety
      if (data.description) {
        expect(updatedIssuer.description).toBe(data.description);
      }
      if (data.email) {
        expect(updatedIssuer.email).toBe(data.email);
      }

      // Verify issuer is updated in the database
      const issuers = await testDb
        .select()
        .from(issuerProfiles)
        .where(eq(issuerProfiles.issuerId, testData.issuer.issuerId));

      expect(issuers.length).toBe(1);
      if (data.name) {
        expect(issuers[0].name).toBe(data.name);
      }
    });

    test("should throw error for non-existent issuer", async () => {
      const controller = new IssuerController();
      const mockContext = createMockContext({
        params: {
          id: "non-existent-issuer-id",
        },
      });

      const data: UpdateIssuerDto = {
        name: "Updated Issuer",
      };
      const hostUrl = "https://example.com";

      try {
        await controller.updateIssuer(mockContext, data, hostUrl);
        expect(true).toBe(false); // This will fail the test if execution reaches here
      } catch (error: any) {
        expect(error.message).toContain("Failed to update issuer");
      }
    });
  });
});
