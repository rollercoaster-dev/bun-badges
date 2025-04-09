import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { KeyManagementService, KeyType, KeyAlgorithm } from "../../src/services/key-management.service";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

describe("Key Management Service", () => {
  // Create a temporary directory for test keys
  const testKeysDir = join(process.cwd(), "tests", "temp", "keys");
  let keyManagementService: KeyManagementService;

  beforeAll(() => {
    // Ensure the test keys directory exists
    if (!existsSync(testKeysDir)) {
      mkdirSync(testKeysDir, { recursive: true });
    }

    // Create a new key management service instance for testing
    keyManagementService = new KeyManagementService(testKeysDir);
  });

  afterAll(() => {
    // Clean up the test keys directory
    rmSync(testKeysDir, { recursive: true, force: true });
  });

  test("should generate a new key pair", async () => {
    // Generate a new key pair
    const keyPair = await keyManagementService.generateKey(
      KeyType.SIGNING,
      KeyAlgorithm.RS256,
      "test-key"
    );

    // Verify the key pair properties
    expect(keyPair).toBeDefined();
    expect(keyPair.id).toBe("test-key");
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
      "get-key-test"
    );

    // Get the key by ID
    const retrievedKey = keyManagementService.getKey("get-key-test");

    // Verify the retrieved key
    expect(retrievedKey).toBeDefined();
    expect(retrievedKey?.id).toBe("get-key-test");
    expect(retrievedKey?.type).toBe(KeyType.SIGNING);
    expect(retrievedKey?.algorithm).toBe(KeyAlgorithm.RS256);
    expect(retrievedKey?.publicKey).toBe(keyPair.publicKey);
    expect(retrievedKey?.privateKey).toBe(keyPair.privateKey);
  });

  test("should get the default signing key", async () => {
    // Get the default signing key
    const defaultKey = keyManagementService.getDefaultSigningKey();

    // Verify the default key
    expect(defaultKey).toBeDefined();
    expect(defaultKey?.type).toBe(KeyType.SIGNING);
    expect(defaultKey?.isRevoked).toBe(false);
  });

  test("should rotate a key", async () => {
    // Generate a new key pair
    await keyManagementService.generateKey(
      KeyType.SIGNING,
      KeyAlgorithm.RS256,
      "rotate-key-test"
    );

    // Rotate the key
    const rotatedKey = await keyManagementService.rotateKey("rotate-key-test");

    // Get the original key
    const originalKey = keyManagementService.getKey("rotate-key-test");

    // Verify the rotated key
    expect(rotatedKey).toBeDefined();
    expect(rotatedKey.id).not.toBe("rotate-key-test");
    expect(rotatedKey.id).toContain("rotate-key-test-rotated-");
    expect(rotatedKey.type).toBe(KeyType.SIGNING);
    expect(rotatedKey.algorithm).toBe(KeyAlgorithm.RS256);
    expect(rotatedKey.isRevoked).toBe(false);

    // Verify the original key is revoked
    expect(originalKey).toBeDefined();
    expect(originalKey?.isRevoked).toBe(true);
  });

  test("should list all keys", async () => {
    // Generate a few keys
    await keyManagementService.generateKey(
      KeyType.SIGNING,
      KeyAlgorithm.RS256,
      "list-keys-test-1"
    );
    await keyManagementService.generateKey(
      KeyType.VERIFICATION,
      KeyAlgorithm.ES256,
      "list-keys-test-2"
    );

    // List all keys
    const keys = keyManagementService.listKeys();

    // Verify the keys list
    expect(keys).toBeDefined();
    expect(keys.length).toBeGreaterThanOrEqual(2);
    expect(keys.some(key => key.id === "list-keys-test-1")).toBe(true);
    expect(keys.some(key => key.id === "list-keys-test-2")).toBe(true);
  });

  test("should delete a key", async () => {
    // Generate a new key pair
    await keyManagementService.generateKey(
      KeyType.SIGNING,
      KeyAlgorithm.RS256,
      "delete-key-test"
    );

    // Delete the key
    const result = keyManagementService.deleteKey("delete-key-test");

    // Verify the key was deleted
    expect(result).toBe(true);

    // Try to get the deleted key
    const deletedKey = keyManagementService.getKey("delete-key-test");

    // Verify the key is no longer available
    expect(deletedKey).toBeUndefined();
  });
});
