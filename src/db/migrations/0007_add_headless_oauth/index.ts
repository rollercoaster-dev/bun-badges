import { Pool } from "pg";
import { createLogger } from "../../../utils/logger";

const logger = createLogger("Migration: Add Headless OAuth");

export async function up(pool: Pool): Promise<void> {
  logger.info("Running up migration for headless OAuth");

  try {
    // Check if the column already exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'oauth_clients' AND column_name = 'is_headless'
    `);

    if (checkResult.rows.length === 0) {
      // Add isHeadless column to oauth_clients
      await pool.query(`
        ALTER TABLE oauth_clients 
        ADD COLUMN is_headless BOOLEAN NOT NULL DEFAULT FALSE
      `);
      logger.info(
        "Successfully added is_headless column to oauth_clients table",
      );
    } else {
      logger.info("Column is_headless already exists in oauth_clients table");
    }
  } catch (err) {
    logger.error("Failed to run up migration for headless OAuth", err);
    throw err;
  }
}

export async function down(pool: Pool): Promise<void> {
  logger.info("Running down migration for headless OAuth");

  try {
    // Check if the column exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'oauth_clients' AND column_name = 'is_headless'
    `);

    if (checkResult.rows.length > 0) {
      // Remove isHeadless column from oauth_clients
      await pool.query(`
        ALTER TABLE oauth_clients 
        DROP COLUMN is_headless
      `);
      logger.info(
        "Successfully removed is_headless column from oauth_clients table",
      );
    } else {
      logger.info("Column is_headless does not exist in oauth_clients table");
    }
  } catch (err) {
    logger.error("Failed to run down migration for headless OAuth", err);
    throw err;
  }
}
