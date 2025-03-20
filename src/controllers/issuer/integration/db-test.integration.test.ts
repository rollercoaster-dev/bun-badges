import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { testDb } from "@/utils/test/integration-setup";
import { sql } from "drizzle-orm";

describe("Database Connection Test", () => {
  beforeEach(async () => {
    console.log("Database connection test starting...");
  });

  afterEach(async () => {
    console.log("Database connection test completed");
  });

  test("should connect to database and run a query", async () => {
    console.log("Testing database connection...");
    console.log(
      `Using connection string: ${process.env.DATABASE_URL?.replace(/:[^:]*@/, ":***@")}`,
    );

    // Simple query to test database connection
    const result = await testDb.execute(sql`SELECT 1 as test`);

    expect(result).toBeDefined();
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].test).toBe(1);

    console.log("✅ Database connection successful");
  });

  test("should be able to check if tables exist", async () => {
    // Check if users table exists
    const result = await testDb.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'users'
      );
    `);

    const tableExists = result.rows[0]?.exists;
    console.log(`Users table exists: ${tableExists}`);

    expect(tableExists).toBeDefined();
    // We don't assert true/false since we don't know if the migrations have run yet

    console.log("✅ Table existence check successful");
  });
});
