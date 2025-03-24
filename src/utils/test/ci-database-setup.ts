/**
 * CI Database Setup
 *
 * This module handles setting up the database for CI testing environments.
 * It uses a more reliable transaction-based approach to create all required tables
 * and ensures the database is in a clean state for tests.
 */

import { Pool, PoolClient } from "pg";
import { config } from "dotenv";
import * as path from "path";
import { createLogger } from "../logger";

// Load environment variables
config({ path: path.resolve(process.cwd(), ".env.ci") });

const logger = createLogger("ci-database-setup");

// Database connection URL
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/bun_badges_test";

/**
 * Create a database connection pool
 */
export function createPool(): Pool {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    query_timeout: 10000,
    statement_timeout: 10000,
  });

  return pool;
}

/**
 * Check if a table exists in the database
 */
export async function tableExists(
  client: PoolClient,
  tableName: string,
): Promise<boolean> {
  const query = `
    SELECT EXISTS (
      SELECT FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = $1
    );
  `;

  const result = await client.query(query, [tableName]);
  return result.rows[0]?.exists || false;
}

/**
 * Set up the database schema using a transaction to ensure all-or-nothing migration
 */
export async function setupDatabaseSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    // Check if tables already exist
    const usersExist = await tableExists(client, "users");

    if (usersExist) {
      logger.info("Tables already exist, skipping schema creation");
      return;
    }

    logger.info("Creating database schema using transaction...");

    // Start transaction
    await client.query("BEGIN");

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "email" text NOT NULL,
        "name" text NOT NULL,
        "password_hash" text,
        "oauth_provider" text,
        "oauth_subject" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    // Create issuer_profiles table with public_key field
    await client.query(`
      CREATE TABLE IF NOT EXISTS "issuer_profiles" (
        "issuer_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" text NOT NULL,
        "url" text NOT NULL,
        "description" text,
        "email" text,
        "phone" text,
        "image_url" text,
        "owner_user_id" uuid NOT NULL,
        "issuer_json" jsonb,
        "public_key" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        
        CONSTRAINT "issuer_profiles_owner_user_id_users_user_id_fk"
        FOREIGN KEY ("owner_user_id") 
        REFERENCES "users"("user_id")
        ON DELETE CASCADE
      );
    `);

    // Create badge_classes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "badge_classes" (
        "badge_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "issuer_id" uuid NOT NULL,
        "name" text NOT NULL,
        "description" text NOT NULL,
        "image_url" text,
        "criteria" text,
        "badge_json" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        
        CONSTRAINT "badge_classes_issuer_id_issuer_profiles_issuer_id_fk"
        FOREIGN KEY ("issuer_id") 
        REFERENCES "issuer_profiles"("issuer_id")
        ON DELETE CASCADE
      );
    `);

    // Create badge_assertions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "badge_assertions" (
        "assertion_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "badge_id" uuid NOT NULL,
        "issuer_id" uuid NOT NULL,
        "recipient_type" text NOT NULL,
        "recipient_identity" text NOT NULL,
        "recipient_hashed" boolean DEFAULT false NOT NULL,
        "recipient_salt" text,
        "issued_on" timestamp DEFAULT now() NOT NULL,
        "expires_on" timestamp,
        "revoked" boolean DEFAULT false NOT NULL,
        "revocation_reason" text,
        "assertion_json" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        
        CONSTRAINT "badge_assertions_badge_id_badge_classes_badge_id_fk"
        FOREIGN KEY ("badge_id") 
        REFERENCES "badge_classes"("badge_id")
        ON DELETE CASCADE,
        
        CONSTRAINT "badge_assertions_issuer_id_issuer_profiles_issuer_id_fk"
        FOREIGN KEY ("issuer_id") 
        REFERENCES "issuer_profiles"("issuer_id")
        ON DELETE CASCADE
      );
    `);

    // Create verification_codes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "verification_codes" (
        "code_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "username" text NOT NULL,
        "code" text NOT NULL,
        "expires_at" timestamp NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    // Create signing_keys table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "signing_keys" (
        "key_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "issuer_id" uuid NOT NULL,
        "public_key_multibase" text NOT NULL,
        "private_key_multibase" text NOT NULL,
        "controller" text NOT NULL,
        "type" varchar(50) NOT NULL DEFAULT 'Ed25519VerificationKey2020',
        "key_info" jsonb NOT NULL,
        "revoked" boolean DEFAULT false NOT NULL,
        "revoked_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        
        CONSTRAINT "signing_keys_issuer_id_issuer_profiles_issuer_id_fk"
        FOREIGN KEY ("issuer_id") 
        REFERENCES "issuer_profiles"("issuer_id")
        ON DELETE CASCADE
      );
    `);

    // Create revoked_tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "revoked_tokens" (
        "token_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "token_jti" text NOT NULL,
        "revoked_at" timestamp DEFAULT now() NOT NULL,
        "expires_at" timestamp NOT NULL
      );
    `);

    // Create status_lists table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "status_lists" (
        "list_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "issuer_id" uuid NOT NULL,
        "purpose" text NOT NULL,
        "encoded_list" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        
        CONSTRAINT "status_lists_issuer_id_issuer_profiles_issuer_id_fk"
        FOREIGN KEY ("issuer_id")
        REFERENCES "issuer_profiles"("issuer_id")
        ON DELETE CASCADE
      );
    `);

    // Create oauth_clients table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "oauth_clients" (
        "client_id" text PRIMARY KEY NOT NULL,
        "client_name" text NOT NULL,
        "client_secret" text NOT NULL,
        "redirect_uris" text[] NOT NULL,
        "grants" text[] NOT NULL,
        "owner_user_id" uuid,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        
        CONSTRAINT "oauth_clients_owner_user_id_users_user_id_fk"
        FOREIGN KEY ("owner_user_id")
        REFERENCES "users"("user_id")
        ON DELETE SET NULL
      );
    `);

    // Create authorization_codes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "authorization_codes" (
        "code" text PRIMARY KEY NOT NULL,
        "client_id" text NOT NULL,
        "user_id" uuid NOT NULL,
        "redirect_uri" text NOT NULL,
        "expires_at" timestamp NOT NULL,
        "scope" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        
        CONSTRAINT "authorization_codes_client_id_oauth_clients_client_id_fk"
        FOREIGN KEY ("client_id")
        REFERENCES "oauth_clients"("client_id")
        ON DELETE CASCADE,
        
        CONSTRAINT "authorization_codes_user_id_users_user_id_fk"
        FOREIGN KEY ("user_id")
        REFERENCES "users"("user_id")
        ON DELETE CASCADE
      );
    `);

    // Create oauth_access_tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "oauth_access_tokens" (
        "token_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "token" text NOT NULL,
        "client_id" text NOT NULL,
        "user_id" uuid NOT NULL,
        "expires_at" timestamp NOT NULL,
        "scope" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        
        CONSTRAINT "oauth_access_tokens_client_id_oauth_clients_client_id_fk"
        FOREIGN KEY ("client_id")
        REFERENCES "oauth_clients"("client_id")
        ON DELETE CASCADE,
        
        CONSTRAINT "oauth_access_tokens_user_id_users_user_id_fk"
        FOREIGN KEY ("user_id")
        REFERENCES "users"("user_id")
        ON DELETE CASCADE
      );
    `);

    // Commit transaction
    await client.query("COMMIT");

    logger.info("Database schema created successfully");
  } catch (error) {
    // Rollback in case of any errors
    await client.query("ROLLBACK");
    logger.error("Error creating database schema:", error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Verify database connection and schema
 */
export async function verifyDatabase(pool: Pool): Promise<boolean> {
  const client = await pool.connect();

  try {
    // Check connection
    const result = await client.query("SELECT 1 as test");
    if (result.rows[0]?.test !== 1) {
      logger.error("Database connection test failed");
      return false;
    }

    // Check if tables exist
    const tables = [
      "users",
      "issuer_profiles",
      "badge_classes",
      "badge_assertions",
      "signing_keys",
    ];

    for (const table of tables) {
      const exists = await tableExists(client, table);
      if (!exists) {
        logger.error(`Required table '${table}' does not exist`);
        return false;
      }
    }

    logger.info("Database connection and schema verified successfully");
    return true;
  } catch (error) {
    logger.error("Error verifying database:", error);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Main setup function
 */
export async function setupCiDatabase(): Promise<Pool> {
  logger.info("Setting up CI database...");

  const pool = createPool();

  // Verify the connection first
  try {
    const client = await pool.connect();
    try {
      const result = await client.query("SELECT 1 as test");
      logger.info("Initial database connection successful:", result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("Failed to establish initial database connection:", error);
    throw error;
  }

  // Run schema setup
  await setupDatabaseSchema(pool);

  // Verify database setup
  const isValid = await verifyDatabase(pool);

  if (!isValid) {
    throw new Error("Database verification failed. Schema may be incomplete.");
  }

  return pool;
}

// Run this file directly to set up the database
if (import.meta.main) {
  setupCiDatabase()
    .then((pool) => {
      logger.info("CI database setup complete");
      return pool.end();
    })
    .catch((error) => {
      logger.error("CI database setup failed:", error);
      process.exit(1);
    });
}
