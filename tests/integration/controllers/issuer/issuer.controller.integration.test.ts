import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { IssuerController } from "@controllers/issuer.controller";
import {
  seedTestData,
  clearTestData,
  createMockContext,
} from "@utils/test/db-helpers";
import { testDb } from "@utils/test/integration-setup";
import { issuerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  CreateIssuerDto,
  UpdateIssuerDto,
  IssuerJsonLdV2,
} from "@models/issuer.model";
import { toIRI } from "@/utils/openbadges-types";

// Define response types for type safety
interface IssuerListResponse {
  data: Array<{
    issuerId: string;
    name: string;
    url: string;
    description?: string;
    email?: string;
    ownerUserId: string;
    issuerJson: any;
    createdAt: Date;
    updatedAt: Date;
  }>;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  };
}

interface IssuerResponse {
  issuerId: string;
  name: string;
  url: string;
  description?: string;
  email?: string;
  ownerUserId: string;
  issuerJson: any;
  createdAt: Date;
  updatedAt: Date;
}

describe("IssuerController - List Issuers", () => {
  let testData: any;

  beforeEach(async () => {
    testData = await seedTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe("listIssuers", () => {
    test("should return a list of issuers", async () => {
      const controller = new IssuerController();
      const mockContext = createMockContext({
        query: {
          page: "1",
          limit: "20",
          version: "2.0",
        },
      });

      const response = await controller.listIssuers(mockContext);
      expect(response.status).toBe(200);

      const responseData = (await response.json()) as IssuerListResponse;
      expect(responseData.data).toBeDefined();
      expect(Array.isArray(responseData.data)).toBe(true);
      expect(responseData.data.length).toBeGreaterThan(0);
      expect(responseData.pagination).toBeDefined();
      expect(responseData.pagination.total).toBeGreaterThan(0);
    });

    test("should support OB3 version parameter", async () => {
      const controller = new IssuerController();
      const mockContext = createMockContext({
        query: {
          page: "1",
          limit: "10",
          version: "3.0",
        },
      });

      const response = await controller.listIssuers(mockContext);
      expect(response.status).toBe(200);

      const responseData = (await response.json()) as IssuerListResponse;
      expect(responseData.data).toBeDefined();
      const contextValue = responseData.data[0]?.issuerJson?.["@context"];
      if (Array.isArray(contextValue)) {
        expect(
          contextValue.some(
            (ctx) =>
              typeof ctx === "string" &&
              ctx.includes("purl.imsglobal.org/spec/ob/v3p0"),
          ),
        ).toBe(true);
      } else if (typeof contextValue === "string") {
        expect(contextValue.includes("purl.imsglobal.org/spec/ob/v3p0")).toBe(
          true,
        );
      }
    });
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

      const issuer = (await response.json()) as IssuerResponse;
      expect(issuer.issuerId).toBe(String(testData.issuer.issuerId));
      expect(issuer.name).toBe("Test Issuer");
      expect(issuer.url).toBe("https://test-issuer.example.com");
      expect(issuer.issuerJson).toBeDefined();
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
        expect(true).toBe(false); // Force test to fail if we get here
      } catch (error: any) {
        expect(error.message).toContain("Failed to get issuer");
      }
    });
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

      const result = await controller.createIssuer(
        String(ownerUserId),
        data,
        hostUrl,
      );

      expect(result.issuerId).toBeDefined();

      expect(result.name).toBe(data.name);

      expect(result.url).toBe(data.url);

      expect(result.description).toBe(data.description ?? "");

      expect(result.email).toBe(data.email ?? "");

      expect(result.ownerUserId).toBe(ownerUserId);
      expect(result.issuerJson).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      // Verify issuer exists in the database
      const issuers = await testDb()
        .select()
        .from(issuerProfiles)
        .where(eq(issuerProfiles.issuerId, result.issuerId));

      expect(issuers.length).toBe(1);
      expect(issuers[0].name).toBe(data.name);
    });
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

      const updatedIssuer = (await response.json()) as IssuerResponse;
      expect(updatedIssuer.issuerId).toBe(String(testData.issuer.issuerId));
      expect(updatedIssuer.name).toBe(data.name ?? "");
      expect(updatedIssuer.url).toBe(data.url ?? "");
      expect(updatedIssuer.description).toBe(data.description ?? "");
      expect(updatedIssuer.email).toBe(data.email ?? "");

      // Verify issuer is updated in the database
      const issuers = await testDb()
        .select()
        .from(issuerProfiles)
        .where(eq(issuerProfiles.issuerId, testData.issuer.issuerId));

      expect(issuers.length).toBe(1);
      expect(issuers[0].name).toBe(data.name ?? "");
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
        expect(true).toBe(false); // Force test to fail if we get here
      } catch (error: any) {
        expect(error.message).toContain("Failed to update issuer");
      }
    });
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
      // Type assertion to make sure we extract string value
      const issuerId = String(newIssuer.issuerId);

      // Verify it exists first
      const beforeDelete = await testDb()
        .select()
        .from(issuerProfiles)
        .where(eq(issuerProfiles.issuerId, issuerId));
      expect(beforeDelete.length).toBe(1);

      // Delete the issuer
      const result = await controller.deleteIssuer(issuerId);
      expect(result).toBe(true);

      // Verify it's gone
      const afterDelete = await testDb()
        .select()
        .from(issuerProfiles)
        .where(eq(issuerProfiles.issuerId, issuerId));
      expect(afterDelete.length).toBe(0);
    });

    test("should not delete an issuer with badges", async () => {
      const controller = new IssuerController();

      // Try to delete the test issuer which has a badge
      try {
        await controller.deleteIssuer(testData.issuer.issuerId as string);
        expect(true).toBe(false); // Force test to fail if we get here
      } catch (error: unknown) {
        if (error instanceof Error) {
          expect(error.message).toContain(
            "Cannot delete issuer with associated badges",
          );
        } else {
          // Handle case where error isn't an Error object
          expect(false).toBe(true); // Force test to fail
        }
      }

      // Verify it still exists
      const issuers = await testDb()
        .select()
        .from(issuerProfiles)
        .where(eq(issuerProfiles.issuerId, testData.issuer.issuerId));

      expect(issuers.length).toBe(1);
    });
  });

  describe("verifyIssuer", () => {
    test("should verify a valid issuer JSON for OB2", () => {
      const controller = new IssuerController();
      const issuerJson: IssuerJsonLdV2 = {
        "@context": "https://w3id.org/openbadges/v2",
        type: "Profile",
        id: toIRI("https://example.com/issuers/test"),
        name: "Test Issuer",
        url: toIRI("https://example.com/issuer"),
        email: "test@example.com",
      };

      const result = controller.verifyIssuer(issuerJson, "2.0");
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should verify a valid issuer JSON for OB3", () => {
      const controller = new IssuerController();

      // Use the correct types from the controller for OB3
      const issuerJson = {
        "@context": ["https://purl.imsglobal.org/spec/ob/v3p0/context.json"],
        type: "https://purl.imsglobal.org/spec/vc/ob/vocab.html#Profile",
        id: "https://example.com/issuers/test",
        name: "Test Issuer",
        url: "https://example.com/issuer",
        publicKey: [
          {
            id: "did:web:example.com#key-1",
            type: "Ed25519VerificationKey2020" as const,
            controller: "did:web:example.com",
            publicKeyJwk: {
              kty: "OKP",
              crv: "Ed25519",
              x: "test",
            },
          },
        ],
      };

      // Cast to bypass the immediate type check, as verifyIssuer currently expects V2 type
      // Note: verifyIssuer logic needs update to properly handle V3 checks
      const result = controller.verifyIssuer(
        issuerJson as unknown as IssuerJsonLdV2,
        "3.0",
      );
      expect(result.valid).toBe(false); // Expect failure as V3 check is not implemented
      expect(result.errors).toContain(
        "OB 3.0 verification not implemented in this basic check",
      ); // Check error message
    });

    test("should return errors for invalid issuer JSON", () => {
      const controller = new IssuerController();

      const issuerJson = {
        "@context": "https://w3id.org/openbadges/v2",
        type: "InvalidType",
        // missing id
        name: "Test Issuer",
        // missing url
      };

      const result = controller.verifyIssuer(issuerJson as any, "2.0");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain("Missing id property");
      expect(result.errors).toContain("Missing url property");
      expect(result.errors).toContain(
        "Invalid type - must be 'Profile' or 'Issuer'",
      );
    });

    test("should verify a valid issuer JSON for OB2", () => {
      const controller = new IssuerController();
      const issuerJsonOB3Context = {
        "@context": "https://w3id.org/openbadges/v2",
        type: "Profile",
        id: toIRI("did:web:example.com:issuers:test"),
        name: "Test Issuer OB3 Context",
        url: toIRI("https://example.com/issuer"),
        publicKey: [
          {
            id: toIRI("did:web:example.com:issuers:test#key-1"),
            type: "Ed25519VerificationKey2020" as const,
            controller: toIRI("did:web:example.com:issuers:test"),
            publicKeyJwk: {
              kty: "OKP",
              crv: "Ed25519",
              x: "test_public_key_x",
            },
          },
        ],
      };
      const result = controller.verifyIssuer(
        issuerJsonOB3Context as IssuerJsonLdV2,
        "2.0",
      );
      expect(result.valid).toBe(true);
    });
  });
});
