import { Pool } from "pg";

export async function up(pool: Pool): Promise<void> {
  // Check if the table already exists
  const checkResult = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name = 'token_mappings'
  `);

  if (checkResult.rows.length === 0) {
    // Create token_mappings table for OAuth-JWT integration
    await pool.query(`
      CREATE TABLE IF NOT EXISTS token_mappings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        oauth_token TEXT NOT NULL UNIQUE,
        jwt_token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Add indexes for efficient lookups
      CREATE INDEX IF NOT EXISTS idx_token_mappings_oauth_token ON token_mappings (oauth_token);
      CREATE INDEX IF NOT EXISTS idx_token_mappings_jwt_token ON token_mappings (jwt_token);
      CREATE INDEX IF NOT EXISTS idx_token_mappings_expires_at ON token_mappings (expires_at);
    `);
  }
}

export async function down(pool: Pool): Promise<void> {
  // Check if the table exists
  const checkResult = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name = 'token_mappings'
  `);

  if (checkResult.rows.length > 0) {
    // Drop the token_mappings table
    await pool.query(`
      DROP TABLE IF EXISTS token_mappings;
    `);
  }
}
