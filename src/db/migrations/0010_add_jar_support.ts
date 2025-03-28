import { Pool } from "pg";

export async function up(pool: Pool): Promise<void> {
  // Add fields for JAR (Request Object) support to oauth_clients table
  await pool.query(`
    -- Check if jwks column exists
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'oauth_clients' AND column_name = 'jwks'
      ) THEN
        ALTER TABLE oauth_clients ADD COLUMN jwks JSONB;
      END IF;
    END $$;

    -- Check if jwks_uri column exists
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'oauth_clients' AND column_name = 'jwks_uri'
      ) THEN
        ALTER TABLE oauth_clients ADD COLUMN jwks_uri TEXT;
      END IF;
    END $$;

    -- Check if request_object_signing_alg column exists
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'oauth_clients' AND column_name = 'request_object_signing_alg'
      ) THEN
        ALTER TABLE oauth_clients ADD COLUMN request_object_signing_alg VARCHAR(50);
      END IF;
    END $$;
  `);
}

export async function down(pool: Pool): Promise<void> {
  // Remove JAR support fields from oauth_clients table
  await pool.query(`
    ALTER TABLE oauth_clients 
    DROP COLUMN IF EXISTS jwks,
    DROP COLUMN IF EXISTS jwks_uri,
    DROP COLUMN IF EXISTS request_object_signing_alg;
  `);
}
