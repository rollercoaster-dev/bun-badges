import { db, dbPool } from "../../src/db/config.js";
import { sql } from "drizzle-orm";

// Migration content from 0004_add_status_lists.ts
async function runMigration() {
  try {
    console.log("Running status list migration...");
    console.log(`Database URL: ${process.env.DATABASE_URL || 'Using default connection'}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Quick check if tables already exist to avoid errors
    try {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'status_lists'
        );
      `);
      
      const exists = result.rows?.[0]?.exists === true;
      if (exists) {
        console.log("Status list tables already exist. Migration skipped.");
        return;
      }
    } catch (e) {
      console.log("Could not check if tables exist, proceeding with migration...");
    }
    
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
    
    console.log("Status list migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await dbPool.end();
  }
}

// Run migration
runMigration();
