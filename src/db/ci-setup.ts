import { dbPool } from "./config";
import logger from "@/utils/logger";

// Create logger instance for this script
const baseLogger = logger.child({ context: "CiDbSetup" });

// Constant for retry settings
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000;

/**
 * CI database setup utility
 * This ensures the database is properly initialized for CI tests
 */
async function setupCiDatabase() {
  baseLogger.info("Starting CI database setup...");
  baseLogger.info(
    { databaseUrl: process.env.DATABASE_URL?.replace(/:.+@/, ":****@") },
    "Using database URL",
  );

  // No need to create a db instance here since we're using dbPool directly

  try {
    // 1. Check database connection
    await checkConnection();

    // 2. Check if tables exist
    const tables = await checkTables();

    if (tables.length === 0) {
      baseLogger.info("No tables found, running migrations...");
      await runMigrations();
    } else {
      baseLogger.info(`Found ${tables.length} tables:`);
      tables.forEach((table) => baseLogger.info(`- ${table}`));
    }

    // 3. Verify required tables
    await verifyRequiredTables();

    baseLogger.info("✅ CI database setup completed successfully");
    process.exit(0);
  } catch (err) {
    baseLogger.error(err, "❌ CI database setup failed:");
    process.exit(1);
  }
}

/**
 * Check database connection with retries
 */
async function checkConnection() {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      attempt++;
      baseLogger.info(
        `Database connection attempt ${attempt}/${MAX_RETRIES}...`,
      );

      // Try a simple query to test connection
      const result = await dbPool.query("SELECT 1 as test");
      if (result.rows[0].test === 1) {
        baseLogger.info("✅ Database connection successful");
        return true;
      }
    } catch (err) {
      baseLogger.error(
        err,
        `Database connection failed (attempt ${attempt}/${MAX_RETRIES}):`,
      );

      if (attempt < MAX_RETRIES) {
        baseLogger.info(`Waiting ${RETRY_DELAY}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      } else {
        throw new Error(
          `Failed to connect to database after ${MAX_RETRIES} attempts`,
        );
      }
    }
  }

  return false;
}

/**
 * Check what tables exist in the database
 */
async function checkTables() {
  try {
    const result = await dbPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    return result.rows.map((row) => row.table_name);
  } catch (err) {
    baseLogger.error(err, "Failed to check tables:");
    return [];
  }
}

/**
 * Run database migrations
 */
async function runMigrations() {
  try {
    baseLogger.info("Running database migrations...");

    // Execute the db:push command
    // This is a simple approach - in a real scenario, you might want to
    // import your migration system directly
    const { execSync } = require("child_process");
    execSync("bun run db:push", { stdio: "inherit" });

    baseLogger.info("Migrations completed successfully");
    return true;
  } catch (err) {
    baseLogger.error(err, "Migration failed:");
    throw err;
  }
}

/**
 * Verify that required tables exist
 */
async function verifyRequiredTables() {
  const requiredTables = [
    "users",
    "issuer_profiles",
    "credentials",
    "achievements",
  ];
  const existingTables = await checkTables();

  const missingTables = requiredTables.filter(
    (table) => !existingTables.includes(table),
  );

  if (missingTables.length > 0) {
    throw new Error(`Missing required tables: ${missingTables.join(", ")}`);
  }

  baseLogger.info("✅ All required tables verified");
  return true;
}

// Run the setup
setupCiDatabase().catch((err) => {
  baseLogger.error(err, "Unhandled error in CI database setup:");
  process.exit(1);
});
