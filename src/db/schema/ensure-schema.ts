import { db, dbPool, DATABASE_URL } from "../config";
import { sql } from "drizzle-orm";
import { runMigrations } from "../migrate";
import logger from "@/utils/logger";
import { Pool } from "pg";

const baseLogger = logger.child({ context: "schema-validation" });

/**
 * Ensures all necessary schema changes are applied
 * This function:
 * 1. Runs standard Drizzle migrations
 * 2. Applies any special migrations that might not be captured in Drizzle
 * 3. Verifies critical columns exist
 *
 * @param closePool Whether to close the database pool after operations
 * @returns Promise that resolves when all schema operations are complete
 */
export async function ensureSchemaComplete(closePool = true): Promise<void> {
  try {
    baseLogger.info("Starting schema validation...");
    baseLogger.info(
      `Using database connection: ${DATABASE_URL?.replace(/:[^:]*@/, ":***@")}`,
    );

    // Check if database exists before proceeding
    await checkDatabaseExists();

    // Run standard migrations first
    await runMigrations(false);

    // Verify and add special columns if needed
    await ensureEvidenceUrlColumn();

    // Verify other critical columns
    await verifyRequiredColumns();

    baseLogger.info("Schema validation completed successfully");
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (
        error.message.includes("database") &&
        error.message.includes("does not exist")
      ) {
        baseLogger.error(
          { err: error },
          "Database does not exist. Please create it or update DATABASE_URL environment variable.",
        );
        baseLogger.info(
          "Hint: For development, ensure DATABASE_URL matches your local PostgreSQL setup",
        );
        baseLogger.info(
          "      For Docker, use 'docker-compose up -d db' to start the database",
        );
        baseLogger.info(
          "      For CI, the database setup is handled automatically",
        );
      } else if (error.message.includes("client password must be a string")) {
        baseLogger.error(
          { err: error },
          "Database authentication error: Password must be a string. Check your environment variables.",
        );
        baseLogger.info(
          "Hint: Ensure DB_PASSWORD or POSTGRES_PASSWORD is properly set as a string value",
        );
        baseLogger.info(
          "      For CI, check that secrets are properly configured in your workflow",
        );
      } else {
        baseLogger.error({ err: error }, "Schema validation failed:");
      }
    } else {
      baseLogger.error(
        { err: error },
        "Schema validation failed with unknown error",
      );
    }
    throw error;
  } finally {
    if (
      closePool &&
      process.env.CI !== "true" &&
      process.env.NODE_ENV !== "test"
    ) {
      baseLogger.info("Closing database pool after schema validation");
      await dbPool.end();
    }
  }
}

/**
 * Checks if the target database exists
 * Uses a raw PostgreSQL connection rather than the ORM
 */
async function checkDatabaseExists(): Promise<void> {
  // Extract database name from CONNECTION_STRING
  const dbNameMatch = DATABASE_URL?.match(/\/([^?]*)/);
  const dbName = dbNameMatch ? dbNameMatch[1] : null;

  if (!dbName) {
    throw new Error("Could not extract database name from DATABASE_URL");
  }

  // Calculate the connection string targeting the 'postgres' database
  const connectionStringToPostgres = DATABASE_URL?.replace(dbName, "postgres");

  // Log the connection string being used for diagnostics (ensure this runs!)
  baseLogger.info(
    `[DIAGNOSTIC] Attempting connection to postgres DB with connection string: ${connectionStringToPostgres?.replace(/:[^:]*@/, ":***@")}`,
  );

  // Connect to 'postgres' database to check if our target database exists
  const pgPool = new Pool({
    connectionString: connectionStringToPostgres, // Use the calculated string
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
      baseLogger.info(
        `Database '${dbName}' does not exist, attempting to create it...`,
      );

      try {
        // Create the database if it doesn't exist
        await pgPool.query(`CREATE DATABASE ${dbName}`);
        baseLogger.info(`Successfully created database '${dbName}'`);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("permission denied")
        ) {
          throw new Error(
            `Cannot create database '${dbName}'. Permission denied. Please create it manually.`,
          );
        }
        throw error;
      }
    } else {
      baseLogger.info(
        `Database '${dbName}' exists, continuing with schema validation`,
      );
    }
  } finally {
    await pgPool.end();
  }
}

/**
 * Ensures the evidence_url column exists in badge_assertions
 */
async function ensureEvidenceUrlColumn(): Promise<void> {
  try {
    // Check if the badge_assertions table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'badge_assertions'
      );
    `);

    if (tableExists.rows?.[0]?.exists !== true) {
      baseLogger.info(
        "badge_assertions table doesn't exist yet, skipping evidence_url check",
      );
      return;
    }

    // Check if the column already exists
    const columnExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'badge_assertions'
        AND column_name = 'evidence_url'
      );
    `);

    if (columnExists.rows?.[0]?.exists === true) {
      baseLogger.info("evidence_url column already exists");
      return;
    }

    // Add the evidence_url column
    baseLogger.info("Adding evidence_url column to badge_assertions table");
    await db.execute(sql`
      ALTER TABLE badge_assertions
      ADD COLUMN IF NOT EXISTS evidence_url text;
    `);

    baseLogger.info(
      "Successfully added evidence_url column to badge_assertions table",
    );
  } catch (error: unknown) {
    baseLogger.error({ err: error }, "Error ensuring evidence_url column:");
    // Don't fail if the table doesn't exist yet - it will be created with the column later
    if (
      error instanceof Error &&
      error.message.includes("relation") &&
      error.message.includes("does not exist")
    ) {
      baseLogger.info(
        "Tables don't exist yet, evidence_url will be added when tables are created",
      );
    } else {
      throw error;
    }
  }
}

/**
 * Verifies that all required columns exist in critical tables
 * This helps identify any discrepancies between environments
 */
async function verifyRequiredColumns(): Promise<void> {
  const criticalColumnsToCheck = [
    {
      table: "issuer_profiles",
      columns: ["signing_public_key", "encrypted_private_key"],
    },
    { table: "badge_assertions", columns: ["evidence_url"] },
    // Add more critical columns to check as needed
  ];

  for (const { table, columns } of criticalColumnsToCheck) {
    // First check if table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = ${table}
      );
    `);

    if (tableExists.rows?.[0]?.exists !== true) {
      baseLogger.info(
        `Table ${table} doesn't exist yet, skipping column checks`,
      );
      continue;
    }

    // Check each column
    for (const column of columns) {
      const columnExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = ${table}
          AND column_name = ${column}
        );
      `);

      if (columnExists.rows?.[0]?.exists !== true) {
        baseLogger.warn(`Required column ${column} missing from ${table}!`);
      } else {
        baseLogger.debug(`Column ${column} exists in ${table}`);
      }
    }
  }
}

// Run schema validation if this file is executed directly
if (import.meta.main) {
  ensureSchemaComplete()
    .then(() => {
      baseLogger.info("Schema validation completed successfully");
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

export default { ensureSchemaComplete };
