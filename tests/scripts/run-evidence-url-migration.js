import { db, dbPool } from "../../src/db/config.js";
import { DATABASE_URL } from "../../src/db/config.js";
import { sql } from "drizzle-orm";

// Migration runner for the evidence_url column
async function runMigration() {
  try {
    console.log("Running evidence_url column migration...");
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

    // First check if the badge_assertions table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'badge_assertions'
      )
    `);

    if (tableExists.rows?.[0]?.exists !== true) {
      console.log("ℹ️ badge_assertions table doesn't exist yet, skipping migration");
      console.log("✅ CI will handle table creation with evidence_url column included");
      return;
    }

    // Now check if the column already exists
    const columnExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'badge_assertions'
        AND column_name = 'evidence_url'
      )
    `);

    if (columnExists.rows?.[0]?.exists === true) {
      console.log("✅ evidence_url column already exists, skipping migration");
      return;
    }

    // Add the evidence_url column
    await db.execute(sql`
      ALTER TABLE badge_assertions
      ADD COLUMN IF NOT EXISTS evidence_url text
    `);

    console.log("✅ Successfully added evidence_url column to badge_assertions table");
  } catch (error) {
    console.error("❌ Error adding evidence_url column:", error);
    // Don't fail CI if the table doesn't exist yet
    if (error.message && error.message.includes("relation") && error.message.includes("does not exist")) {
      console.log("ℹ️ Tables don't exist yet, skipping migration");
      console.log("✅ CI will handle table creation with evidence_url column included");
      process.exit(0); // Exit successfully
    } else {
    throw error;
    }
  } finally {
    // Close the connection
    if (dbPool) {
      await dbPool.end();
    }
  }
}

runMigration()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
