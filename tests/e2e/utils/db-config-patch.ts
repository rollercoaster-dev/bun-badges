/**
 * Database Configuration Patch for E2E Tests
 *
 * This file patches the @/db/config module to ensure E2E tests can access
 * the database pool created during test setup.
 */

// This patch is needed because the original db/config module is mocked in tests/setup.ts,
// but E2E tests need to access the real pool.

import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../../src/db/schema";
import { Pool } from "pg";

// TypeScript declaration for the global pool
declare global {
  var __testDbPool: Pool | undefined;
}

// Create a pool directly if the global pool doesn't exist
let dbPool: Pool;

if (global.__testDbPool) {
  dbPool = global.__testDbPool;
} else {
  // Create a fallback pool
  dbPool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      "postgres://postgres:postgres@localhost:5434/bun_badges_test",
    max: Number(process.env.TEST_DB_POOL_SIZE || "10"),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: Number(process.env.TEST_DB_TIMEOUT || "5000"),
  });

  // Store it globally for other modules
  global.__testDbPool = dbPool;
}

// Create a Drizzle instance with the pool and schema
export const db = drizzle(dbPool, { schema });

// Export the pool and schema
export { dbPool, schema };
