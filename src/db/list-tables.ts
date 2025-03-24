/**
 * Database Table Lister
 *
 * This script lists all tables in the database and checks if required tables exist.
 * Used for CI debugging and migration verification.
 */

import { dbPool } from "./config";
import { createLogger } from "../utils/logger";

const logger = createLogger("db-list-tables");

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
    logger.info("Checking database tables...");

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

      logger.info(`Found ${tables.length} tables in database:`);
      tables.forEach((table) => logger.info(`- ${table}`));

      // Check if required tables exist
      const missingTables = REQUIRED_TABLES.filter(
        (table) => !tables.includes(table),
      );

      if (missingTables.length > 0) {
        logger.error(`Missing required tables: ${missingTables.join(", ")}`);
        console.log(`Missing required tables: ${missingTables.join(", ")}`);
      } else {
        logger.info("All required tables exist");
        console.log("All required tables exist");
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
    logger.error("Error listing tables:", error);
    console.error("Error:", error);
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
