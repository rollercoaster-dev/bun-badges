import { resolve } from "path";
import { config } from "dotenv";
import { mock, type Mock } from "bun:test";

console.log("Setting up test environment...");

// Load test environment variables first
config({ path: resolve(process.cwd(), ".env.test") });

// Ensure DATABASE_URL is available
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(
  `Database URL: ${process.env.DATABASE_URL?.replace(/:.+@/, ":****@")}`,
);

// Create a shared poolEnd function that will be called at the very end
let poolEnd: () => Promise<void>;

// Determine if we're running integration or e2e tests that need DB
const isIntegrationTest =
  process.env.INTEGRATION_TEST === "true" || // Check environment variable first
  process.argv.some(
    (arg) => arg.includes("integration") || arg.includes("tests/integration"),
  );

const isE2ETest =
  process.env.E2E_TEST === "true" || // Check environment variable first
  process.argv.some((arg) => arg.includes("e2e") || arg.includes("tests/e2e"));

// Mock DB modules for unit tests
if (!isIntegrationTest && !isE2ETest) {
  console.log("🔄 Running in unit test mode, mocking database dependencies");

  // Mock the entire db/config module
  mock.module("../src/db/config", () => {
    // Create mock pool
    const mockPool = {
      query: (() =>
        Promise.resolve({
          rows: [{ test: 1, one: 1, drizzle_test: 1 }],
        })) as Mock<any>,
      connect: (() =>
        Promise.resolve({
          query: (() => Promise.resolve({ rows: [{ test: 1 }] })) as Mock<any>,
          release: (() => {}) as Mock<any>,
        })) as Mock<any>,
      end: (() => Promise.resolve()) as Mock<any>,
    };

    // Create mock db
    const mockDb = {
      execute: (() => Promise.resolve([{ drizzle_test: 1 }])) as Mock<any>,
    };

    // Set up the pool end function
    poolEnd = () => Promise.resolve();

    return {
      db: mockDb,
      dbPool: mockPool,
      schema: {},
    };
  });
} else {
  if (isIntegrationTest) {
    console.log("🔄 Running in integration test mode, using real database");
  } else {
    console.log("🔄 Running in E2E test mode, using real database");
  }

  // Import after mock setup to avoid circular dependencies
  try {
    // Create a modified version of the db/config module
    mock.module("../src/db/config", () => {
      const { Pool } = require("pg");
      const { drizzle } = require("drizzle-orm/node-postgres");
      const schema = require("../src/db/schema");

      // Create a unique pool for this test run
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      // Set up global pool end function
      poolEnd = async () => {
        console.log("Closing database pool...");
        await pool.end();
      };

      // Create Drizzle instance
      const db = drizzle(pool, { schema });

      return {
        db,
        dbPool: pool,
        schema,
      };
    });

    // Check database connection
    const { dbPool } = require("../src/db/config");

    // Check if DB connection is working
    async function checkDbConnection() {
      try {
        const client = await dbPool.connect();
        try {
          await client.query("SELECT 1");
          console.log("✅ Database connection successful");
        } finally {
          client.release();
        }
      } catch (err) {
        console.error("❌ Failed to connect to database:", err);
        console.warn(
          "Continuing with tests that don't require database connection",
        );
      }
    }

    // Execute setup
    checkDbConnection();
  } catch (err) {
    console.error("Error importing database module:", err);
    console.warn(
      "Continuing with tests that may not require database connection",
    );
  }
}

// When all tests complete, close the database pool
process.on("exit", () => {
  if (poolEnd) {
    // We can't use async here, but that's okay for cleanup
    try {
      console.log("Cleaning up database connections...");
      poolEnd();
    } catch (e) {
      console.error("Error cleaning up database connections:", e);
    }
  }
});

// This ensures tests have enough time to complete before timeout
process.env.BUN_TEST_TIMEOUT = process.env.BUN_TEST_TIMEOUT || "10000";

// Define test keys for deterministic crypto tests
export const TEST_KEYS = {
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
      _message: Uint8Array,
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
      decode: (_str: string): Uint8Array => {
        // Return test key for any base58 input
        return TEST_KEYS.publicKey.slice();
      },
      encode: (_bytes: Uint8Array): string => {
        // Return consistent base58 string
        return "TEST_BASE58_KEY";
      },
    },
  };
});

console.log("✅ Test setup complete");
