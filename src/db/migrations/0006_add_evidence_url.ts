import { sql } from "drizzle-orm";
import { db } from "../config";

/**
 * Migration to add the evidence_url column to the badge_assertions table
 */
export async function runMigration() {
  console.log("Running evidence_url column migration...");

  try {
    // Check if the column already exists
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
      ADD COLUMN evidence_url text
    `);

    console.log(
      "✅ Successfully added evidence_url column to badge_assertions table",
    );
  } catch (error) {
    console.error("❌ Error adding evidence_url column:", error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (import.meta.main) {
  runMigration()
    .then(() => {
      console.log("Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
