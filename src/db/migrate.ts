import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, dbPool } from "./config";

// Run migrations
async function runMigrations() {
  try {
    console.log("Running migrations...");
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
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
