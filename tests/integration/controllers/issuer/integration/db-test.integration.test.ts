import { describe, expect, test, afterAll } from "bun:test";
import { testDb } from "@utils/test/integration-setup";
import { sql } from "drizzle-orm";

describe("Database Connection Test", () => {
  test("should connect to database and run a query", async () => {
    console.log("Database connection test starting...");
    console.log("Testing database connection...");

    // Print connection string with password obscured
    console.log(
      `Using connection string: ${process.env.DATABASE_URL?.replace(/:[^:]*@/, ":***@")}`,
    );

    // Simple query to test database connection
    const result = await testDb().execute(sql`SELECT 1 as test`);
    console.log("Database query result:", result);

    // Check if we got a result
    expect(result).toBeTruthy();
    expect(result.rows).toBeInstanceOf(Array);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].test).toBe(1);

    console.log("✅ Database connection successful");
  });

  test("should be able to check if tables exist", async () => {
    // Check if users table exists
    const result = await testDb().execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'users'
      );
    `);

    // Should return a boolean result
    expect(result).toBeTruthy();
    expect(result.rows).toBeInstanceOf(Array);
    expect(result.rows.length).toBe(1);
    expect(typeof result.rows[0].exists).toBe("boolean");

    console.log(`Table 'users' exists: ${result.rows[0].exists}`);
  });

  // Always run after all tests
  afterAll(() => {
    console.log("Database connection test completed");
  });
});
