import { resolve } from "path";
import { config } from "dotenv";
import { mock, type Mock } from "bun:test";
import { execSync } from "child_process";

console.log("Setting up test environment...");

// Setup path aliases for test files
const rootDir = process.cwd();

// This is the resolver function for module paths
// It will check for all @/ style imports and resolve them to the correct paths
// This fixes the "Cannot find module '@/...'" errors in the test files
Bun.plugin({
  name: "path-alias-resolver",
  setup(build) {
    // Create a map of all our path aliases from tsconfig
    const pathMappings = {
      "@/": [
        resolve(rootDir, "src/"),
        resolve(rootDir, "tests/"), // Also check in tests directory
      ],
      "@routes/": resolve(rootDir, "src/routes/"),
      "@controllers/": resolve(rootDir, "src/controllers/"),
      "@utils/": resolve(rootDir, "src/utils/"),
      "@models/": resolve(rootDir, "src/models/"),
      "@services/": resolve(rootDir, "src/services/"),
      "@middleware/": resolve(rootDir, "src/middleware/"),
      "@tests/": resolve(rootDir, "tests/"),
    };

    // Register a resolver for each path prefix
    Object.entries(pathMappings).forEach(([prefix, targetPath]) => {
      build.onResolve({ filter: new RegExp(`^${prefix}.*`) }, (args) => {
        const importPath = args.path;

        // If we have an array of potential paths, try each one
        if (Array.isArray(targetPath)) {
          for (const path of targetPath) {
            const resolvedPath = importPath.replace(prefix, `${path}/`);

            // Check if this resolved path exists (synchronously)
            try {
              if (Bun.file(resolvedPath).existsSync()) {
                return { path: resolvedPath };
              }
            } catch (e) {
              // Continue to the next potential path
            }
          }

          // If we reach here, try the first path as a fallback
          return { path: importPath.replace(prefix, `${targetPath[0]}/`) };
        } else {
          // Single path case - just replace directly as before
          return { path: importPath.replace(prefix, `${targetPath}/`) };
        }
      });
    });
  },
});

console.log("✅ Path aliases configured for tests");

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

// Track whether the pool has been closed
let poolClosed = false;

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
        if (!poolClosed) {
          console.log("Closing database pool...");
          poolClosed = true;
          await pool.end();
        }
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

// Also ensure we close the pool if the process is terminated
process.on("SIGINT", () => {
  if (poolEnd) {
    try {
      poolEnd().then(() => process.exit(0));
    } catch (e) {
      console.error("Error cleaning up database connections:", e);
      process.exit(1);
    }
  } else {
    process.exit(0);
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

const PROJECT_ROOT = resolve(__dirname, "..");
const DOCKER_COMPOSE_FILE = resolve(PROJECT_ROOT, "docker-compose.test.yml");

// Only setup database for integration and e2e tests
const needsDatabase =
  process.env.NODE_ENV === "test" ||
  process.argv.some(
    (arg) => arg.includes("integration") || arg.includes("e2e"),
  );

if (needsDatabase) {
  console.log("🐳 Setting up test database...");

  try {
    // Cleanup any existing containers
    execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} down`, {
      stdio: "inherit",
    });

    // Start database
    execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} up -d db_test`, {
      stdio: "inherit",
    });

    // Wait for database to be ready
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      try {
        execSync(
          `docker-compose -f ${DOCKER_COMPOSE_FILE} exec -T db_test pg_isready -U postgres`,
        );
        console.log("✅ Database is ready!");
        break;
      } catch (error) {
        attempts++;
        if (attempts === maxAttempts) {
          throw new Error("Database failed to start after 20 attempts");
        }
        console.log(
          `Waiting for database (attempt ${attempts}/${maxAttempts})...`,
        );
        execSync("sleep 1");
      }
    }

    // Run migrations
    console.log("🔄 Running migrations...");
    execSync("bun run db:migrate", { stdio: "inherit" });

    // Register cleanup on process exit
    process.on("exit", () => {
      console.log("🧹 Cleaning up test environment...");
      execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} down`, {
        stdio: "inherit",
      });
    });

    // Handle interrupts
    process.on("SIGINT", () => {
      console.log("\n🛑 Test interrupted, cleaning up...");
      execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} down`, {
        stdio: "inherit",
      });
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Failed to setup test environment:", error);
    process.exit(1);
  }
}

// Create a function that returns a chainable mock
const createChainableMock = () => {
  const handler = {
    get: (target: object, prop: string | symbol) => {
      if (prop === "array") {
        return () => new Proxy({}, handler);
      }
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
};

// Mock drizzle-orm/pg-core
mock.module("drizzle-orm/pg-core", () => {
  return {
    pgTable: () => createChainableMock(),
    serial: () => createChainableMock(),
    text: () => createChainableMock(),
    timestamp: () => createChainableMock(),
    boolean: () => createChainableMock(),
    json: () => createChainableMock(),
    uuid: () => createChainableMock(),
    integer: () => createChainableMock(),
    varchar: () => createChainableMock(),
    primaryKey: () => createChainableMock(),
    foreignKey: () => createChainableMock(),
    unique: () => createChainableMock(),
    index: () => createChainableMock(),
  };
});

// Mock the DatabaseService for tests that need database access
mock.module("@/services/db.service", () => {
  const dbMock = {
    insert: () => ({ values: () => Promise.resolve([]) }),
    select: () => ({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
    }),
  };

  return {
    DatabaseService: class {
      constructor() {
        // No initialization needed for mock
      }
      // Add any required methods that controllers might call
      db = dbMock;
    },
  };
});

// Set up test database if needed
try {
  // Check if we need to set up the test database
  const needsSetup = process.env.SETUP_TEST_DB === "true";
  if (needsSetup) {
    console.log("🔄 Setting up test database...");

    // Run database setup scripts
    execSync("bun run db:setup:test", { stdio: "inherit" });

    console.log("✅ Test database setup complete");
  }
} catch (error) {
  console.error("❌ Failed to setup test environment:", error);
  process.exit(1);
}

console.log("✅ Test setup complete");
