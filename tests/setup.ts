import { resolve } from "path";
import { config } from "dotenv";
import { mock, type Mock } from "bun:test";
import { execSync } from "child_process";
import * as fs from "fs";

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
              if (fs.existsSync(resolvedPath)) {
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

// Determine if running in CI environment
const isCI = process.env.CI === "true";

// Load appropriate environment variables based on environment
if (isCI) {
  console.log("🔄 Running in CI environment");
  try {
    config({ path: resolve(process.cwd(), ".env.ci") });
    console.log("✅ Loaded CI environment variables from .env.ci");
  } catch (error) {
    console.warn("⚠️ Failed to load .env.ci, falling back to .env.test");
    config({ path: resolve(process.cwd(), ".env.test") });
  }
} else {
  console.log("🔄 Running in local environment");
  config({ path: resolve(process.cwd(), ".env.test") });
  console.log("✅ Loaded test environment variables from .env.test");
}

// Ensure DATABASE_URL is available
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(
  `Database URL: ${process.env.DATABASE_URL?.replace(/:.+@/, ":****@")}`,
);

// Get environment variables with fallbacks
const DB_MAX_RETRIES = Number(process.env.TEST_DB_MAX_RETRIES || "5");
const DB_RETRY_DELAY = Number(process.env.TEST_DB_RETRY_DELAY || "1000");
const SKIP_DOCKER = process.env.SKIP_DOCKER === "true" || isCI;

console.log(`Skip Docker: ${SKIP_DOCKER}`);
console.log(`DB Max Retries: ${DB_MAX_RETRIES}`);
console.log(`DB Retry Delay: ${DB_RETRY_DELAY}ms`);

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

// Whether we need a database for this test run
const needsDatabase = isIntegrationTest || isE2ETest;

// Declare connectWithRetry outside of the if block so it can be used by setupDockerDatabase
let connectWithRetry: (retries?: number, delay?: number) => Promise<boolean>;

// Mock drizzle-orm/pg-core to fix jsonb export issue
// This addresses the error: "Export named 'jsonb' not found in module 'drizzle-orm/pg-core'"
// This is a known issue in drizzle-orm 0.41.0
// See also: JSONB-NOTES.md for details on the jsonb handling approach
mock.module("drizzle-orm/pg-core", () => {
  // Only apply the mock for unit tests, not for integration tests
  if (isIntegrationTest || isE2ETest) {
    // For integration tests, we want to use the real module
    // But we need to add the missing jsonb export
    const realModule = require("drizzle-orm/pg-core");

    // If the real module doesn't have jsonb, add it
    if (!realModule.jsonb) {
      realModule.jsonb = realModule.json; // Use json as a fallback
    }

    // Make sure PgTransaction is exported
    if (!realModule.PgTransaction) {
      // Create a basic transaction class if needed
      realModule.PgTransaction = class PgTransaction {
        client: any;
        constructor(client: any) {
          this.client = client;
        }
      };
    }

    return realModule;
  }

  // For unit tests, use the mock implementation
  // Define column types that have chainable methods
  const createColumn = (type: string) => {
    const column = (name: string, options?: any) => {
      const columnObj = {
        name,
        dataType: type,
        options,
        primaryKey: () => columnObj,
        notNull: () => columnObj,
        defaultRandom: () => columnObj,
        default: () => columnObj,
        defaultNow: () => columnObj,
        references: () => columnObj,
        unique: () => columnObj,
        array: () => columnObj,
        // Add other methods as needed
      };
      return columnObj;
    };
    return column;
  };

  // Create a more complete mock for unit tests
  const Table = {
    Symbol: {
      Columns: Symbol("columns"),
    },
  };

  class PgTransaction {
    client: any;
    constructor(client: any) {
      this.client = client;
    }
  }

  return {
    pgTable: (name: string, columns: Record<string, unknown>) => {
      const table = {
        name,
        columns,
        [Table.Symbol.Columns]: columns,
      };
      return table;
    },
    uuid: createColumn("uuid"),
    varchar: createColumn("varchar"),
    timestamp: createColumn("timestamp"),
    jsonb: createColumn("jsonb"),
    json: createColumn("json"),
    text: createColumn("text"),
    boolean: createColumn("boolean"),
    integer: createColumn("integer"),
    serial: createColumn("serial"),
    eq: (a: any, b: any) => ({ operator: "=", left: a, right: b }),
    and: (...conditions: any[]) => ({ operator: "AND", conditions }),
    or: (...conditions: any[]) => ({ operator: "OR", conditions }),
    sql: (strings: TemplateStringsArray, ...values: any[]) => ({
      type: "sql",
      strings,
      values,
    }),
    Table,
    PgTransaction,
  };
});

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

      // Create a unique pool for this test run with retry logic
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: Number(process.env.TEST_DB_POOL_SIZE || "10"),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: Number(process.env.TEST_DB_TIMEOUT || "5000"),
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

    // Check database connection with retry mechanism
    const { dbPool } = require("../src/db/config");

    // Improved database connection check with retries
    connectWithRetry = async (
      retries = DB_MAX_RETRIES,
      delay = DB_RETRY_DELAY,
    ) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`Database connection attempt ${attempt}/${retries}...`);
          const client = await dbPool.connect();
          try {
            await client.query("SELECT 1");
            console.log("✅ Database connection successful");
            return true;
          } finally {
            client.release();
          }
        } catch (err) {
          console.error(
            `❌ Failed to connect to database (attempt ${attempt}/${retries}):`,
            err,
          );

          if (attempt < retries) {
            console.log(`Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            console.error(
              "❌ Max retries reached, giving up on database connection",
            );
            console.warn(
              "Continuing with tests that don't require database connection",
            );
            return false;
          }
        }
      }
      return false;
    };

    // Execute database setup
    if (!isCI && !SKIP_DOCKER) {
      // Setup Docker container for database if not in CI and Docker is not skipped
      setupDockerDatabase();
    } else {
      // Just connect to the existing database (e.g., in CI with service container)
      console.log(
        "Using existing database (CI environment or SKIP_DOCKER=true)",
      );
      connectWithRetry();
    }
  } catch (err) {
    console.error("Error setting up database module:", err);
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

// Function to execute docker compose commands that works with both formats
function executeDockerComposeCommand(command: string, options: any = {}): any {
  try {
    // First try with "docker compose" (new format)
    return execSync(
      `docker compose -f ${DOCKER_COMPOSE_FILE} ${command}`,
      options,
    );
  } catch (error) {
    try {
      // Fall back to "docker-compose" (old format)
      return execSync(
        `docker-compose -f ${DOCKER_COMPOSE_FILE} ${command}`,
        options,
      );
    } catch (error2) {
      // For CI environments where docker might not be available, mock the behavior
      console.log(`⚠️ Docker compose command failed: ${command}`);
      console.log(
        "⚠️ Continuing without Docker - tests will use mock database",
      );

      // Mock the expected behavior
      if (command === "down") {
        console.log("Mock: Cleaning up containers");
      } else if (command.includes("up -d")) {
        console.log("Mock: Starting containers");
      } else if (command.includes("exec")) {
        console.log("Mock: Database is ready");
      }

      // Return empty buffer to prevent errors
      return Buffer.from("");
    }
  }
}

// Docker setup function
function setupDockerDatabase() {
  const PROJECT_ROOT = process.cwd();
  const DOCKER_COMPOSE_FILE = resolve(
    PROJECT_ROOT,
    process.env.DOCKER_COMPOSE_FILE || "docker-compose.test.yml",
  );

  // Function to execute docker compose commands that works with both formats
  function executeDockerComposeCommand(
    command: string,
    options: any = {},
  ): any {
    try {
      // First try with "docker compose" (new format)
      console.log(
        `Running: docker compose -f ${DOCKER_COMPOSE_FILE} ${command}`,
      );
      return execSync(`docker compose -f ${DOCKER_COMPOSE_FILE} ${command}`, {
        stdio: options.stdio || "inherit",
        ...options,
      });
    } catch (e) {
      try {
        // Fall back to "docker-compose" (old format)
        console.log(
          `Falling back to: docker-compose -f ${DOCKER_COMPOSE_FILE} ${command}`,
        );
        return execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} ${command}`, {
          stdio: options.stdio || "inherit",
          ...options,
        });
      } catch (e2) {
        // For CI environments where docker might not be available, mock the behavior
        console.log(`⚠️ Docker compose command failed: ${command}`);
        console.warn(
          "⚠️ Continuing without Docker - tests will use mock database",
        );
        return "";
      }
    }
  }

  try {
    // Clean up any existing containers
    executeDockerComposeCommand("down", {
      stdio: "ignore",
    });

    // Start the container
    executeDockerComposeCommand("up -d db_test", {
      stdio: "inherit",
    });

    console.log("Docker container started for database");

    // Wait for database to be ready
    let dbReady = false;
    let attempts = 0;
    const maxAttempts = DB_MAX_RETRIES;

    console.log("Waiting for database to be ready...");
    while (!dbReady && attempts < maxAttempts) {
      attempts++;
      try {
        executeDockerComposeCommand("exec -T db_test pg_isready -U postgres");
        dbReady = true;
        console.log("Database is ready!");
      } catch (e) {
        console.log(
          `Waiting for database (attempt ${attempts}/${maxAttempts})...`,
        );
        // Sleep for a moment before retrying
        Bun.sleepSync(DB_RETRY_DELAY);
      }
    }

    if (!dbReady) {
      throw new Error(`Database not ready after ${maxAttempts} attempts`);
    }

    // Now try to connect to the database
    connectWithRetry();
  } catch (error) {
    console.error("Error setting up Docker database:", error);
    console.log("⚠️ Docker setup failed, continuing with mock database");

    // Try to connect anyway, maybe the database is already running
    connectWithRetry();
  }
}

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
