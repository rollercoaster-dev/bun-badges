import { describe, it, expect, mock, beforeAll, afterAll } from "bun:test";
import { KeyManagementService } from "@/services/key.service";
import { APIError } from "@/utils/errors";

// Remove database mock - DB interactions will be tested in integration tests
/*
mock.module("@/db/config", () => ({
  db: mockDb,
  schema: {
    issuerProfiles: {
      encryptedPrivateKey: "encryptedPrivateKey",
      issuerId: "issuerId",
    },
  },
}));
*/

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
      // TODO: Unskip these tests if Bun test runner interference issue with crypto is resolved
      // See: [Link to relevant issue/discussion if created]
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
        tampered[tampered.length - 1] = tampered[tampered.length - 1] ^ 1;

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
