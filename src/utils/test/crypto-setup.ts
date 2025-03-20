/**
 * This file sets up cryptographic mocks for testing.
 * It provides mock implementations of ed25519 functions.
 */
import { mock } from "bun:test";

// Define test keys for consistency
export const TEST_PRIVATE_KEY = new Uint8Array(32).fill(1);
export const TEST_PUBLIC_KEY = new Uint8Array(32).fill(2);
export const TEST_SIGNATURE = new Uint8Array(64).fill(3);

// Override the noble/ed25519 module
mock.module("@noble/ed25519", () => {
  return {
    etc: {
       
      sha512Sync: (_data: Uint8Array) => {
        // Return a consistent hash for testing
        const hash = new Uint8Array(64);
        hash.fill(9);
        return hash;
      },
    },
    utils: {
      randomPrivateKey: (): Uint8Array => {
        return TEST_PRIVATE_KEY.slice();
      },
       
      sha512: async (_data: Uint8Array) => {
        // Return a consistent hash for testing
        const hash = new Uint8Array(64);
        hash.fill(9);
        return hash;
      },
    },
     
    getPublicKey: async (_privateKey: Uint8Array): Promise<Uint8Array> => {
      // Return consistent test public key
      return TEST_PUBLIC_KEY.slice();
    },

    sign: async (
      _message: Uint8Array,
      _privateKey: Uint8Array,
    ): Promise<Uint8Array> => {
      // Return consistent test signature
      return TEST_SIGNATURE.slice();
    },

    verify: async (
      _signature: Uint8Array,
      _message: Uint8Array,
      publicKey: Uint8Array,
    ): Promise<boolean> => {
      // For testing, always verify if using the test public key
      return (
        publicKey.length === TEST_PUBLIC_KEY.length &&
        publicKey[0] === TEST_PUBLIC_KEY[0]
      );
    },
  };
});

// Also mock the base64url from @scure/base
mock.module("@scure/base", () => {
  return {
    base64url: {
       
      decode: (_str: string): Uint8Array => {
        // Return test signature for any base64 input
        return TEST_SIGNATURE.slice();
      },
       
      encode: (_bytes: Uint8Array): string => {
        // Return consistent base64 string
        return "TEST_BASE64_SIGNATURE";
      },
    },
    base58: {
       
      decode: (_str: string): Uint8Array => {
        // Return test key for any base58 input
        return TEST_PUBLIC_KEY.slice();
      },
       
      encode: (_bytes: Uint8Array): string => {
        // Return consistent base58 string
        return "TEST_BASE58_KEY";
      },
    },
  };
});

// Export a function to generate test keys
export function createTestKeyPair(issuerId: string): {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
} {
  // Create different keys based on issuerId for testing
  const isTestIssuer = issuerId === "test-issuer-id";

  const privateKey = new Uint8Array(32).fill(isTestIssuer ? 1 : 5);
  const publicKey = new Uint8Array(32).fill(isTestIssuer ? 2 : 6);

  return { privateKey, publicKey };
}
