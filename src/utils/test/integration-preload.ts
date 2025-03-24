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
      sha512Sync: (_data: Uint8Array) => {
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
      sha512: async () => {
        // Return a consistent hash for testing
        const hash = new Uint8Array(64);
        hash.fill(9);
        return hash;
      },
    },
    getPublicKey: async (_privateKey: Uint8Array): Promise<Uint8Array> => {
      // Return consistent test public key
      return TEST_KEYS.publicKey.slice();
    },
    sign: async (
      _message: Uint8Array,
      _privateKey: Uint8Array,
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
      decode: (_str: string): Uint8Array => {
        // Return test signature for any base64 input
        return TEST_KEYS.signature.slice();
      },
      encode: (_bytes: Uint8Array): string => {
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

/**
 * Integration Test Pool Management
 * This section handles proper cleanup of database pools for integration tests,
 * especially in CI environments where we want to avoid "Cannot use a pool after calling end"
 * errors that can occur when pools are closed prematurely.
 */

// Import only the type to avoid circular dependencies
import type { Pool } from "pg";

// Create a registry of all pools created during tests
const pools: Set<Pool> = new Set();

// Function to register a pool for cleanup
export function registerPool(pool: Pool): void {
  pools.add(pool);
  console.log(`Pool registered for cleanup (pools tracked: ${pools.size})`);
}

// Function to unregister a pool (e.g., when it's manually closed)
export function unregisterPool(pool: Pool): void {
  pools.delete(pool);
  console.log(`Pool unregistered (pools remaining: ${pools.size})`);
}

// Handle graceful cleanup on process exit
process.on("exit", () => {
  // Don't use async here as it won't work in exit handler
  console.log(`Cleaning up ${pools.size} database pools on process exit`);
  pools.forEach((pool) => {
    try {
      if (typeof pool.end === "function") {
        // Note: We can't await in exit handlers, but that's OK for final cleanup
        pool.end();
      }
    } catch (e) {
      // Ignore errors during cleanup
    }
  });
});

// Also ensure we clean up on SIGINT (Ctrl+C)
process.on("SIGINT", () => {
  console.log(`Cleaning up ${pools.size} database pools on SIGINT`);

  // Convert to array and use Promise.all for parallel cleanup
  const cleanupPromises = Array.from(pools).map((pool) => {
    try {
      if (typeof pool.end === "function") {
        return pool.end();
      }
    } catch (e) {
      // Ignore errors during cleanup
    }
    return Promise.resolve();
  });

  Promise.all(cleanupPromises)
    .then(() => {
      console.log("All pools closed, exiting");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error closing pools:", err);
      process.exit(1);
    });
});

console.log(
  "✅ Integration test preload complete - using real database with crypto mocks",
);
