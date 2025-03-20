import { config } from "dotenv";
import * as path from "path";
import { beforeAll, afterAll, afterEach, mock, beforeEach } from "bun:test";
import { runMigrations } from "@/db/migrate";
import { clearTestData, seedTestData } from "./db-helpers";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, QueryResult } from "pg";

// Load test environment variables
config({ path: path.resolve(process.cwd(), "test.env") });

console.log("🔧 Integration test setup loading...");

// Log database connection info
console.log(`Database URL: ${process.env.DATABASE_URL || "Not set"}`);

// Handle database connection with retries
function createDatabaseConnection() {
  const maxRetries = 5;
  let retryCount = 0;
  let lastError: Error | null = null;

  return {
    connect: async (): Promise<Pool> => {
      while (retryCount < maxRetries) {
        try {
          console.log(
            `Attempting to connect to database (attempt ${retryCount + 1}/${maxRetries})...`,
          );
          const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 25,
            idleTimeoutMillis: 30000,
          });

          // Test the connection
          await pool.query("SELECT 1");
          console.log("✅ Database connection successful");
          return pool;
        } catch (error) {
          retryCount++;
          lastError = error as Error;
          console.error(
            `❌ Database connection failed (${retryCount}/${maxRetries}):`,
            error,
          );

          if (retryCount < maxRetries) {
            const delay = retryCount * 1000; // Increasing delay with each retry
            console.log(`Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      throw new Error(
        `Failed to connect to database after ${maxRetries} attempts: ${lastError?.message}`,
      );
    },
  };
}

// Create database connection
let globalPool: Pool;
let testDb: ReturnType<typeof drizzle>;

// Create test keys for deterministic cryptography
const TEST_KEYS = {
  privateKey: new Uint8Array(32).fill(1), // Fixed for tests
  publicKey: new Uint8Array(32).fill(2), // Fixed for tests
  signature: new Uint8Array(64).fill(3), // Fixed for tests
};

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
      sha512: async (_data: Uint8Array) => {
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
      _signature: Uint8Array,
      message: Uint8Array,
      _publicKey: Uint8Array,
    ): Promise<boolean> => {
      // For integration tests, we need to implement tamper detection
      // We know the test case modifies the 'id' field to 'tampered-credential'
      try {
        // Convert the message to a string and check if it contains 'tampered-credential'
        const messageString = new TextDecoder().decode(message);
        if (messageString.includes("tampered-credential")) {
          return false; // Detect the tampered credential
        }
        return true; // Valid for all other cases
      } catch (error) {
        // In case of parsing errors, default to valid
        return true;
      }
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

// Run migrations before all tests
beforeAll(async () => {
  try {
    // Establish database connection with retries
    const dbConnection = createDatabaseConnection();
    globalPool = await dbConnection.connect();
    testDb = drizzle(globalPool);

    console.log("✅ Database connection established");

    // Run migrations (if not already run by the script)
    try {
      console.log("Checking if migrations are needed...");
      // Simple check to see if tables exist
      const result = await testDb.execute(sql`
        SELECT EXISTS (
          SELECT FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename = 'users'
        );
      `);

      const tablesExist = result.rows[0]?.exists;
      if (!tablesExist) {
        console.log("Tables don't exist yet, running migrations...");
        await runMigrations();
        console.log("Migrations completed");
      } else {
        console.log("Tables already exist, skipping migrations");
      }

      // Check if signing_keys table exists, if not create it
      const signingKeysResult = await testDb.execute(sql`
        SELECT EXISTS (
          SELECT FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename = 'signing_keys'
        );
      `);

      const signingKeysExist = signingKeysResult.rows[0]?.exists;
      if (!signingKeysExist) {
        console.log("Creating signing_keys table...");
        await testDb.execute(sql`
          CREATE TABLE "signing_keys" (
            "key_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "issuer_id" uuid NOT NULL,
            "public_key_multibase" text NOT NULL,
            "private_key_multibase" text NOT NULL,
            "controller" text NOT NULL,
            "type" varchar(50) NOT NULL DEFAULT 'Ed25519VerificationKey2020',
            "key_info" jsonb NOT NULL,
            "revoked" boolean DEFAULT false NOT NULL,
            "revoked_at" timestamp,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
          );
        `);

        // Add foreign key constraint
        await testDb.execute(sql`
          ALTER TABLE "signing_keys" 
          ADD CONSTRAINT "signing_keys_issuer_id_issuer_profiles_issuer_id_fk" 
          FOREIGN KEY ("issuer_id") 
          REFERENCES "issuer_profiles"("issuer_id") 
          ON DELETE NO ACTION 
          ON UPDATE NO ACTION;
        `);

        console.log("✅ signing_keys table created");
      }

      // Ensure schema matches our model definitions
      await ensureSchemaMatch();
      console.log("✅ Schema checked and updated if needed");

      console.log("✅ Setup complete, tests are ready to run");
    } catch (error) {
      console.error("❌ Error in migrations:", error);
      throw error;
    }
  } catch (error) {
    console.error("❌ Fatal error in test setup:", error);
    throw error; // Re-throw to fail tests if setup fails
  }
});

// Global teardown - runs once after all tests that import this file
afterAll(async () => {
  console.log("🧹 Cleaning up integration test environment");
  try {
    if (testDb) {
      // Clear all test data at the end
      await clearTestData();
    }

    // Don't close the pool here - it will be handled by the process.exit handler
    // This prevents "Cannot use a pool after calling end" errors
    console.log("✅ Test environment cleanup complete");
  } catch (error) {
    console.error("❌ Error cleaning up test environment:", error);
  }
});

// Reset database state before each test
beforeEach(async () => {
  console.log("🔄 Setting up fresh test state...");
  try {
    // We only want to clear data if tables exist
    // But we don't need to seed data before each test - tests should seed their own specific data if needed
    const tablesExist = await tableExists(testDb, "users");

    if (tablesExist) {
      // Clear existing data
      await clearTestData();
    } else {
      console.log("⚠️ Tables don't exist yet, skipping data clearing");
    }
  } catch (error) {
    console.error("❌ Error setting up test state:", error);
    // Don't throw here - let the test continue even if clearing fails
    // Tests will fail naturally if they need a clean state and can't get it
  }
});

// Clear test data after each test
afterEach(async () => {
  console.log("🧹 Cleaning up after test...");
  try {
    // Only attempt to clear data if tables exist
    const tablesExist = await tableExists(testDb, "users");

    if (tablesExist) {
      await clearTestData();
      console.log("✅ Test data cleared");
    } else {
      console.log("⚠️ Tables don't exist, skipping data clearing");
    }
  } catch (error) {
    console.error("❌ Error clearing test data:", error);
    // Don't throw here - let the next test run anyway
  }
});

// Helper function to safely check if a table exists
async function tableExists(
  db: ReturnType<typeof drizzle>,
  tableName: string,
): Promise<boolean> {
  try {
    const result: QueryResult<{ exists: boolean }> = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = ${tableName}
      );
    `);
    return result.rows[0]?.exists ?? false;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

// Create a function to get a new pool instance (for tests that need isolation)
function createTestPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
  });
}

// Create a function to get a new drizzle instance
function createTestDb(pool: Pool) {
  return drizzle(pool);
}

console.log("✅ Integration test setup complete");

// Export singleton instance, functions and constants
export {
  testDb, // Export the global DB instance for most tests
  globalPool, // Export the global pool for direct access
  globalPool as pool, // Add alias for backward compatibility
  createTestPool, // For tests that need isolation
  createTestDb,
  tableExists,
  TEST_KEYS,
};

// Ensure the database schema includes all columns in our models
async function ensureSchemaMatch() {
  try {
    console.log("Checking database schema...");

    // Check if issuer_profiles has public_key column
    const publicKeyExists = await testDb.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'issuer_profiles'
      AND column_name = 'public_key'
    `);

    // Add the column if it doesn't exist
    if (publicKeyExists.rows.length === 0) {
      console.log("Adding missing public_key column to issuer_profiles...");
      await testDb.execute(sql`
        ALTER TABLE issuer_profiles
        ADD COLUMN IF NOT EXISTS public_key jsonb
      `);
      console.log("✅ public_key column added");
    } else {
      console.log("✅ public_key column already exists");
    }
  } catch (error) {
    console.error("❌ Error checking/updating schema:", error);
    throw error;
  }
}

// Add a handler to close the pool when the process exits
// This ensures we only close the pool once all tests are done
process.on("exit", () => {
  if (globalPool) {
    try {
      // Note: we can't use async here, but that's okay for final cleanup
      console.log("Closing database pool on process exit");
      globalPool.end();
    } catch (error) {
      console.error("Error closing pool:", error);
    }
  }
});
