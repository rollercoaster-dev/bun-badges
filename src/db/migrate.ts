import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, dbPool } from "./config";
import { createLogger } from "../utils/logger";

// Create a logger instance for migrations
const logger = createLogger("migrations");

// Run migrations
async function runMigrations() {
  try {
    logger.info("Running migrations...");
    await migrate(db, { migrationsFolder: "./drizzle" });
    logger.info("Migrations completed successfully");
  } catch (error) {
    logger.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await dbPool.end();
  }
}

// Run migrations if this file is executed directly
if (import.meta.main) {
  runMigrations();
}

export { runMigrations };
