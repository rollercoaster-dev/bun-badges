import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  createTestDatabaseConnection,
  ensureTablesExist,
} from "@/utils/test/db-test-utils";

// Create a managed database connection for this test file
const { pool, cleanup, runMigrations } =
  createTestDatabaseConnection("db-pool-test.ts");

describe("Database Pool Management", () => {
  // Run migrations and set up before all tests
  beforeAll(async () => {
    console.log("Setting up test database...");

    // Check if tables exist, run migrations if needed
    const tablesExist = await ensureTablesExist(pool);
    if (!tablesExist) {
      console.log("Tables don't exist, running migrations...");
      await runMigrations();
    }
  });

  // Clean up after all tests
  afterAll(async () => {
    console.log("Cleaning up test database connection...");
    await cleanup();
  });

  // Example tests
  test("should connect to database successfully", async () => {
    // Simple test query
    const result = await pool.query("SELECT 1 as test");
    expect(result.rows[0].test).toBe(1);
  });

  test("should have required tables after migrations", async () => {
    // Check for users table
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    expect(result.rows[0].exists).toBe(true);
  });

  test("should be able to insert and query data", async () => {
    // Insert test user
    const insertResult = await pool.query(`
      INSERT INTO users (user_id, email, name) 
      VALUES (gen_random_uuid(), 'test@example.com', 'Test User')
      RETURNING user_id;
    `);

    const userId = insertResult.rows[0].user_id;

    // Verify user was inserted
    const queryResult = await pool.query(
      `
      SELECT * FROM users WHERE user_id = $1;
    `,
      [userId],
    );

    expect(queryResult.rows.length).toBe(1);
    expect(queryResult.rows[0].email).toBe("test@example.com");
  });
});
