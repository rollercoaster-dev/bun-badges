#!/usr/bin/env bun
/**
 * Run the headless OAuth migration
 *
 * This script runs the migration to add the isHeadless column to the oauth_clients table.
 * It respects the database environment variables.
 */

import { Pool } from "pg";
import "dotenv/config";

const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV || "development";

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set.");
  process.exit(1);
}

console.log(`Running migration in ${NODE_ENV} environment...`);
console.log(
  `Using database: ${DATABASE_URL.replace(/\/\/([^:]+):[^@]+@/, "//***:***@")}`,
);

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function runMigration() {
  try {
    // Test connection
    await pool.query("SELECT 1");
    console.log("✅ Connected to database");

    // Check if column exists
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'oauth_clients' AND column_name = 'is_headless'
    `);

    if (result.rows.length === 0) {
      console.log("Adding is_headless column to oauth_clients table...");

      // Add column
      await pool.query(`
        ALTER TABLE oauth_clients 
        ADD COLUMN is_headless BOOLEAN NOT NULL DEFAULT FALSE
      `);

      console.log(
        "✅ Migration successful: is_headless column added to oauth_clients table",
      );
    } else {
      console.log(
        "✅ Column is_headless already exists in oauth_clients table.",
      );
    }
  } catch (error) {
    console.error("Error running migration:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
