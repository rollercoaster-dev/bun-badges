import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, dbPool } from "./config";
import logger from "@/utils/logger";

// Create a logger instance for migrations
const baseLogger = logger.child({ context: "migrations" });

// Run migrations
async function runMigrations(closePool = true) {
  try {
    baseLogger.info("Running migrations...");
    await migrate(db, { migrationsFolder: "./drizzle" });
    baseLogger.info("Migrations completed successfully");
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
