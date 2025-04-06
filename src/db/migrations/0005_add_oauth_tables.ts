import { sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import logger from "@/utils/logger";

// Create a logger for migrations
const baseLogger = logger.child({ context: "migrations:oauth" });

export async function up(db: PostgresJsDatabase) {
  // First create the oauth_clients table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS oauth_clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id TEXT NOT NULL UNIQUE,
      client_secret TEXT NOT NULL,
      client_name VARCHAR(255) NOT NULL,
      client_uri TEXT,
      redirect_uris TEXT[] NOT NULL,
      scope TEXT NOT NULL,
      grant_types TEXT[] NOT NULL,
      response_types TEXT[] NOT NULL,
      token_endpoint_auth_method VARCHAR(50) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    );
  `);

  // Then create the authorization_codes table that references oauth_clients
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS authorization_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT NOT NULL UNIQUE,
      client_id UUID NOT NULL REFERENCES oauth_clients(id),
      user_id TEXT NOT NULL,
      redirect_uri TEXT NOT NULL,
      scope TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      is_used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );
  `);

  baseLogger.info("✅ Created OAuth tables");
}

export async function down(db: PostgresJsDatabase) {
  // Drop tables in reverse order (authorization_codes depends on oauth_clients)
  await db.execute(sql`DROP TABLE IF EXISTS authorization_codes;`);
  await db.execute(sql`DROP TABLE IF EXISTS oauth_clients;`);

  baseLogger.info("✅ Dropped OAuth tables");
}
