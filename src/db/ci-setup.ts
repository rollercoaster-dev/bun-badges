import { dbPool } from "./config";
import { createLogger } from "@/utils/logger";

// Create logger instance for this script
const logger = createLogger("CiDbSetup");

// Constant for retry settings
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000;

/**
 * CI database setup utility
 * This ensures the database is properly initialized for CI tests
 */
async function setupCiDatabase() {
  logger.info("Starting CI database setup...");
  logger.info(
    `Using database URL: ${process.env.DATABASE_URL?.replace(/:.+@/, ":****@")}`,
  );

  // No need to create a db instance here since we're using dbPool directly

  try {
    // 1. Check database connection
    await checkConnection();

    // 2. Check if tables exist
    const tables = await checkTables();

    if (tables.length === 0) {
      logger.info("No tables found, running migrations...");
      await runMigrations();
    } else {
      logger.info(`Found ${tables.length} tables:`);
      tables.forEach((table) => logger.info(`- ${table}`));
    }

    // 3. Verify required tables
    await verifyRequiredTables();

    logger.info("✅ CI database setup completed successfully");
    process.exit(0);
  } catch (err) {
    logger.error("❌ CI database setup failed:", err);
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
      logger.info(`Database connection attempt ${attempt}/${MAX_RETRIES}...`);

      // Try a simple query to test connection
      const result = await dbPool.query("SELECT 1 as test");
      if (result.rows[0].test === 1) {
        logger.info("✅ Database connection successful");
        return true;
      }
    } catch (err) {
      logger.error(
        `Database connection failed (attempt ${attempt}/${MAX_RETRIES}):`,
        err,
      );

      if (attempt < MAX_RETRIES) {
        logger.info(`Waiting ${RETRY_DELAY}ms before retry...`);
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
    logger.error("Failed to check tables:", err);
    return [];
  }
}

/**
 * Run database migrations
 */
async function runMigrations() {
  try {
    logger.info("Running database migrations...");

    // Execute the db:push command
    // This is a simple approach - in a real scenario, you might want to
    // import your migration system directly
    const { execSync } = require("child_process");
    execSync("bun run db:push", { stdio: "inherit" });

    logger.info("Migrations completed successfully");
    return true;
  } catch (err) {
    logger.error("Migration failed:", err);
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

  logger.info("✅ All required tables verified");
  return true;
}

// Run the setup
setupCiDatabase().catch((err) => {
  logger.error("Unhandled error in CI database setup:", err);
  process.exit(1);
});
