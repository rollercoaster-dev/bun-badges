import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { IssuerController } from "@/controllers/issuer.controller";
import {
  seedTestData,
  clearTestData,
  createMockContext,
} from "@/utils/test/db-helpers";

describe("IssuerController - Get Issuer", () => {
  let testData: any;

  beforeEach(async () => {
    testData = await seedTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe("getIssuer", () => {
    test("should return an issuer by ID", async () => {
      const controller = new IssuerController();
      const mockContext = createMockContext({
        params: {
          id: testData.issuer.issuerId,
        },
        query: {
          version: "2.0",
        },
      });

      const response = await controller.getIssuer(mockContext);
      expect(response.status).toBe(200);

      const issuerData = (await response.json()) as any;
      expect(issuerData.issuerId).toBe(testData.issuer.issuerId);
      expect(issuerData.name).toBe(testData.issuer.name);
      expect(issuerData.url).toBe(testData.issuer.url);
      expect(issuerData.issuerJson).toBeDefined();
    });

    test("should throw error for non-existent issuer", async () => {
      const controller = new IssuerController();
      const mockContext = createMockContext({
        params: {
          id: "non-existent-issuer-id",
        },
      });

      try {
        await controller.getIssuer(mockContext);
        // Use explicit fail method from bun:test
        expect(true).toBe(false); // This will fail the test if execution reaches here
      } catch (error: any) {
        expect(error.message).toContain("Failed to get issuer");
      }
    });
  });
});
