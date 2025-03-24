import { db, dbPool } from "../../src/db/config.js";
import { DATABASE_URL } from "../../src/db/config.js";
import { sql } from "drizzle-orm";

// Migration content from 0004_add_status_lists.ts
async function runMigration() {
  if (process.env.CI) {
    console.log('CI environment detected, skipping migration check.');
    return;
  }

  try {
    console.log("Running status list migration...");
    console.log(`Database URL: ${process.env.DATABASE_URL || 'Using default connection'}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    async function waitForDBConnection(retries = 5) {
      for (let i = 0; i < retries; i++) {
        try {
          await db.execute(sql`SELECT 1`);
          return;
        } catch (err) {
          console.error('Database connection attempt failed, retrying in 2 seconds...', err.message);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      throw new Error('Database connection failed after several attempts');
    }

    await waitForDBConnection();

    const issuerResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'issuer_profiles'
      )
    `);
    const issuerExists = issuerResult.rows?.[0]?.exists === true;
    if (!issuerExists) {
      console.error("issuer_profiles table does not exist. Please run the full database migration (db:push) before running this migration.");
      process.exit(1);
    }
    
    // Quick check if tables already exist to avoid errors
    try {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'status_lists'
        )
      `);
      const statusListsExists = result.rows?.[0]?.exists === true;
      if (!statusListsExists) {
        console.error("status_lists table does not exist. Please run the full database migration (db:push) before running this migration.");
        process.exit(1);
      }
    } catch (error) {
      console.error("Error checking status_lists table:", error);
      process.exit(1);
    }
  } catch (error) {
    console.error("Error running status list migration:", error);
    process.exit(1);
  }
}

runMigration();