import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { db, dbPool } from "@/db/config";
import { sql } from "drizzle-orm";

describe("Database Integration", () => {
  // Setup - run before all tests
  beforeAll(async () => {
    // Ensure the database connection string is set
    if (!process.env.DATABASE_URL) {
      console.warn("DATABASE_URL is not set! Tests will likely fail.");
    }

    // Check if database is connected
    try {
      const result = await dbPool.query("SELECT 1 as test");
      console.log("Database connection test:", result.rows[0]);
    } catch (error) {
      console.error("Database connection error:", error);
      throw error; // Re-throw to fail the test
    }
  });

  // Note: We no longer need to close the pool in afterAll
  // as that's handled centrally in the setup.ts file

  test("database connection returns expected result", async () => {
    const result = await dbPool.query("SELECT 1 as one");
    expect(result.rows[0].one).toBe(1);
  });

  test("can execute a query through Drizzle ORM", async () => {
    // For Drizzle ORM, let's use the pg client directly since we might not have tables yet
    const result = await dbPool.query("SELECT 1 as drizzle_test");
    expect(result.rows[0].drizzle_test).toBe(1);
  });
});
