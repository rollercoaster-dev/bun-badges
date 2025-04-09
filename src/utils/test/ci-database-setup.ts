/**
 * CI Database Setup
 *
 * This module handles setting up the database for CI testing environments.
 * It uses a more reliable transaction-based approach to create all required tables
 * and ensures the database is in a clean state for tests.
 */

import postgres from "postgres";
import { Sql } from "postgres";
import logger from "@/utils/logger";

// No longer load .env.ci - rely on environment variables set by the CI workflow
// config({ path: path.resolve(process.cwd(), ".env.ci") });

const baseLogger = logger.child({ context: "ci-database-setup" });

// Database connection URL - must be provided by the CI environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  const errorMsg =
    "DATABASE_URL environment variable is not set in the CI environment.";
  baseLogger.error(errorMsg);
  throw new Error(errorMsg);
}

/**
 * Create a database connection pool
 */
export function createPool(): Sql {
  const pool = postgres(DATABASE_URL!, { max: 1 });
  return pool;
}

/**
 * Check if a table exists in the database
 */
export async function tableExists(
  client: Sql,
  tableName: string,
): Promise<boolean> {
  const result = await client`
    SELECT EXISTS (
      SELECT FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = ${tableName}
    );
  `;
  return result[0]?.exists || false;
}

/**
 * Set up the database schema using a transaction to ensure all-or-nothing migration
 */
export async function setupDatabaseSchema(pool: Sql): Promise<void> {
  const client = pool;
  try {
    await client.begin(async (sql) => {
      const checkTableExists = async (tableName: string): Promise<boolean> => {
        const result = await sql`
          SELECT EXISTS (
            SELECT FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename = ${tableName}
          );
        `;
        return result[0]?.exists || false;
      };

      if (!(await checkTableExists("oauth_clients"))) {
        logger.debug("Creating oauth_clients table...");
        await sql`
          CREATE TABLE oauth_clients (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id TEXT NOT NULL UNIQUE,
            client_secret TEXT NOT NULL,
            client_name VARCHAR(255) NOT NULL,
            client_uri TEXT,
            logo_uri TEXT,
            redirect_uris TEXT[] NOT NULL,
            scope TEXT NOT NULL,
            grant_types TEXT[] NOT NULL,
            response_types TEXT[] NOT NULL,
            token_endpoint_auth_method VARCHAR(50) NOT NULL,
            jwks JSONB,
            jwks_uri TEXT,
            request_object_signing_alg VARCHAR(50),
            is_active BOOLEAN DEFAULT TRUE NOT NULL,
            is_headless BOOLEAN DEFAULT FALSE NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
        `;
      }
      if (!(await checkTableExists("issuer_profiles"))) {
        logger.debug("Creating issuer_profiles table...");
        await sql`
          CREATE TABLE issuer_profiles (
            issuer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            url VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            description VARCHAR(1000),
            owner_user_id UUID,
            issuer_json JSONB NOT NULL,
            public_key JSONB,
            signing_public_key TEXT,
            encrypted_private_key TEXT,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
        `;
      }
      if (!(await checkTableExists("badge_classes"))) {
        logger.debug("Creating badge_classes table...");
        await sql`
          CREATE TABLE badge_classes (
            badge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            issuer_id UUID NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            image_url TEXT NOT NULL,
            criteria TEXT NOT NULL,
            badge_json JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
        `;
      }
      if (!(await checkTableExists("badge_assertions"))) {
        logger.debug("Creating badge_assertions table...");
        await sql`
          CREATE TABLE badge_assertions (
            assertion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            badge_id UUID NOT NULL,
            issuer_id UUID NOT NULL,
            recipient_identity TEXT NOT NULL,
            recipient_type VARCHAR(50) NOT NULL,
            recipient_hashed BOOLEAN DEFAULT FALSE NOT NULL,
            issued_on TIMESTAMP DEFAULT NOW() NOT NULL,
            evidence_url TEXT,
            revoked BOOLEAN DEFAULT FALSE NOT NULL,
            revocation_reason TEXT,
            assertion_json JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
        `;
      }
      if (!(await checkTableExists("status_lists"))) {
        logger.debug("Creating status_lists table...");
        await sql`
          CREATE TABLE status_lists (
            status_list_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            issuer_id UUID NOT NULL,
            status_list_json JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
        `;
      }
      if (!(await checkTableExists("status_list_indices"))) {
        logger.debug("Creating status_list_indices table...");
        await sql`
          CREATE TABLE status_list_indices (
            mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            assertion_id UUID NOT NULL,
            status_list_id UUID NOT NULL,
            status_index UUID NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
        `;
      }
      if (!(await checkTableExists("revoked_tokens"))) {
        logger.debug("Creating revoked_tokens table...");
        await sql`
          CREATE TABLE revoked_tokens (
            token_id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            token_jti TEXT NOT NULL,
            revoked_at TIMESTAMP DEFAULT NOW() NOT NULL,
            expires_at TIMESTAMP NOT NULL
          );
        `;
      }
    });

    logger.info("Database schema setup complete");
  } catch (error) {
    logger.error("Error setting up database schema within transaction:", error);
    throw error;
  }
}

/**
 * Verify database connection and schema
 */
export async function verifyDatabase(pool: Sql): Promise<boolean> {
  const client = pool;
  try {
    const result = await client`SELECT 1 as test`;
    if (result[0]?.test !== 1) {
      baseLogger.error("Database connection test failed");
      return false;
    }

    const tables = [
      "oauth_clients",
      "issuer_profiles",
      "badge_classes",
      "badge_assertions",
      "status_lists",
      "status_list_indices",
      "revoked_tokens",
    ];

    for (const table of tables) {
      const exists = await tableExists(client, table);
      if (!exists) {
        baseLogger.error(`Required table '${table}' does not exist`);
        return false;
      }
    }

    baseLogger.info("Database connection and schema verified successfully");
    return true;
  } catch (error) {
    baseLogger.error("Error verifying database:", error);
    return false;
  }
}

/**
 * Main setup function
 */
export async function setupCiDatabase(): Promise<Sql> {
  baseLogger.info("Setting up CI database...");

  const pool = createPool();

  // Verify the connection first
  try {
    const client = pool;
    // Use tagged template for connection test - just await it
    await client`SELECT 1 as test`;
    baseLogger.info(
      "Initial database connection successful.", // Simplified log
    );
  } catch (error) {
    baseLogger.error("Failed to establish initial database connection:", error);
    await pool.end();
    throw error;
  }

  try {
    await setupDatabaseSchema(pool);
  } catch (error) {
    baseLogger.error("Schema setup failed:", error);
    await pool.end();
    throw error;
  }

  let isValid = false;
  try {
    isValid = await verifyDatabase(pool);
  } catch (error) {
    baseLogger.error("Database verification step failed:", error);
    await pool.end();
    throw error;
  }

  if (!isValid) {
    baseLogger.error(
      "Database verification failed after setup. Schema may be incomplete.",
    );
    await pool.end();
    throw new Error("Database verification failed. Schema may be incomplete.");
  }

  baseLogger.info("CI database setup completed successfully.");
  return pool;
}

// Run this file directly to set up the database
if (require.main === module) {
  setupCiDatabase()
    .then(async (pool) => {
      baseLogger.info(
        "CI database setup complete script finished. Closing pool.",
      );
      await pool.end();
    })
    .catch((error) => {
      baseLogger.error("CI database setup script failed:", error);
      process.exit(1);
    });
}
