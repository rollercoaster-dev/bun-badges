import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { IssuerController } from "@/controllers/issuer.controller";
import { seedTestData, clearTestData } from "@/utils/test/db-helpers";
import { testDb } from "@/utils/test/integration-setup";
import { issuerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CreateIssuerDto } from "@/models/issuer.model";

describe("IssuerController - Create Issuer", () => {
  let testData: any;

  beforeEach(async () => {
    testData = await seedTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe("createIssuer", () => {
    test("should create a new issuer", async () => {
      const controller = new IssuerController();
      const ownerUserId = testData.user.userId;
      const data: CreateIssuerDto = {
        name: "New Test Issuer",
        url: "https://new-issuer.example.com",
        description: "A newly created test issuer",
        email: "new@example.com",
      };
      const hostUrl = "https://example.com";

      const result = await controller.createIssuer(ownerUserId, data, hostUrl);

      expect(result.issuerId).toBeDefined();
      expect(result.name).toBe(data.name);
      expect(result.url).toBe(data.url);

      // Handle optional fields with type safety
      if (data.description) {
        expect(result.description).toBe(data.description);
      }
      if (data.email) {
        expect(result.email).toBe(data.email);
      }

      expect(result.ownerUserId).toBe(ownerUserId);
      expect(result.issuerJson).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      // Verify issuer exists in the database
      const issuers = await testDb
        .select()
        .from(issuerProfiles)
        .where(eq(issuerProfiles.issuerId, result.issuerId));

      expect(issuers.length).toBe(1);
      expect(issuers[0].name).toBe(data.name);
    });
  });
});
