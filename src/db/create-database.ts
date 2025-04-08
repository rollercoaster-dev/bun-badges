import { Pool } from "pg";
import logger from "@utils/logger";
import { config as loadDotenv } from "dotenv";
import * as pathUtil from "path";
import * as fsUtil from "fs";

const baseLogger = logger.child({ context: "db-create" });

const envPath = pathUtil.resolve(__dirname, "../../../../.env");
if (fsUtil.existsSync(envPath)) {
  loadDotenv({ path: envPath });
}

/**
 * Creates the database if it doesn't exist
 * @returns Promise that resolves when the database is confirmed to exist
 */
export async function ensureDatabaseExists(): Promise<void> {
  const DATABASE_URL = process.env.DATABASE_URL;

  // Add check for DATABASE_URL
  if (!DATABASE_URL) {
    baseLogger.error(
      "DATABASE_URL environment variable is not set. Cannot create or check database.",
    );
    process.exit(1); // Exit if DATABASE_URL is missing
  }

  baseLogger.info(
    `Using DATABASE_URL: ${DATABASE_URL.replace(/:[^:]*@/, ":***@")}`,
  );

  // Extract database name from DATABASE_URL
  const dbNameMatch = DATABASE_URL.match(/\/([^?]*)/);
  const dbName = dbNameMatch ? dbNameMatch[1] : null;

  if (!dbName) {
    throw new Error("Could not extract database name from DATABASE_URL");
  }

  baseLogger.info(
    `Attempting to connect to default Postgres database to verify/create '${dbName}'`,
  );

  if (dbName === "badges") {
    baseLogger.warn(`
      WARNING: You're using the database name 'badges', but many parts of the application 
      expect 'bun_badges_test'. This inconsistency might cause connection issues.
      Consider updating your .env file and Docker settings to use 'bun_badges_test' consistently.
    `);
  }

  // Connect to postgres database to check if our target database exists
  const pgPool = new Pool({
    connectionString: DATABASE_URL.replace(dbName, "postgres"),
  });

  try {
    baseLogger.info(`Checking if database '${dbName}' exists...`);
    const result = await pgPool.query(
      `
      SELECT datname FROM pg_database WHERE datname = $1
    `,
      [dbName],
    );

    if (result.rows.length === 0) {
      baseLogger.info(`Database '${dbName}' does not exist, creating it...`);
      await pgPool.query(`CREATE DATABASE ${dbName}`);
      baseLogger.info(`Successfully created database '${dbName}'`);

      // Helpful message about the next steps
      baseLogger.info(`
        Database created! Next steps:
        1. Run migrations: bun run db:migrate
        2. Start your application: bun run dev
        
        If you encounter database connection issues, check that DATABASE_URL in .env 
        matches the database name ('${dbName}') and that Docker Compose files use the same name.
      `);
    } else {
      baseLogger.info(`Database '${dbName}' already exists`);
    }
  } catch (error) {
    if (error instanceof Error) {
      baseLogger.error({ err: error }, `Failed to create database '${dbName}'`);

      // Provide helpful error message for common issues
      if (error.message.includes("permission denied")) {
        baseLogger.info(
          "Hint: You may need to run this command with database admin privileges",
        );
        baseLogger.info(
          "      or create the database manually with: CREATE DATABASE " +
            dbName,
        );
      } else if (error.message.includes("connection refused")) {
        baseLogger.info(`
          Hint: Database connection refused. Check that:
          1. PostgreSQL is running on the expected host/port
          2. Your DATABASE_URL (${DATABASE_URL.replace(/:[^:]*@/, ":***@")}) is correct
          3. If using Docker, ensure the database container is running
        `);
      } else if (error.message.includes("does not exist")) {
        baseLogger.info(`
          Hint: Database connection error. The database name might be inconsistent across your configuration:
          1. Check DATABASE_URL in .env: ${DATABASE_URL.replace(/:[^:]*@/, ":***@")}
          2. Verify Docker Compose settings (POSTGRES_DB variable)
          3. Check drizzle.config.ts for the correct database name
          
          This project has configurations using different names (badges, bun_badges, bun_badges_test).
          Standardize on 'bun_badges_test' for development/test and 'bun_badges' for production.
        `);
      }
    }
    throw error;
  } finally {
    await pgPool.end();
  }
}

// Run the function if this file is executed directly
if (import.meta.main) {
  ensureDatabaseExists()
    .then(() => {
      baseLogger.info("Database check completed");
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

export default { ensureDatabaseExists };
