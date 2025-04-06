import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "bun:test";
import { KeyManagementService } from "@/services/key.service";
import { DatabaseService } from "@/services/db.service";
import { APIError } from "@/utils/errors";
import { nanoid } from "nanoid";
import crypto from "node:crypto";
// Remove unused imports
// import { issuerProfiles } from "@/db/schema/issuers";
// import { eq } from "drizzle-orm";
// import { db } from "@/db/config";

// No need for global db access in test file anymore
// const db = DatabaseService.db;

describe("KeyManagementService (Integration) - Crash Isolation", () => {
  let service: KeyManagementService;
  let dbService: DatabaseService;
  let createdIssuerId: string | null = null;
  const testOwnerUserId = crypto.randomUUID();
  const testKey = `-----BEGIN PRIVATE KEY-----
MIICajCCAdOgAwIBAgIEA...INTEGRATION_EXAMPLE...=
-----END PRIVATE KEY-----`;
  let encryptedTestKey: string;

  beforeAll(async () => {
    console.log("beforeAll: Setting up service instance...");
    if (!process.env.MASTER_ENCRYPTION_KEY) {
      process.env.MASTER_ENCRYPTION_KEY = "test-integration-master-key";
      console.warn("MASTER_ENCRYPTION_KEY was not set...");
    }
    try {
      service = new KeyManagementService();
      dbService = new DatabaseService(); // Still instantiate to check for import/constructor issues
      encryptedTestKey = service.encryptPrivateKey(testKey); // Crypto operation

      // Create the test user
      try {
        await dbService.createUser({
          userId: testOwnerUserId,
          email: `test-owner-${testOwnerUserId}@example.com`,
          passwordHash: "test-password", // Use passwordHash (camelCase)
          // role: "issuer", // Remove role
          // status: "active", // Remove status
        });
        console.log(`beforeAll: Created test user ${testOwnerUserId}`);
      } catch (userError) {
        console.error(
          `Error creating test user ${testOwnerUserId}:`,
          userError,
        );
        // Decide if we should throw or try to continue
        throw new Error(
          `Failed to create prerequisite test user: ${userError}`,
        );
      }

      console.log("beforeAll: Service instances created.");
    } catch (error) {
      console.error("Error during beforeAll service instantiation:", error);
      throw error;
    }
  });

  afterAll(async () => {
    console.log("afterAll: Cleaning up test user...");
    if (testOwnerUserId) {
      try {
        await dbService.deleteUserById(testOwnerUserId);
        console.log(`afterAll: Deleted test user ${testOwnerUserId}`);
      } catch (cleanupError) {
        console.error(
          `Error cleaning up test user ${testOwnerUserId}:`,
          cleanupError,
        );
        // Log error but don't fail tests during cleanup
      }
    }
    // Optional: Close db connection if opened by dbService? Check dbService implementation.
  });

  afterEach(async () => {
    // Re-enable cleanup
    console.log("afterEach: Cleaning up test issuer...");
    if (createdIssuerId) {
      await dbService.deleteIssuerProfileById(createdIssuerId).catch((err) => {
        // Log cleanup errors but don't fail the test
        console.error(`Error cleaning up issuer ${createdIssuerId}:`, err);
      });
      createdIssuerId = null;
    }
  });

  // Helper to create issuer using the service
  async function createTestIssuerViaService(data: any = {}) {
    const issuerData = {
      issuerId: data.issuerId ?? crypto.randomUUID(),
      name: data.name ?? "Test Issuer via Service",
      url: data.url ?? "https://example.com/issuerservice",
      email: data.email ?? "issuerservice@example.com",
      ownerUserId: testOwnerUserId, // Use consistent ID
      issuerJson: data.issuerJson ?? { name: "Test Issuer via Service" },
      signingPublicKey: data.signingPublicKey ?? null,
      encryptedPrivateKey: data.encryptedPrivateKey ?? null,
    };
    const created = await dbService.createIssuerProfile(issuerData);
    createdIssuerId = created.issuerId; // Track for cleanup
    return created;
  }

  // Remove the temporary test
  // it("TEMP TEST: should instantiate services without crashing", () => {
  //     console.log("Running temporary instantiation test...");
  //     expect(service).toBeDefined();
  //     expect(dbService).toBeDefined();
  //     console.log("Temporary instantiation test passed.");
  // });

  // Uncomment actual tests
  it("getIssuerPrivateKey: should retrieve and decrypt the key when issuer and key exist", async () => {
    const issuer = await createTestIssuerViaService({
      encryptedPrivateKey: encryptedTestKey,
    });

    const decryptedKey = await service.getIssuerPrivateKey(issuer.issuerId);
    expect(decryptedKey).toEqual(testKey);
  });

  it("getIssuerPrivateKey: should return 404 if issuer does not exist", async () => {
    const nonExistentIssuerId = crypto.randomUUID();
    let caughtError: any = null;
    try {
      await service.getIssuerPrivateKey(nonExistentIssuerId);
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBeInstanceOf(APIError);
    if (caughtError instanceof APIError) {
      expect(caughtError.status).toBe(404);
      expect(caughtError.message).toContain("Issuer not found");
    }
  });

  it("getIssuerPrivateKey: should return 404 if issuer exists but has no key", async () => {
    const issuer = await createTestIssuerViaService({
      encryptedPrivateKey: null,
    }); // Explicitly null
    let caughtError: any = null;
    try {
      await service.getIssuerPrivateKey(issuer.issuerId);
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBeInstanceOf(APIError);
    if (caughtError instanceof APIError) {
      expect(caughtError.status).toBe(404);
      expect(caughtError.message).toContain("Private key not found");
    }
  });

  it("getIssuerPrivateKey: should return error if decryption fails for a retrieved key", async () => {
    const issuer = await createTestIssuerViaService({
      encryptedPrivateKey: "invalid-base64-data!@#",
    });
    let caughtError: any = null;
    try {
      await service.getIssuerPrivateKey(issuer.issuerId);
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBeInstanceOf(APIError);
    // We expect a 500 or 400 depending on the decryption error type
    if (caughtError instanceof APIError) {
      expect([400, 500]).toContain(caughtError.status);
      expect(caughtError.message).toContain("Decryption failed");
    }
  });
});
