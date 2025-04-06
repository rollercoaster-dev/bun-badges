/**
 * Database Table Lister
 *
 * This script lists all tables in the database and checks if required tables exist.
 * Used for CI debugging and migration verification.
 */

import { dbPool } from "./config";
import logger from "@/utils/logger";

const baseLogger = logger.child({ context: "db-list-tables" });

// Required tables for the application
const REQUIRED_TABLES = [
  "users",
  "issuer_profiles",
  "badge_classes",
  "badge_assertions",
  "signing_keys",
  "verification_codes",
];

async function listTables() {
  try {
    baseLogger.info("Checking database tables...");

    const client = await dbPool.connect();

    try {
      // List all tables in the public schema
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);

      const tables = tablesResult.rows.map((row) => row.table_name);

      baseLogger.info(`Found ${tables.length} tables in database:`);
      tables.forEach((table) => baseLogger.info(`- ${table}`));

      // Check if required tables exist
      const missingTables = REQUIRED_TABLES.filter(
        (table) => !tables.includes(table),
      );

      if (missingTables.length > 0) {
        baseLogger.error(
          `Missing required tables: ${missingTables.join(", ")}`,
        );
        // Replace console.log with logger.error
        // console.log(`Missing required tables: ${missingTables.join(", ")}`);
      } else {
        baseLogger.info("All required tables exist");
        // Replace console.log with logger.info
        // console.log("All required tables exist");
      }

      // Return result for use in scripts
      return {
        tables,
        missingTables,
        allTablesExist: missingTables.length === 0,
      };
    } finally {
      client.release();
    }
  } catch (error) {
    baseLogger.error(error, "Error listing tables:");
    // Replace console.error with logger.error
    // console.error("Error:", error);
    throw error;
  } finally {
    // Close pool if running as main script
    if (import.meta.main) {
      await dbPool.end();
    }
  }
}

// Run function if executed directly
if (import.meta.main) {
  listTables()
    .then((result) => {
      if (result.allTablesExist) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(() => {
      process.exit(1);
    });
}

export { listTables, REQUIRED_TABLES };
