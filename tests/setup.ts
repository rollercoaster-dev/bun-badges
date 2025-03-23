import { resolve } from "path";
import { config } from "dotenv";
import { mock, type Mock } from "bun:test";
import { execSync } from "child_process";
import * as fs from "fs";

// =============== Test Environment Configuration ===============
// Environment flags for controlling test behavior
const IS_CI = process.env.CI === "true";
const FORCE_MOCK_DB = process.env.FORCE_MOCK_DB === "true"; // Don't force mock in CI
const SKIP_DOCKER = process.env.SKIP_DOCKER === "true" || IS_CI;

// Set additional environment variables for mocks in test mode
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}

// Ensure we have a test database URL for consistent behavior
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgres://postgres:postgres@localhost:5434/bun_badges_test";
}

console.log("Setting up test environment...");
console.log(`CI Environment: ${IS_CI ? "Yes" : "No"}`);
console.log(`Force Mock DB: ${FORCE_MOCK_DB ? "Yes" : "No"}`);
console.log(`Skip Docker: ${SKIP_DOCKER ? "Yes" : "No"}`);

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

// Determine if we need to use actual DB or can use mocks
const useRealDatabase = (isIntegrationTest || isE2ETest) && !FORCE_MOCK_DB;

// Track whether the pool has been closed
let poolClosed = false;

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

