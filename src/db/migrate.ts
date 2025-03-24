import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, dbPool } from "./config";
import { createLogger } from "../utils/logger";

// Create a logger instance for migrations
const logger = createLogger("migrations");

// Run migrations
async function runMigrations(closePool = true) {
  try {
    logger.info("Running migrations...");
    await migrate(db, { migrationsFolder: "./drizzle" });
    logger.info("Migrations completed successfully");
    return true;
  } catch (error) {
    logger.error("Migration failed:", error);
    throw error;
  } finally {
    // Close the pool only if requested and not in CI environment
    // This prevents premature closing in test environments
    if (
      closePool &&
      process.env.CI !== "true" &&
      process.env.NODE_ENV !== "test"
    ) {
      logger.info("Closing database pool after migrations");
      await dbPool.end();
    }
  }
}

// Run migrations if this file is executed directly
if (import.meta.main) {
  runMigrations()
    .then(() => {
      logger.info("Migration completed successfully");
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

export { runMigrations };
