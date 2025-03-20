import { config } from "dotenv";
import * as path from "path";
import { base58 } from "@scure/base";
import { beforeAll, afterAll, afterEach, mock } from "bun:test";

// Import the db and schema from the application config
import { db, dbPool, schema } from "@/db/config";
import { issuerProfiles } from "@/db/schema/issuers";
import { signingKeys } from "@/db/schema/signing";

// Load test environment variables
config({ path: path.resolve(process.cwd(), "test.env") });

console.log("🔧 Integration test setup loading...");

// Test keys for deterministic cryptography
export const TEST_KEYS = {
  privateKey: new Uint8Array(32).fill(1), // Fixed for tests
  publicKey: new Uint8Array(32).fill(2), // Fixed for tests
  signature: new Uint8Array(64).fill(3), // Fixed for tests
};

// Export the db for use in tests
export const testDb = db;
export const pool = dbPool;

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

// Global setup - runs once before all tests that import this file
beforeAll(async () => {
  console.log("🔄 Setting up integration test database");

  try {
    // Seed initial test data
    await seedTestData();

    console.log("✅ Test database setup complete");
  } catch (error) {
    console.error("❌ Error setting up test database:", error);
    throw error;
  }
});

// Global teardown - runs once after all tests that import this file
afterAll(async () => {
  console.log("🧹 Cleaning up integration test database");
  try {
    console.log("✅ Test database cleanup complete");
  } catch (error) {
    console.error("❌ Error cleaning up test database:", error);
  }
});

// Optional: Reset database between tests if needed
// Comment this out if you want test data to persist between test cases
afterEach(async () => {
  await clearDatabase();
  await seedTestData();
});

// Helper function to safely check if a table exists
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = $1
      );
    `,
      [tableName],
    );

    return result?.rows?.[0]?.exists === true;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

// Helper function to clear data from tables that exist
async function clearDatabase() {
  try {
    // Disable foreign key checks (for PostgreSQL)
    await pool.query(`SET session_replication_role = 'replica'`);

    // List of tables to clear in proper order
    const tables = [
      "signing_keys",
      "badge_assertions",
      "badge_classes",
      "issuer_profiles",
      "login_tokens",
      "webauthn_credentials",
      "users",
    ];

    // Clear tables that exist
    for (const table of tables) {
      const exists = await tableExists(table);
      if (exists) {
        console.log(`Clearing table: ${table}`);
        await pool.query(`TRUNCATE TABLE "${table}" CASCADE`);
      }
    }

    // Re-enable foreign key checks
    await pool.query(`SET session_replication_role = 'origin'`);
  } catch (error) {
    console.error("Error clearing database:", error);
    // Don't throw here, just log the error and continue
  }
}

// Helper function to seed test data
async function seedTestData() {
  try {
    // Skip if users table doesn't exist yet
    const usersExist = await tableExists("users");
    if (!usersExist) {
      console.log("Tables don't exist yet, skipping data seeding");
      return;
    }

    console.log("Seeding test data...");

    // Create a test user first
    const [user] = await db
      .insert(schema.users)
      .values({
        email: "test@example.com",
        name: "Test User",
      })
      .returning();

    // Check if issuer_profiles table exists
    const issuerProfilesExist = await tableExists("issuer_profiles");
    if (issuerProfilesExist) {
      // Add a test issuer with the proper schema
      const [issuer] = await db
        .insert(issuerProfiles)
        .values({
          name: "Test Issuer",
          url: "https://test-issuer.example.com",
          description: "A test issuer for integration tests",
          email: "test@example.com",
          ownerUserId: user.userId,
          issuerJson: {
            "@context": "https://w3id.org/openbadges/v2",
            id: "https://test-issuer.example.com",
            type: "Issuer",
            name: "Test Issuer",
            url: "https://test-issuer.example.com",
            email: "test@example.com",
          },
        })
        .returning();

      // Check if signing_keys table exists
      const signingKeysExist = await tableExists("signing_keys");
      if (signingKeysExist) {
        // Add test signing keys - convert binary keys to base58 strings
        await db.insert(signingKeys).values({
          issuerId: issuer.issuerId,
          publicKeyMultibase: base58.encode(TEST_KEYS.publicKey),
          privateKeyMultibase: base58.encode(TEST_KEYS.privateKey),
          controller: "did:key:test",
          keyInfo: {
            "@context": ["https://w3id.org/security/v2"],
            id: "did:key:test#key-1",
            type: "Ed25519VerificationKey2020",
            controller: "did:key:test",
          },
          revoked: false,
        });
      }
    }

    console.log("Test data seeded successfully");
  } catch (error) {
    console.error("Error seeding test data:", error);
    // Don't throw, just log and continue
  }
}

console.log("✅ Integration test setup complete");
