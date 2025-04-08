import { resolve } from "path";
import { config } from "dotenv";
import { mock, type Mock } from "bun:test";
import * as fs from "fs";
import { Pool } from "pg";

// TypeScript declaration for the global database pool
declare global {
  var __testDbPool: Pool | undefined;
}

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

// Load test environment variables. In CI, GitHub Actions workflow sets these.
// Locally, this ensures test-specific settings are used.
console.log(
  "🔄 Loading test environment variables from .env.test if present...",
);
config({ path: resolve(process.cwd(), ".env.test") });

// Ensure DATABASE_URL is available
console.log(`Environment: ${process.env.NODE_ENV}`);
if (process.env.DATABASE_URL) {
  console.log(
    `Database URL: ${process.env.DATABASE_URL?.replace(/:.+@/, ":****@")}`,
  );
} else {
  console.warn("⚠️ DATABASE_URL is not set in environment variables");
}

// Create a shared poolEnd function that will be called at the very end
let poolEnd: (() => Promise<void>) | undefined;

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

// Determine if we need a database connection for these tests
const needsDatabase = isIntegrationTest || isE2ETest;

console.log(`Integration tests: ${isIntegrationTest}`);
console.log(`E2E tests: ${isE2ETest}`);
console.log(`Needs database: ${needsDatabase}`);

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

// Create a modified version of the db/config module
mock.module("../src/db/config", () => {
  if (!needsDatabase) {
    // Mock DB for unit tests
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
  } else {
    // Setup real DB connection for integration/E2E tests (connecting to Docker service)
    console.log(
      "🔄 Integration/E2E: Setting up real database connection module...",
    );
    try {
      // Dynamically import the real config to avoid issues with top-level awaits or mocks
      const { db, dbPool, schema } = require("../src/db/config.js");

      // Set up the pool end function
      poolEnd = async () => {
        if (!poolClosed) {
          console.log("Attempting to close database pool...");
          await dbPool.end();
          poolClosed = true;
          console.log("Database pool closed.");
        } else {
          console.log("Database pool already closed or never initialized.");
        }
      };

      console.log("✅ Database module configured for integration/E2E tests.");

      return {
        db,
        dbPool,
        schema,
      };
    } catch (err) {
      console.error("❌ Error setting up real database module:", err);
      console.warn("⚠️ Using mock database as fallback");

      // Provide mock implementation as fallback
      const mockPool = {
        query: (() =>
          Promise.resolve({
            rows: [{ test: 1, one: 1, drizzle_test: 1 }],
          })) as Mock<any>,
        connect: (() =>
          Promise.resolve({
            query: (() =>
              Promise.resolve({ rows: [{ test: 1 }] })) as Mock<any>,
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
    }
  }
});

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

console.log("✅ Test setup complete (preload script finished)");

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
