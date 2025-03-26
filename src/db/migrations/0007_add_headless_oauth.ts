import { Pool } from "pg";

export async function up(pool: Pool): Promise<void> {
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
  }
}

export async function down(pool: Pool): Promise<void> {
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
  }
}
