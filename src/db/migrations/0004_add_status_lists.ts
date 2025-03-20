import { sql } from "drizzle-orm";
import { _pgTable, _uuid, _timestamp, _jsonb } from "drizzle-orm/pg-core";

export async function up(db: any) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS status_lists (
      status_list_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      issuer_id UUID NOT NULL REFERENCES issuer_profiles(issuer_id),
      status_list_json JSONB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS status_list_indices (
      mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      assertion_id UUID NOT NULL,
      status_list_id UUID NOT NULL REFERENCES status_lists(status_list_id),
      status_index INTEGER NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    
    -- Add indices for faster lookups
    CREATE INDEX idx_status_lists_issuer_id ON status_lists(issuer_id);
    CREATE INDEX idx_status_list_indices_assertion_id ON status_list_indices(assertion_id);
    CREATE INDEX idx_status_list_indices_status_list_id ON status_list_indices(status_list_id);
  `);
}

export async function down(db: any) {
  await db.execute(sql`
    DROP TABLE IF EXISTS status_list_indices;
    DROP TABLE IF EXISTS status_lists;
  `);
}
