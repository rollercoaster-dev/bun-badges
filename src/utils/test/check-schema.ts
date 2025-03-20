import { db } from "@/db/config";
import { sql } from "drizzle-orm";

async function checkSchema() {
  try {
    console.log("Checking schema for issuer_profiles table...");

    const columnsResult = await db.execute(sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'issuer_profiles'
      ORDER BY ordinal_position
    `);

    console.log("Columns in issuer_profiles table:");
    for (const row of columnsResult.rows) {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    }

    // Check specifically for public_key column
    const publicKeyResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'issuer_profiles'
      AND column_name = 'public_key'
    `);

    if (publicKeyResult.rows.length > 0) {
      console.log("\npublic_key column exists in issuer_profiles table");
    } else {
      console.log(
        "\npublic_key column DOES NOT exist in issuer_profiles table",
      );
    }
  } catch (error) {
    console.error("Error checking schema:", error);
  } finally {
    // Close the database connection
    // The drizzle-orm db object doesn't have an end method
    // The pool is managed by the application lifecycle
  }
}

// Run the function
checkSchema();
