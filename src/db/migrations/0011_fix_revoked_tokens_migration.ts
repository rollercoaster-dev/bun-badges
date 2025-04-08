import { sql } from "drizzle-orm";
import { DatabaseService } from "@/services/db.service";
import logger from "@/utils/logger";

/**
 * Migration to fix potential conflicts with the revoked_tokens table creation.
 * This migration:
 * 1. Checks if the table exists before attempting to create it
 * 2. Makes it safe to run in environments where the table might have been created outside the migration system
 *
 * This fixes CI failures where the table is created by ci-database-setup.ts but then migrations try to create it again.
 */
export async function up(): Promise<void> {
  try {
    const db = DatabaseService.db;
    logger.info("Running revoked_tokens migration fix...");

    // Check if the revoked_tokens table exists
    const tableExistsResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'revoked_tokens'
      );
    `);

    const tableExists = tableExistsResult.rows?.[0]?.exists;

    if (!tableExists) {
      logger.info("revoked_tokens table does not exist, creating it...");

      // Only create the table if it doesn't exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "revoked_tokens" (
          "token_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "token_jti" text NOT NULL,
          "revoked_at" timestamp DEFAULT now() NOT NULL,
          "expires_at" timestamp NOT NULL
        );
      `);

      logger.info("revoked_tokens table created successfully");
    } else {
      logger.info("revoked_tokens table already exists, skipping creation");
    }

    logger.info("revoked_tokens migration fix completed");
  } catch (error) {
    logger.error({ err: error }, "Failed to run revoked_tokens migration fix");
    throw error;
  }
}

export async function down(): Promise<void> {
  // No down migration needed for this fix
  // We don't want to drop the table as it might be used by other migrations
  logger.info("No down migration needed for revoked_tokens fix");
}
