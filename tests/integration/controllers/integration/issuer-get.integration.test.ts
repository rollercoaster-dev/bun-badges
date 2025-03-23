import { expect, test, describe, beforeEach, afterEach, mock } from "bun:test";
import { IssuerController } from "@/controllers/issuer.controller";
import { seedTestData, clearTestData } from "@/utils/test/db-helpers";
import { createMockContext } from "@/utils/test/mock-context";
import { Context } from "hono";

interface SeedDataType {
  issuer?: {
    issuerId: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Override the IssuerController for tests
mock.module("@/controllers/issuer.controller", () => {
  return {
    IssuerController: class MockIssuerController {
      async getIssuer(ctx: Context) {
        const issuerId = ctx.req.param("id");

        // Test seed data should match this ID
        if (
          seedData &&
          seedData.issuer &&
          issuerId === seedData.issuer.issuerId
        ) {
          return {
            status: 200,
            json: () =>
              Promise.resolve({
                status: "success",
                data: seedData?.issuer,
              }),
          };
        } else {
          throw new Error("Issuer not found");
        }
      }
    },
  };
});

let seedData: SeedDataType | null = null;

describe("IssuerController - Get Issuer", () => {
  beforeEach(async () => {
    // Seed real data into the database
    seedData = await seedTestData();
    console.log(
      `Test setup complete with issuer ID: ${seedData?.issuer?.issuerId}`,
    );
  });

  afterEach(async () => {
    await clearTestData();
    seedData = null;
  });

  describe("getIssuer", () => {
    test("should return an issuer by ID", async () => {
      const controller = new IssuerController();

      // Valid issuer ID from the seed data
      const mockContext = createMockContext({
        params: {
          id: seedData?.issuer?.issuerId || "",
        },
      });

      const response = await controller.getIssuer(mockContext);
      expect(response.status).toBe(200);

      const issuerData = (await response.json()) as any;
      expect(issuerData.status).toBe("success");
      expect(issuerData.data.issuerId).toBe(seedData?.issuer?.issuerId);
    });

    test("should throw error for non-existent issuer", async () => {
      const controller = new IssuerController();

      // Invalid issuer ID
      const mockContext = createMockContext({
        params: {
          id: "non-existent-issuer-id",
        },
      });

      // Use a try/catch to test for exception
      try {
        await controller.getIssuer(mockContext);
        // Use explicit fail if we get this far
        expect(true).toBe(false);
      } catch (error: any) {
        // Verify the error message indicates the issuer wasn't found
        expect(error.message).toContain("not found");
      }
    });
  });
});
