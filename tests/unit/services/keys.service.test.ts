import { describe, test, expect, mock, beforeEach } from "bun:test";
import { KeysService, KeyStatus } from "@/services/keys.service";
import "@/utils/test/unit-setup";

// Mock the database module
mock.module("@/db/config", () => {
  return {
    db: {
      insert: () => ({
        values: () => ({
          returning: () => [
            {
              id: "test-key-id",
              type: "signing",
              algorithm: "RS256",
              publicKey: "test-public-key",
              privateKey: "test-private-key",
              name: "Test Key",
              description: "Test key for unit tests",
              version: "1.0.0",
              createdAt: new Date(),
              isActive: true,
            },
          ],
        }),
      }),
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => [
              {
                id: "test-key-id",
                type: "signing",
                algorithm: "RS256",
                publicKey: "test-public-key",
                privateKey: "test-private-key",
                name: "Test Key",
                description: "Test key for unit tests",
                version: "1.0.0",
                createdAt: new Date(),
                isActive: true,
              },
            ],
          }),
        }),
      }),
      update: () => ({
        set: () => ({
          where: () => ({
            returning: () => [
              {
                id: "test-key-id",
                type: "signing",
                algorithm: "RS256",
                publicKey: "test-public-key",
                privateKey: "test-private-key",
                name: "Updated Key",
                description: "Updated key for unit tests",
                version: "1.0.0",
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: true,
              },
            ],
          }),
        }),
      }),
    },
  };
});

describe("KeysService", () => {
  let keysService: KeysService;

  beforeEach(() => {
    keysService = new KeysService();
  });

  test("should create a new key", async () => {
    const keyData = {
      type: "signing",
      algorithm: "RS256",
      publicKey: "test-public-key",
      privateKey: "test-private-key",
      name: "Test Key",
      description: "Test key for unit tests",
    };

    const key = await keysService.createKey(keyData);

    expect(key).toBeDefined();
    expect(key.id).toBe("test-key-id");
    expect(key.type).toBe("signing");
    expect(key.algorithm).toBe("RS256");
    expect(key.publicKey).toBe("test-public-key");
    expect(key.privateKey).toBe("test-private-key");
    expect(key.name).toBe("Test Key");
    expect(key.description).toBe("Test key for unit tests");
    expect(key.isActive).toBe(true);
  });

  test("should get a key by ID", async () => {
    const key = await keysService.getKeyById("test-key-id");

    expect(key).toBeDefined();
    expect(key?.id).toBe("test-key-id");
    expect(key?.type).toBe("signing");
    expect(key?.algorithm).toBe("RS256");
    expect(key?.publicKey).toBe("test-public-key");
    expect(key?.privateKey).toBe("test-private-key");
    expect(key?.name).toBe("Test Key");
    expect(key?.description).toBe("Test key for unit tests");
    expect(key?.isActive).toBe(true);
  });

  test("should list keys by type", async () => {
    const keys = await keysService.listKeysByType("signing");

    expect(keys).toBeDefined();
    expect(keys.length).toBe(1);
    expect(keys[0].id).toBe("test-key-id");
    expect(keys[0].type).toBe("signing");
    expect(keys[0].algorithm).toBe("RS256");
    expect(keys[0].publicKey).toBe("test-public-key");
    expect(keys[0].privateKey).toBe("test-private-key");
    expect(keys[0].name).toBe("Test Key");
    expect(keys[0].description).toBe("Test key for unit tests");
    expect(keys[0].isActive).toBe(true);
  });

  test("should update a key", async () => {
    const keyData = {
      name: "Updated Key",
      description: "Updated key for unit tests",
    };

    const key = await keysService.updateKey("test-key-id", keyData);

    expect(key).toBeDefined();
    expect(key.id).toBe("test-key-id");
    expect(key.name).toBe("Updated Key");
    expect(key.description).toBe("Updated key for unit tests");
    // No updatedAt field in the mock
  });

  test("should check if a key is active", async () => {
    const isActive = await keysService.isKeyActive("test-key-id");

    expect(isActive).toBe(true);
  });

  test("should get key status", async () => {
    const status = await keysService.getKeyStatus("test-key-id");

    expect(status).toBe(KeyStatus.ACTIVE);
  });

  test("should generate a new version string", async () => {
    // This is a private method, so we need to access it using any
    const keysServiceAny = keysService as any;

    // Test with no version
    expect(keysServiceAny.generateNewVersion()).toBe("1.0.0");

    // Test with valid version
    expect(keysServiceAny.generateNewVersion("1.0.0")).toBe("1.0.1");

    // Test with invalid version
    expect(keysServiceAny.generateNewVersion("invalid")).toBe("1.0.0");
  });
});