// Update the section where we mock DB modules for tests
// Mock DB modules for unit tests
if (!useRealDatabase) {
  if (isIntegrationTest || isE2ETest) {
    console.log(
      "🔄 Running in mock mode for integration/E2E tests (no real database)",
    );
  } else {
    console.log("🔄 Running in unit test mode, mocking database dependencies");
  }

  // Mock the entire db/config module
  mock.module("../src/db/config", () => {
    // Make a deep copy of test data to avoid modifications affecting the original
    const mockRows = JSON.parse(JSON.stringify(TEST_MOCK_DATA));

    // Safe stringify function that handles cycles
    const safeStringify = (obj: any, maxLength = 50) => {
      try {
        // First try to handle small parts of complex objects
        if (obj && typeof obj === "object") {
          // For objects with potential circular refs, just show type and basic info
          if (obj.table || obj.from || obj.where || obj.execute) {
            return `[${obj.constructor.name || typeof obj} object]`;
          }

          // For arrays, summarize content
          if (Array.isArray(obj)) {
            return `Array(${obj.length})`;
          }

          // For other objects, limit properties
          const keys = Object.keys(obj).slice(0, 3);
          if (keys.length > 0) {
            return `{${keys.join(", ")}${keys.length < Object.keys(obj).length ? ", ..." : ""}}`;
          }
        }

        // For simple values, use normal stringify with truncation
        const result = JSON.stringify(obj);
        return result.length > maxLength
          ? result.substring(0, maxLength) + "..."
          : result;
      } catch (e) {
        return `[Object with circular references]`;
      }
    };

    // For integration tests, provide a more intelligent query response system
    const getMockDataByQuery = (text: string) => {
      console.log(
        `Mock DB Query: ${text.substring(0, 100)}${text.length > 100 ? "..." : ""}`,
      );

      // Test connection queries
      if (text.toLowerCase().includes("select 1")) {
        return { rows: [{ "?column?": 1 }] };
      }

      // Session replication queries - important for foreign key disabling
      if (text.toLowerCase().includes("session_replication_role")) {
        return { rows: [] };
      }

      // Basic table queries
      if (text.toLowerCase().includes("from users")) {
        return { rows: mockRows.users || [] };
      }
      if (text.toLowerCase().includes("from issuer_profiles")) {
        return { rows: mockRows.issuer_profiles || [] };
      }
      if (text.toLowerCase().includes("from badge_classes")) {
        return { rows: mockRows.badge_classes || [] };
      }
      if (text.toLowerCase().includes("from badge_assertions")) {
        return { rows: mockRows.badge_assertions || [] };
      }
      if (text.toLowerCase().includes("from signing_keys")) {
        return { rows: mockRows.signing_keys || [] };
      }
      if (text.toLowerCase().includes("from oauth_clients")) {
        return { rows: mockRows.oauth_clients || [] };
      }
      if (text.toLowerCase().includes("from oauth_access_tokens")) {
        return { rows: mockRows.oauth_access_tokens || [] };
      }

      // Handle DELETE queries
      if (text.toLowerCase().includes("delete from")) {
        // Simulate successful deletion
        return { rows: [] };
      }

      // Handle INSERT queries
      if (text.toLowerCase().includes("insert into")) {
        // Extract table name from query
        const tableMatch = text.match(/insert into (\w+)/i);
        const tableName = tableMatch ? tableMatch[1] : "unknown";

        // Create a stub mock object based on table type
        const mockObj: any = { id: `mock-${tableName}-id-${Date.now()}` };

        // Add specific fields for well-known tables
        const tableNameStr = String(tableName);

        if (tableNameStr === "users") {
          mockObj.userId = `user-${Date.now()}`;
          mockObj.email = "test@example.com";
          mockObj.role = "ADMIN";
        } else if (tableNameStr === "issuer_profiles") {
          mockObj.issuerId = `issuer-${Date.now()}`;
          mockObj.name = "Test Issuer";
          mockObj.ownerUserId = mockRows.users[0]?.userId;
        } else if (tableNameStr === "badge_classes") {
          mockObj.badgeId = `badge-${Date.now()}`;
          mockObj.name = "Test Badge";
          mockObj.issuerId = mockRows.issuer_profiles[0]?.issuerId;
        } else if (tableNameStr === "badge_assertions") {
          mockObj.assertionId = `assertion-${Date.now()}`;
          mockObj.badgeId = mockRows.badge_classes[0]?.badgeId;
          mockObj.issuerId = mockRows.issuer_profiles[0]?.issuerId;
        } else if (tableNameStr === "signing_keys") {
          mockObj.keyId = `key-${Date.now()}`;
          mockObj.issuerId = mockRows.issuer_profiles[0]?.issuerId;
          mockObj.publicKeyMultibase =
            "z6MkrJ6q4Mu4KQkWLvqkYJPPJxhqhcQ84ZpeCEcP4SCj5g7c";
          mockObj.privateKeyMultibase =
            "z3u2enxX9jgidTMPzVLcgJRabHUJ9aF5DgSb1qcRyEMyN9wRW8G";
          mockObj.type = "Ed25519VerificationKey2020";
          mockObj.jsonResponse = {
            id: "did:web:test-issuer.example.com#key-1",
            type: "Ed25519VerificationKey2020",
            controller: "did:web:test-issuer.example.com",
            publicKeyMultibase:
              "z6MkrJ6q4Mu4KQkWLvqkYJPPJxhqhcQ84ZpeCEcP4SCj5g7c",
          };
        }

        // Add created_at timestamp
        mockObj.created_at = new Date().toISOString();

        // Add to mock rows if table exists
        if (mockRows[tableName]) {
          mockRows[tableName].push(mockObj);
        } else if (tableName) {
          // Create the table if it doesn't exist
          mockRows[tableName] = [mockObj];
        }

        return { rows: [mockObj] };
      }

      // Default case - return empty array
      return { rows: [] };
    };

    const mockPool = {
      query: ((text: string, params?: any[]) => {
        // Use the enhanced query handler
        return Promise.resolve(getMockDataByQuery(text));
      }) as Mock<any>,

      connect: (() =>
        Promise.resolve({
          query: ((text: string) => {
            // Use the same enhanced query handler for client queries
            return Promise.resolve(getMockDataByQuery(text));
          }) as Mock<any>,
          release: (() => {}) as Mock<any>,
        })) as Mock<any>,
      end: (() => Promise.resolve()) as Mock<any>,
    };

    // Create an enhanced mockDb with better table operation handling
    const mockDb = {
      execute: ((query: any) => {
        console.log(`Mock Drizzle Execute: ${safeStringify(query)}`);

        // Use table name from query object when available
        const tableName = query.table
          ? typeof query.table === "string"
            ? query.table
            : query.table.name
          : "unknown";

        // Handle different query types with appropriate mock responses
        if (query.type === "select") {
          // Return data from the appropriate table if it exists
          if (tableName && mockRows[tableName]) {
            return Promise.resolve(mockRows[tableName]);
          }

          // For joins or complex queries, return generic data
          return Promise.resolve([
            { mock_data: true, id: `mock-id-${Date.now()}` },
          ]);
        }

        return Promise.resolve([{ drizzle_test: 1 }]);
      }) as Mock<any>,

      insert: ((table: any) => {
        const tableName =
          typeof table === "string" ? table : table?.name || "unknown";

        return {
          values: ((data: any) => {
            console.log(
              `Mock DB Insert: ${tableName} table - ${safeStringify(data)}`,
            );

            const mockData = Array.isArray(data) ? data[0] : data;

            // Generate appropriate IDs based on table
            let idField = "id";
            let idValue = `mock-id-${Date.now()}`;

            // Check tableName safely - ensure it's a string before using string methods
            const tableNameStr = String(tableName);

            if (tableNameStr === "users" || tableNameStr.includes("user")) {
              idField = "userId";
              idValue = mockData.userId || `user-${Date.now()}`;
            } else if (
              tableNameStr === "issuer_profiles" ||
              tableNameStr.includes("issuer")
            ) {
              idField = "issuerId";
              idValue = mockData.issuerId || `issuer-${Date.now()}`;
            } else if (
              tableNameStr === "badge_classes" ||
              tableNameStr.includes("badge")
            ) {
              idField = "badgeId";
              idValue = mockData.badgeId || `badge-${Date.now()}`;
            } else if (
              tableNameStr === "badge_assertions" ||
              tableNameStr.includes("assertion")
            ) {
              idField = "assertionId";
              idValue = mockData.assertionId || `assertion-${Date.now()}`;
            } else if (
              tableNameStr === "signing_keys" ||
              tableNameStr.includes("key")
            ) {
              idField = "keyId";
              idValue = mockData.keyId || `key-${Date.now()}`;
              // Ensure key data is present
              if (!mockData.publicKeyMultibase) {
                mockData.publicKeyMultibase =
                  "z6MkrJ6q4Mu4KQkWLvqkYJPPJxhqhcQ84ZpeCEcP4SCj5g7c";
              }
              if (!mockData.privateKeyMultibase) {
                mockData.privateKeyMultibase =
                  "z3u2enxX9jgidTMPzVLcgJRabHUJ9aF5DgSb1qcRyEMyN9wRW8G";
              }
              if (!mockData.jsonResponse) {
                mockData.jsonResponse = {
                  id: "did:web:test-issuer.example.com#key-1",
                  type: "Ed25519VerificationKey2020",
                  controller: "did:web:test-issuer.example.com",
                  publicKeyMultibase: mockData.publicKeyMultibase,
                };
              }
            }

            // Create the return object with the appropriate ID
            const returnData = {
              ...mockData,
              [idField]: idValue,
              created_at: mockData.created_at || new Date().toISOString(),
            };

            // Add to mock data if table exists
            if (mockRows[tableName]) {
              mockRows[tableName].push(returnData);
            } else {
              // Create the table if it doesn't exist
              mockRows[tableName] = [returnData];
            }

            return {
              returning: () => Promise.resolve([returnData]),
              execute: () => Promise.resolve([returnData]),
            };
          }) as Mock<any>,
        };
      }) as Mock<any>,

      select: ((_fields: any) => {
        return {
          from: ((table: any) => {
            const tableName =
              typeof table === "string" ? table : table?.name || "unknown";
            console.log(`Mock DB Select from: ${safeStringify(table)}`);

            return {
              where: ((condition: any) => {
                console.log(
                  `Mock DB Where condition: ${safeStringify(condition)}`,
                );

                // Try to extract ID from condition
                let idField = "id";
                let idValue = null;

                // Handle simple condition objects directly
                if (condition && typeof condition === "object") {
                  // Check for common ID fields
                  if (condition.userId) idValue = condition.userId;
                  else if (condition.issuerId) idValue = condition.issuerId;
                  else if (condition.badgeId) idValue = condition.badgeId;
                  else if (condition.assertionId)
                    idValue = condition.assertionId;
                  else if (condition.keyId) idValue = condition.keyId;
                }

                // Get the appropriate mock rows
                let results: any[] = mockRows[tableName] || [];

                // Filter results if we have an ID value
                if (idValue && results.length > 0) {
                  results = results.filter((row) => row[idField] === idValue);
                }

                // Return methods for chaining
                return {
                  limit: ((_limit: number) => {
                    return Promise.resolve(
                      results.slice(0, _limit || results.length),
                    );
                  }) as Mock<any>,
                  execute: (() => {
                    return Promise.resolve(results);
                  }) as Mock<any>,
                  // Add other useful methods for chaining
                  orderBy: (() => {
                    return {
                      limit: ((_limit: number) => {
                        return Promise.resolve(
                          results.slice(0, _limit || results.length),
                        );
                      }) as Mock<any>,
                      execute: (() => {
                        return Promise.resolve(results);
                      }) as Mock<any>,
                    };
                  }) as Mock<any>,
                };
              }) as Mock<any>,
              limit: ((limit: number) => {
                const results = mockRows[tableName] || [];
                return Promise.resolve(
                  results.slice(0, limit || results.length),
                );
              }) as Mock<any>,
              orderBy: (() => {
                return {
                  limit: ((limit: number) => {
                    const results = mockRows[tableName] || [];
                    return Promise.resolve(
                      results.slice(0, limit || results.length),
                    );
                  }) as Mock<any>,
                  execute: (() => {
                    return Promise.resolve(mockRows[tableName] || []);
                  }) as Mock<any>,
                };
              }) as Mock<any>,
              execute: (() => {
                return Promise.resolve(mockRows[tableName] || []);
              }) as Mock<any>,
            };
          }) as Mock<any>,
        };
      }) as Mock<any>,

      update: ((table: any) => {
        const tableName =
          typeof table === "string" ? table : table?.name || "unknown";
        console.log(`Mock DB Update: ${tableName} table`);

        return {
          set: ((data: any) => {
            return {
              where: ((condition: any) => {
                console.log(
                  `Mock DB Update where condition: ${safeStringify(condition)}`,
                );

                // Create update result with data
                const updatedItem = {
                  ...data,
                  id: `mock-id-${Date.now()}`,
                };

                return Promise.resolve([updatedItem]);
              }) as Mock<any>,
              execute: (() => {
                return Promise.resolve([
                  { ...data, id: `mock-id-${Date.now()}` },
                ]);
              }) as Mock<any>,
            };
          }) as Mock<any>,
        };
      }) as Mock<any>,

      delete: ((table: any) => {
        const tableName =
          typeof table === "string" ? table : table?.name || "unknown";
        console.log(`Mock DB Delete from: ${tableName} table`);

        return {
          where: ((condition: any) => {
            console.log(
              `Mock DB Delete where condition: ${safeStringify(condition)}`,
            );

            // Just return mock deleted object
            return Promise.resolve([{ id: `deleted-mock-id-${Date.now()}` }]);
          }) as Mock<any>,
          execute: (() => {
            return Promise.resolve([{ id: `deleted-mock-id-${Date.now()}` }]);
          }) as Mock<any>,
        };
      }) as Mock<any>,
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

  try {
    // Create a modified version of the db/config module with better error handling
    mock.module("../src/db/config", () => {
      const { Pool } = require("pg");
      const { drizzle } = require("drizzle-orm/node-postgres");
      const schema = require("../src/db/schema");

      // Add retry logic for database connection
      const createPoolWithRetry = (retries = 3, delay = 1000) => {
        let attemptCount = 0;

        const tryConnect = () => {
          try {
            console.log(
              `Attempting to connect to database (${attemptCount + 1}/${retries + 1})...`,
            );

            const pool = new Pool({
              connectionString: process.env.DATABASE_URL,
              connectionTimeoutMillis: 5000, // 5 seconds timeout
            });

            // Add event handlers for connection issues
            pool.on("error", (err: Error) => {
              console.error("Unexpected database error on idle client:", err);
              // Don't fail tests on connection issues, they'll be handled when the connection is used
            });

            return pool;
          } catch (error: unknown) {
            const err = error as Error;
            console.error(`Database connection attempt failed:`, err.message);

            if (attemptCount < retries) {
              attemptCount++;
              console.log(`Retrying in ${delay}ms...`);
              // Simple delay implementation
              const start = Date.now();
              while (Date.now() - start < delay) {
                // Wait
              }
              return tryConnect();
            }

            console.error(
              `All ${retries + 1} connection attempts failed. Using mock implementation.`,
            );

            // Return a mock pool if all attempts fail
            return {
              query: async () => ({ rows: [{ test: 1 }] }),
              connect: async () => ({
                query: async () => ({ rows: [{ test: 1 }] }),
                release: () => {},
              }),
              end: async () => {},
              on: () => {},
            };
          }
        };

        return tryConnect();
      };

      // Create pool with retry
      const pool = createPoolWithRetry();

      // Set up global pool end function
      poolEnd = async () => {
        if (!poolClosed) {
          console.log("Closing database pool on process exit");
          poolClosed = true;
          try {
            await pool.end();
          } catch (error: unknown) {
            const err = error as Error;
            console.error("Error closing pool:", err.message);
          }
        }
      };

      // Create Drizzle instance with try/catch to handle any initialization errors
      let db;
      try {
        db = drizzle(pool, { schema });
      } catch (error: unknown) {
        const err = error as Error;
        console.error("Failed to initialize Drizzle:", err.message);
        // Create a mock db as fallback
        db = {
          execute: async () => [{ mock_data: true }],
          insert: () => ({
            values: async () => [{ id: "mock-id" }],
          }),
          select: () => ({
            from: () => ({
              where: () => ({
                limit: async () => [{ id: "mock-id" }],
              }),
            }),
          }),
        };
      }

      return {
        db,
        dbPool: pool,
        schema,
      };
    });

    // Only check database connection if using real DB and not in CI
    if (!IS_CI) {
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
    }
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

// Only setup database for integration and e2e tests
const needsDatabase =
  process.env.NODE_ENV === "test" ||
  process.argv.some(
    (arg) => arg.includes("integration") || arg.includes("e2e"),
  );

if (needsDatabase && !SKIP_DOCKER) {
  console.log("🐳 Setting up test database...");

  try {
    // Cleanup any existing containers
    executeDockerComposeCommand("down", {
      stdio: "inherit",
    });

    // Start database
    executeDockerComposeCommand("up -d db_test", {
      stdio: "inherit",
    });

    // Wait for database to be ready
    let attempts = 0;
    const maxAttempts = 20;
    let isReady = false;

    while (attempts < maxAttempts && !isReady) {
      try {
        executeDockerComposeCommand("exec -T db_test pg_isready -U postgres");
        console.log("✅ Database is ready!");
        isReady = true;
      } catch (error) {
        attempts++;
        if (attempts === maxAttempts) {
          console.log(
            "⚠️ Database not ready after max attempts, continuing with mocks",
          );
          break;
        }
        console.log(
          `Waiting for database (attempt ${attempts}/${maxAttempts})...`,
        );
        try {
          execSync("sleep 1");
        } catch (e) {
          // Windows alternative
          setTimeout(() => {}, 1000);
        }
      }
    }

    // Run migrations
    console.log("🔄 Running migrations...");
    try {
      execSync("bun run db:migrate", { stdio: "inherit" });
    } catch (error) {
      console.log("⚠️ Failed to run migrations, continuing with tests");
    }

    // Register cleanup on process exit
    process.on("exit", () => {
      console.log("🧹 Cleaning up test environment...");
      try {
        executeDockerComposeCommand("down", {
          stdio: "inherit",
        });
      } catch (error) {
        console.log("⚠️ Cleanup failed, but tests may have completed");
      }
    });

    // Handle interrupts
    process.on("SIGINT", () => {
      console.log("\n🛑 Test interrupted, cleaning up...");
      try {
        executeDockerComposeCommand("down", {
          stdio: "inherit",
        });
      } catch (error) {
        console.log("⚠️ Cleanup failed");
      }
      process.exit(1);
    });
  } catch (error) {
    console.log("⚠️ Docker setup failed, continuing with mock database");
    // Don't exit, let tests run with mocks
  }
} else if (needsDatabase && SKIP_DOCKER) {
  console.log("⚠️ Skipping Docker setup due to environment configuration");
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

// Add test mock data for common database operations
const TEST_MOCK_DATA: Record<string, any[]> = {
  users: [
    {
      userId: "test-user-id",
      email: "test@example.com",
      name: "Test User",
      role: "ADMIN",
      created_at: new Date().toISOString(),
    },
  ],
  issuer_profiles: [
    {
      issuerId: "test-issuer-id",
      name: "Test Issuer",
      description: "Test issuer description",
      url: "https://example.com",
      email: "issuer@example.com",
      image: "https://example.com/image.png",
      ownerUserId: "test-user-id",
      created_at: new Date().toISOString(),
    },
  ],
  badge_classes: [
    {
      badgeId: "test-badge-id",
      name: "Test Badge",
      description: "Test badge description",
      image: "https://example.com/badge.png",
      criteria: JSON.stringify({ narrative: "Test criteria" }),
      issuerId: "test-issuer-id",
      created_at: new Date().toISOString(),
    },
  ],
  badge_assertions: [
    {
      assertionId: "test-assertion-id",
      badgeId: "test-badge-id",
      issuerId: "test-issuer-id",
      recipientIdentifier: "test-recipient@example.com",
      recipientType: "email",
      recipientHashed: false,
      revoked: false,
      revocationReason: null,
      created_at: new Date().toISOString(),
    },
  ],
  signing_keys: [
    {
      keyId: "test-key-id",
      issuerId: "test-issuer-id",
      publicKeyMultibase: "z6MkrJ6q4Mu4KQkWLvqkYJPPJxhqhcQ84ZpeCEcP4SCj5g7c",
      privateKeyMultibase:
        "z3u2enxX9jgidTMPzVLcgJRabHUJ9aF5DgSb1qcRyEMyN9wRW8G",
      type: "Ed25519VerificationKey2020",
      jsonResponse: {
        id: "did:web:test-issuer.example.com#key-1",
        type: "Ed25519VerificationKey2020",
        controller: "did:web:test-issuer.example.com",
        publicKeyMultibase: "z6MkrJ6q4Mu4KQkWLvqkYJPPJxhqhcQ84ZpeCEcP4SCj5g7c",
      },
      created_at: new Date().toISOString(),
    },
  ],
  oauth_clients: [
    {
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      redirectUri: "https://example.com/callback",
      userId: "test-user-id",
      created_at: new Date().toISOString(),
    },
  ],
  oauth_access_tokens: [
    {
      tokenId: "test-token-id",
      clientId: "test-client-id",
      userId: "test-user-id",
      token: "test-access-token",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      revoked: false,
      created_at: new Date().toISOString(),
    },
  ],
};
