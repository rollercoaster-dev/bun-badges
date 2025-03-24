import { dbPool } from "./config";

async function listTables() {
  try {
    console.log("Checking database connection and tables...");

    // Check if tables exist
    const res = await dbPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    if (res.rows.length === 0) {
      console.log("No tables found. Database may need migrations.");
    } else {
      console.log("Found tables:");
      res.rows.forEach((row: { table_name: string }) => {
        console.log(`- ${row.table_name}`);
      });
    }
  } catch (err) {
    console.error("Error connecting to database:", err);
    process.exit(1);
  }
}

listTables().catch(console.error);
