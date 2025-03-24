import { dbPool } from "./config";

async function listTables() {
  try {
    console.log("Checking database tables...");

    // Check if tables exist
    const res = await dbPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    if (res.rows.length === 0) {
      console.error("❌ No tables found in database!");
      process.exit(1);
    } else {
      console.log("✅ Found tables:");
      res.rows.forEach((row) => {
        console.log(`- ${row.table_name}`);
      });

      // Check for critical tables
      const tableNames = res.rows.map((row) => row.table_name);
      const requiredTables = ["users", "issuer_profiles", "credentials"];
      const missingTables = requiredTables.filter(
        (table) => !tableNames.includes(table),
      );

      if (missingTables.length > 0) {
        console.error(
          `❌ Missing required tables: ${missingTables.join(", ")}`,
        );
        process.exit(1);
      } else {
        console.log("✅ All required tables exist");
      }
    }
  } catch (err) {
    console.error("❌ Error connecting to database:", err);
    process.exit(1);
  }
}

// Run the function
listTables().catch((err) => {
  console.error("❌ Unhandled error:", err);
  process.exit(1);
});
