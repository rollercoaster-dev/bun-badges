import { describe, it, expect, mock, beforeAll, afterAll } from "bun:test";
import { KeyManagementService } from "@/services/key.service";
import { APIError } from "@/utils/errors";
import crypto from "node:crypto"; // Import crypto for mocking

// Simpler logger mock (remains useful for unit tests)
mock.module("@/utils/logger", () => {
  const mockLogger = {
    info: mock((...args: any[]) => console.log("[Mock Logger INFO]:", ...args)),
    debug: mock((...args: any[]) =>
      console.log("[Mock Logger DEBUG]:", ...args),
    ), // Log debug messages
    warn: mock((...args: any[]) =>
      console.warn("[Mock Logger WARN]:", ...args),
    ),
    error: mock((...args: any[]) =>
      console.error("[Mock Logger ERROR]:", ...args),
    ), // Log error messages
    child: mock(() => mockLogger), // Return itself for child calls
  };
  return { default: mockLogger };
});

describe("KeyManagementService (Unit)", () => {
  const TEST_MASTER_KEY = "test-master-encryption-key-12345";
  let originalMasterKey: string | undefined;
  let service: KeyManagementService;

  beforeAll(() => {
    originalMasterKey = process.env.MASTER_ENCRYPTION_KEY;
    process.env.MASTER_ENCRYPTION_KEY = TEST_MASTER_KEY;
    try {
      service = new KeyManagementService();
    } catch (error) {
      console.error(
        "Failed to instantiate KeyManagementService in beforeAll:",
        error,
      );
      throw error;
    }
  });

  afterAll(() => {
    process.env.MASTER_ENCRYPTION_KEY = originalMasterKey;
  });

  it("should throw an error if MASTER_ENCRYPTION_KEY is not set", () => {
    const currentKey = process.env.MASTER_ENCRYPTION_KEY;
    delete process.env.MASTER_ENCRYPTION_KEY;
    expect(() => new KeyManagementService()).toThrow(
      "MASTER_ENCRYPTION_KEY must be configured.",
    );
    process.env.MASTER_ENCRYPTION_KEY = currentKey;
  });

  describe("with service instance", () => {
    describe("generateKeyPair", () => {
      it("should return public and private keys in PEM format", () => {
        const keys = service.generateKeyPair();
        expect(keys).toHaveProperty("publicKey");
        expect(keys).toHaveProperty("privateKey");
        expect(keys.publicKey).toStartWith("-----BEGIN PUBLIC KEY-----");
        expect(keys.publicKey).toEndWith("-----END PUBLIC KEY-----\n");
        expect(keys.privateKey).toStartWith("-----BEGIN PRIVATE KEY-----");
        expect(keys.privateKey).toEndWith("-----END PRIVATE KEY-----\n");
      });
    });

    describe("encryptPrivateKey / decryptPrivateKey", () => {
      // Mock crypto.randomBytes specifically for these tests
      // to ensure it returns a Buffer, working around potential env issues.
      // NOTE: SALT_LENGTH is 16, IV_LENGTH is 16
      const MOCK_SALT = Buffer.alloc(16, "a"); // Create a 16-byte buffer
      const MOCK_IV = Buffer.alloc(16, "b"); // Create a 16-byte buffer
      let originalRandomBytes: any;

      beforeAll(() => {
        originalRandomBytes = crypto.randomBytes;
        // Mock implementation: return salt first, then iv
        let callCount = 0;
        crypto.randomBytes = mock((size: number) => {
          if (size === 16) {
            // Assuming SALT_LENGTH and IV_LENGTH are 16
            callCount++;
            return callCount === 1 ? MOCK_SALT : MOCK_IV;
          }
          // Fallback to original if size is different (shouldn't happen here)
          return originalRandomBytes(size);
        });
      });

      afterAll(() => {
        // Restore original crypto.randomBytes
        crypto.randomBytes = originalRandomBytes;
      });

      it("should encrypt and decrypt a private key successfully", () => {
        const { privateKey } = service.generateKeyPair();
        const encrypted = service.encryptPrivateKey(privateKey);
        const decrypted = service.decryptPrivateKey(encrypted);
        expect(decrypted).toEqual(privateKey);
      });

      it("should throw error when decrypting invalid format", () => {
        expect(() => service.decryptPrivateKey("invalid base64 data")).toThrow(
          APIError,
        );
      });

      it("should throw error when decrypting with tampered data (invalid tag)", () => {
        const { privateKey } = service.generateKeyPair();
        const encrypted = service.encryptPrivateKey(privateKey);
        const tampered = Buffer.from(encrypted, "base64");
        // Tamper the tag part (offset SALT_LENGTH + IV_LENGTH)
        const tagOffset = 16 + 16;
        tampered[tagOffset] = tampered[tagOffset] ^ 1; // Flip a bit in the tag

        expect(() =>
          service.decryptPrivateKey(tampered.toString("base64")),
        ).toThrow("Decryption failed: Invalid authentication tag");
      });
    });

    // Remove describe block for getIssuerPrivateKey as it requires DB interaction
    /*
    describe("getIssuerPrivateKey", () => {
      // ... tests removed ...
    });
    */
  });
});
