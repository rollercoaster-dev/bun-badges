// @ts-nocheck
/**
 * Integration Test Setup File
 * This file is used to set up the environment for integration tests.
 * Unlike the regular setup.ts file, it does NOT mock Drizzle ORM or the database.
 */
import { config } from "dotenv";
import * as path from "path";
import { mock } from "bun:test";

// Load test environment variables
config({ path: path.resolve(process.cwd(), "test.env") });

// We explicitly DO NOT mock drizzle-orm here, as we want to use the real database

// We do need to mock the crypto functions for deterministic results
import { TEST_KEYS } from "./integration-setup";

// Create deterministic crypto mocks
mock.module("@noble/ed25519", () => {
  return {
    etc: {
      sha512Sync: (data: Uint8Array) => {
        // Return a consistent hash for testing
        const hash = new Uint8Array(64);
        hash.fill(9);
        return hash;
      },
    },
    utils: {
      randomPrivateKey: (): Uint8Array => {
        return TEST_KEYS.privateKey.slice();
      },
      sha512: async (data: Uint8Array) => {
        // Return a consistent hash for testing
        const hash = new Uint8Array(64);
        hash.fill(9);
        return hash;
      },
    },
    getPublicKey: async (privateKey: Uint8Array): Promise<Uint8Array> => {
      // Return consistent test public key
      return TEST_KEYS.publicKey.slice();
    },
    sign: async (
      message: Uint8Array,
      privateKey: Uint8Array,
    ): Promise<Uint8Array> => {
      // Return consistent test signature
      return TEST_KEYS.signature.slice();
    },
    verify: async (
      signature: Uint8Array,
      message: Uint8Array,
      publicKey: Uint8Array,
    ): Promise<boolean> => {
      // For testing, always verify if using the test public key
      return (
        publicKey.length === TEST_KEYS.publicKey.length &&
        publicKey[0] === TEST_KEYS.publicKey[0]
      );
    },
  };
});

// Also mock the base64url from @scure/base
mock.module("@scure/base", () => {
  return {
    base64url: {
      decode: (str: string): Uint8Array => {
        // Return test signature for any base64 input
        return TEST_KEYS.signature.slice();
      },
      encode: (bytes: Uint8Array): string => {
        // Return consistent base64 string
        return "TEST_BASE64_SIGNATURE";
      },
    },
    base58: {
      decode: (str: string): Uint8Array => {
        // If it looks like our test key encoding, return the test key
        return str.includes("TEST")
          ? TEST_KEYS.publicKey.slice()
          : new Uint8Array([1, 2, 3]);
      },
      encode: (bytes: Uint8Array): string => {
        // Return an encoding based on the first byte
        return bytes[0] === TEST_KEYS.publicKey[0]
          ? "TEST_BASE58_PUBLIC_KEY"
          : bytes[0] === TEST_KEYS.privateKey[0]
            ? "TEST_BASE58_PRIVATE_KEY"
            : "TEST_BASE58_OTHER";
      },
    },
  };
});

console.log(
  "✅ Integration test preload complete - using real database with crypto mocks",
);
