import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "bun:test";
import {
  KeyManagementService,
  KeyType,
  KeyAlgorithm,
} from "../../src/services/key-management.service";
import { db } from "@/db/config";
import { keys } from "@/db/schema/keys.schema";
import { eq } from "drizzle-orm";
import "@/utils/test/integration-setup";

describe("Key Management Service", () => {
  let keyManagementService: KeyManagementService;

  // Setup before all tests
  beforeAll(async () => {
    // We'll use the existing database setup from the test environment
    // No need to create tables manually as they should already exist
  });

  beforeEach(async () => {
    // Create a new key management service instance for testing
    keyManagementService = new KeyManagementService();

    // Clean up any existing test keys
    try {
      await db.delete(keys).where(eq(keys.name, "test-key"));
      await db.delete(keys).where(eq(keys.name, "get-key-test"));
      await db.delete(keys).where(eq(keys.name, "rotate-key-test"));
      await db.delete(keys).where(eq(keys.name, "list-keys-test-1"));
      await db.delete(keys).where(eq(keys.name, "list-keys-test-2"));
      await db.delete(keys).where(eq(keys.name, "delete-key-test"));
    } catch (error) {
      console.error("Error cleaning up existing test keys:", error);
    }
  });

  afterEach(async () => {
    // Clean up test keys
    try {
      await db.delete(keys).where(eq(keys.name, "test-key"));
      await db.delete(keys).where(eq(keys.name, "get-key-test"));
      await db.delete(keys).where(eq(keys.name, "rotate-key-test"));
      await db.delete(keys).where(eq(keys.name, "list-keys-test-1"));
      await db.delete(keys).where(eq(keys.name, "list-keys-test-2"));
      await db.delete(keys).where(eq(keys.name, "delete-key-test"));
    } catch (error) {
      console.error("Error cleaning up test keys:", error);
    }
  });

  // Clean up after all tests
  afterAll(async () => {
    try {
      // Delete all test data
      await db.delete(keys).where(eq(keys.name, "test-key"));
      await db.delete(keys).where(eq(keys.name, "get-key-test"));
      await db.delete(keys).where(eq(keys.name, "rotate-key-test"));
      await db.delete(keys).where(eq(keys.name, "list-keys-test-1"));
      await db.delete(keys).where(eq(keys.name, "list-keys-test-2"));
      await db.delete(keys).where(eq(keys.name, "delete-key-test"));
    } catch (error) {
      console.error("Error cleaning up after tests:", error);
    }
  });

  test("should generate a new key pair", async () => {
    // Generate a new key pair
    const keyPair = await keyManagementService.generateKey(
      KeyType.SIGNING,
      KeyAlgorithm.RS256,
      "test-key",
    );

    // Verify the key pair properties
    expect(keyPair).toBeDefined();
    expect(keyPair.type).toBe(KeyType.SIGNING);
    expect(keyPair.algorithm).toBe(KeyAlgorithm.RS256);
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
    expect(keyPair.isRevoked).toBe(false);
  });

  test("should get a key by ID", async () => {
    // Generate a new key pair
    const keyPair = await keyManagementService.generateKey(
      KeyType.SIGNING,
      KeyAlgorithm.RS256,
      "get-key-test",
    );

    // Get the key by ID
    const retrievedKey = await keyManagementService.getKey(keyPair.id);

    // Verify the retrieved key
    expect(retrievedKey).toBeDefined();
    expect(retrievedKey?.id).toBe(keyPair.id);
    expect(retrievedKey?.type).toBe(KeyType.SIGNING);
    expect(retrievedKey?.algorithm).toBe(KeyAlgorithm.RS256);
    expect(retrievedKey?.publicKey).toBe(keyPair.publicKey);
    // Private key is encrypted in the database, so we can't compare directly
    expect(retrievedKey?.privateKey).toBeDefined();
  });

  test("should get the default signing key", async () => {
    // Get the default signing key
    const defaultKey = await keyManagementService.getDefaultSigningKey();

    // Verify the default key
    expect(defaultKey).toBeDefined();
    expect(defaultKey?.type).toBe(KeyType.SIGNING);
    expect(defaultKey?.isRevoked).toBe(false);
  });

  test("should rotate a key", async () => {
    // Generate a new key pair
    const originalKeyPair = await keyManagementService.generateKey(
      KeyType.SIGNING,
      KeyAlgorithm.RS256,
      "rotate-key-test",
    );

    // Rotate the key
    const rotatedKey = await keyManagementService.rotateKey(originalKeyPair.id);

    // Get the original key
    const originalKey = await keyManagementService.getKey(originalKeyPair.id);

    // Verify the rotated key
    expect(rotatedKey).toBeDefined();
    expect(rotatedKey.id).not.toBe(originalKeyPair.id);
    expect(rotatedKey.type).toBe(KeyType.SIGNING);
    expect(rotatedKey.algorithm).toBe(KeyAlgorithm.RS256);
    expect(rotatedKey.isRevoked).toBe(false);

    // Verify the original key is revoked
    expect(originalKey).toBeDefined();
    expect(originalKey?.isRevoked).toBe(true);
  });

  test("should list all keys", async () => {
    // Generate a few keys
    const key1 = await keyManagementService.generateKey(
      KeyType.SIGNING,
      KeyAlgorithm.RS256,
      "list-keys-test-1",
    );
    const key2 = await keyManagementService.generateKey(
      KeyType.VERIFICATION,
      KeyAlgorithm.EdDSA,
      "list-keys-test-2",
    );

    // List all keys
    const keys = await keyManagementService.listKeys();

    // Verify the keys list
    expect(keys).toBeDefined();
    expect(keys.length).toBeGreaterThanOrEqual(2);
    expect(keys.some((key) => key.id === key1.id)).toBe(true);
    expect(keys.some((key) => key.id === key2.id)).toBe(true);
  });

  test("should delete a key", async () => {
    // Generate a new key pair
    const keyPair = await keyManagementService.generateKey(
      KeyType.SIGNING,
      KeyAlgorithm.RS256,
      "delete-key-test",
    );

    // Delete the key
    const result = await keyManagementService.deleteKey(keyPair.id);

    // Verify the key was deleted
    expect(result).toBe(true);

    // Try to get the deleted key
    const deletedKey = await keyManagementService.getKey(keyPair.id);

    // The key should still exist but be marked as revoked
    expect(deletedKey).toBeDefined();
    expect(deletedKey?.isRevoked).toBe(true);
  });
});
