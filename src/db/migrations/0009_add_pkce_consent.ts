import { Pool } from "pg";

export async function up(pool: Pool): Promise<void> {
  // 1. Add PKCE fields to the authorization_codes table
  await pool.query(`
    -- Check if code_challenge column exists
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'authorization_codes' AND column_name = 'code_challenge'
      ) THEN
        ALTER TABLE authorization_codes ADD COLUMN code_challenge TEXT;
        ALTER TABLE authorization_codes ADD COLUMN code_challenge_method VARCHAR(20);
      END IF;
    END $$;
  `);

  // 2. Add logo_uri to oauth_clients table if it doesn't exist
  await pool.query(`
    -- Check if logo_uri column exists
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'oauth_clients' AND column_name = 'logo_uri'
      ) THEN
        ALTER TABLE oauth_clients ADD COLUMN logo_uri TEXT;
      END IF;
    END $$;
  `);

  // 3. Create consent_records table
  const checkConsentTableResult = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name = 'consent_records'
  `);

  if (checkConsentTableResult.rows.length === 0) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS consent_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        client_id UUID NOT NULL REFERENCES oauth_clients(id),
        scope TEXT NOT NULL,
        expires_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Add indexes for efficient lookups
      CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records (user_id);
      CREATE INDEX IF NOT EXISTS idx_consent_records_client_id ON consent_records (client_id);
      CREATE INDEX IF NOT EXISTS idx_consent_records_user_client ON consent_records (user_id, client_id);
    `);
  }

  // 4. Create refresh_tokens table
  const checkRefreshTokensTableResult = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name = 'oauth_refresh_tokens'
  `);

  if (checkRefreshTokensTableResult.rows.length === 0) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token TEXT NOT NULL UNIQUE,
        client_id UUID NOT NULL REFERENCES oauth_clients(id),
        user_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Add indexes for efficient lookups
      CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_token ON oauth_refresh_tokens (token);
      CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_client_id ON oauth_refresh_tokens (client_id);
      CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_user_id ON oauth_refresh_tokens (user_id);
    `);
  }
}

export async function down(pool: Pool): Promise<void> {
  // 1. Remove PKCE fields from authorization_codes table
  await pool.query(`
    -- Check if code_challenge column exists before dropping
    DO $$ 
    BEGIN
      IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'authorization_codes' AND column_name = 'code_challenge'
      ) THEN
        ALTER TABLE authorization_codes DROP COLUMN IF EXISTS code_challenge;
        ALTER TABLE authorization_codes DROP COLUMN IF EXISTS code_challenge_method;
      END IF;
    END $$;
  `);

  // 2. Remove logo_uri from oauth_clients
  await pool.query(`
    -- Check if logo_uri column exists before dropping
    DO $$ 
    BEGIN
      IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'oauth_clients' AND column_name = 'logo_uri'
      ) THEN
        ALTER TABLE oauth_clients DROP COLUMN IF EXISTS logo_uri;
      END IF;
    END $$;
  `);

  // 3. Drop consent_records table
  const checkConsentTableResult = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name = 'consent_records'
  `);

  if (checkConsentTableResult.rows.length > 0) {
    await pool.query(`
      DROP TABLE IF EXISTS consent_records;
    `);
  }

  // 4. Drop oauth_refresh_tokens table
  const checkRefreshTokensTableResult = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name = 'oauth_refresh_tokens'
  `);

  if (checkRefreshTokensTableResult.rows.length > 0) {
    await pool.query(`
      DROP TABLE IF EXISTS oauth_refresh_tokens;
    `);
  }
}
