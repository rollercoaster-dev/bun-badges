import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";
import { createTestPool } from "./pool-manager";
import path from "path";
import { spawnSync } from "child_process";

/**
 * Creates a new database connection for a specific test file
 * with automatic pool management
 */
export function createTestDatabaseConnection(testFile: string) {
  // Get calling file name if not provided
  if (!testFile) {
    const stack = new Error().stack;
    const callerLine = stack?.split("\n")[2] || "";
    const match = callerLine.match(/at\s+(.+)\s+\((.+)\)/);
    if (match && match[2]) {
      testFile = path.basename(match[2]);
    } else {
      testFile = "unknown-test-file";
    }
  }

  // Create a pool with our pool manager
  const { pool, cleanup } = createTestPool(testFile);

  // Create Drizzle DB instance
  const db = drizzle(pool, { schema });

  // Return the managed resources
  return {
    pool,
    db,
    cleanup,

    // Helper method to run a migration for this specific database
    async runMigrations() {
      console.log(`Running migrations for test database (${testFile})...`);
      try {
        const result = spawnSync("bun", ["run", "db:push"], {
          env: {
            ...process.env,
            NODE_ENV: "test",
            DATABASE_URL: process.env.DATABASE_URL,
          },
          stdio: "inherit",
        });

        if (result.status !== 0) {
          throw new Error(`Migration failed with status code ${result.status}`);
        }

        console.log("Migrations completed successfully");
        return true;
      } catch (err) {
        console.error("Migration failed:", err);
        throw err;
      }
    },

    // Helper to verify the pool is still active
    isPoolActive() {
      return !pool.ending;
    },

    // Helper to safely execute queries with error handling
    async safeQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
      try {
        if (pool.ending) {
          throw new Error("Cannot use a pool that is ending");
        }

        const result = await pool.query(sql, params);
        return result.rows as T[];
      } catch (err) {
        console.error("Query error:", err);
        throw err;
      }
    },
  };
}

/**
 * Utility to ensure database tables exist for tests
 */
export async function ensureTablesExist(pool: Pool): Promise<boolean> {
  try {
    // Check if tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    const tables = result.rows.map((row) => row.table_name);

    // Define required tables
    const requiredTables = ["users", "issuer_profiles", "credentials"];

    // Check if all required tables exist
    const missingTables = requiredTables.filter(
      (table) => !tables.includes(table),
    );

    if (missingTables.length > 0) {
      console.log(`Missing tables: ${missingTables.join(", ")}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error checking tables:", err);
    return false;
  }
}
