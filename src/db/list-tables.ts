import { db } from "./config";
import { sql } from "drizzle-orm";

async function listTables() {
  try {
    const result = await db.execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`,
    );
    console.log("Tables in the database:", result.rows);
  } catch (error) {
    console.error("Error listing tables:", error);
  }
}

listTables();
