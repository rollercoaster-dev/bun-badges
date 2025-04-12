import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "bun:test";
import { KeysService, KeyStatus } from "@/services/keys.service";
import { db } from "@/db/config";
import { keys } from "@/db/schema/keys.schema";
import { eq } from "drizzle-orm";
import "@/utils/test/integration-setup";

describe("KeysService Integration", () => {
  let keysService: KeysService;
  let testKeyId: string;

  // Setup before all tests
  beforeAll(async () => {
    // We'll use the existing database setup from the test environment
    // No need to create tables manually as they should already exist
  });

  beforeEach(async () => {
    keysService = new KeysService();

    // Clean up any existing test keys
    try {
      await db.delete(keys).where(eq(keys.name, "Test Key"));
    } catch (error) {
      console.error("Error cleaning up existing test keys:", error);
    }

    // Create a test key for use in tests
    try {
      const [testKey] = await db
        .insert(keys)
        .values({
          type: "signing",
          algorithm: "RS256",
          publicKey: "test-public-key",
          privateKey: "test-private-key",
          name: "Test Key",
          description: "Test key for integration tests",
          version: "1.0.0",
          isActive: true,
        })
        .returning();

      testKeyId = testKey.id;
    } catch (error) {
      console.error("Error creating test key:", error);
      throw error;
    }
  });

  afterEach(async () => {
    // Clean up test keys
    try {
      await db.delete(keys).where(eq(keys.name, "Test Key"));
    } catch (error) {
      console.error("Error cleaning up test keys:", error);
    }
  });

  // Clean up after all tests
  afterAll(async () => {
    try {
      // Delete all test data
      await db.delete(keys).where(eq(keys.name, "Test Key"));
    } catch (error) {
      console.error("Error cleaning up after tests:", error);
    }
  });

  test("should create a new key", async () => {
    const keyData = {
      type: "verification",
      algorithm: "ES256",
      publicKey: "new-test-public-key",
      privateKey: "new-test-private-key",
      name: "Test Key",
      description: "New test key for integration tests",
      version: "1.0.0",
    };

    const key = await keysService.createKey(keyData);

    expect(key).toBeDefined();
    expect(key.id).toBeDefined();
    expect(key.type).toBe("verification");
    expect(key.algorithm).toBe("ES256");
    expect(key.publicKey).toBe("new-test-public-key");
    expect(key.privateKey).toBe("new-test-private-key");
    expect(key.name).toBe("Test Key");
    expect(key.description).toBe("New test key for integration tests");
    expect(key.isActive).toBe(true);

    // Clean up the created key
    await db.delete(keys).where(eq(keys.id, key.id));
  });

  test("should get a key by ID", async () => {
    const key = await keysService.getKeyById(testKeyId);

    expect(key).toBeDefined();
    expect(key?.id).toBe(testKeyId);
    expect(key?.type).toBe("signing");
    expect(key?.algorithm).toBe("RS256");
    expect(key?.publicKey).toBe("test-public-key");
    expect(key?.privateKey).toBe("test-private-key");
    expect(key?.name).toBe("Test Key");
    expect(key?.description).toBe("Test key for integration tests");
    expect(key?.isActive).toBe(true);
  });

  test("should list keys by type", async () => {
    const keys = await keysService.listKeysByType("signing");

    expect(keys).toBeDefined();
    expect(keys.length).toBeGreaterThanOrEqual(1);

    // Find our test key in the results
    const testKey = keys.find((k) => k.id === testKeyId);
    expect(testKey).toBeDefined();
    expect(testKey?.type).toBe("signing");
    expect(testKey?.algorithm).toBe("RS256");
    expect(testKey?.name).toBe("Test Key");
  });

  test("should update a key", async () => {
    const keyData = {
      name: "Updated Test Key",
      description: "Updated test key for integration tests",
    };

    const key = await keysService.updateKey(testKeyId, keyData);

    expect(key).toBeDefined();
    expect(key.id).toBe(testKeyId);
    expect(key.name).toBe("Updated Test Key");
    expect(key.description).toBe("Updated test key for integration tests");
  });

  test("should revoke a key", async () => {
    await keysService.revokeKey(testKeyId, "Test revocation");

    const key = await keysService.getKeyById(testKeyId);
    expect(key).toBeDefined();
    expect(key?.isActive).toBe(false);
    expect(key?.revokedAt).toBeDefined();
    expect(key?.revocationReason).toBe("Test revocation");
  });

  test("should rotate a key", async () => {
    const newKey = await keysService.rotateKey(testKeyId);

    expect(newKey).toBeDefined();
    expect(newKey.id).not.toBe(testKeyId);
    expect(newKey.type).toBe("signing");
    expect(newKey.algorithm).toBe("RS256");
    expect(newKey.publicKey).toBe("test-public-key");
    expect(newKey.privateKey).toBe("test-private-key");
    expect(newKey.name).toBe("Test Key");
    expect(newKey.description).toBe("Test key for integration tests");
    expect(newKey.isActive).toBe(true);
    expect(newKey.previousKeyId).toBe(testKeyId);

    // Check that the old key is now inactive
    const oldKey = await keysService.getKeyById(testKeyId);
    expect(oldKey).toBeDefined();
    expect(oldKey?.isActive).toBe(false);

    // Clean up the new key
    await db.delete(keys).where(eq(keys.id, newKey.id));
  });

  test("should check if a key is active", async () => {
    // First check an active key
    let isActive = await keysService.isKeyActive(testKeyId);
    expect(isActive).toBe(true);

    // Now revoke the key and check again
    await keysService.revokeKey(testKeyId, "Test revocation");
    isActive = await keysService.isKeyActive(testKeyId);
    expect(isActive).toBe(false);
  });

  test("should get key status", async () => {
    // First check an active key
    let status = await keysService.getKeyStatus(testKeyId);
    expect(status).toBe(KeyStatus.ACTIVE);

    // Now revoke the key and check again
    await keysService.revokeKey(testKeyId, "Test revocation");
    status = await keysService.getKeyStatus(testKeyId);
    expect(status).toBe(KeyStatus.REVOKED);
  });
});
