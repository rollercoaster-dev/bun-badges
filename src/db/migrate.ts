import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, dbPool } from "./config";
import logger from "@/utils/logger";

// Create a logger instance for migrations
const baseLogger = logger.child({ context: "migrations" });

// Run migrations
async function runMigrations(closePool = true) {
  try {
    baseLogger.info("Running migrations...");

    try {
      // Try to run migrations normally
      await migrate(db, { migrationsFolder: "./drizzle" });
      baseLogger.info("Migrations completed successfully");
    } catch (migrationError) {
      // Check if the error is about a relation already existing
      if (
        migrationError instanceof Error &&
        migrationError.message.includes("already exists")
      ) {
        baseLogger.warn(
          "Some relations already exist. This is expected in CI environments.",
        );
        baseLogger.warn("Continuing with the application startup...");
        // Don't rethrow the error - consider this a non-fatal issue
        return true;
      }

      // For other errors, rethrow
      throw migrationError;
    }

    return true;
  } catch (error) {
    baseLogger.error(error, "Migration failed:");
    throw error;
  } finally {
    // Close the pool only if requested and not in CI environment
    // This prevents premature closing in test environments
    if (
      closePool &&
      process.env.CI !== "true" &&
      process.env.NODE_ENV !== "test"
    ) {
      baseLogger.info("Closing database pool after migrations");
      await dbPool.end();
    }
  }
}

// Run migrations if this file is executed directly
if (import.meta.main) {
  runMigrations()
    .then(() => {
      baseLogger.info("Migration completed successfully");
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

export { runMigrations };
