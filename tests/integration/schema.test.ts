import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { db, dbPool } from "../../src/db/config";

describe("Database Schema Integration", () => {
  beforeAll(async () => {
    // Create a test table for this integration test
    try {
      await dbPool.query(`
        CREATE TABLE IF NOT EXISTS test_table (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.log("✅ Test table created successfully");
    } catch (error) {
      console.error("❌ Failed to create test table:", error);
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up the test table
    try {
      await dbPool.query("DROP TABLE IF EXISTS test_table");
      console.log("✅ Test table cleaned up successfully");
      // No longer closing pool here - it's handled in setup.ts
    } catch (error) {
      console.error("❌ Failed to clean up test table:", error);
    }
  });

  test("can insert and retrieve data from test table", async () => {
    // Insert a test record
    const insertResult = await dbPool.query(
      "INSERT INTO test_table (name) VALUES ($1) RETURNING *",
      ["test_name"],
    );

    // Check if insertResult has rows and the expected data
    expect(insertResult.rows).toBeDefined();
    expect(insertResult.rows.length).toBeGreaterThan(0);
    expect(insertResult.rows[0].name).toBe("test_name");
    expect(insertResult.rows[0].id).toBeDefined();

    // Retrieve the record
    const selectResult = await dbPool.query(
      "SELECT * FROM test_table WHERE name = $1",
      ["test_name"],
    );

    // Check if selectResult has rows and the expected data
    expect(selectResult.rows).toBeDefined();
    expect(selectResult.rows.length).toBe(1);
    expect(selectResult.rows[0].name).toBe("test_name");
  });

  test("can update data in test table", async () => {
    // Insert a test record
    const insertResult = await dbPool.query(
      "INSERT INTO test_table (name) VALUES ($1) RETURNING id",
      ["update_test"],
    );

    // Verify insert worked properly
    expect(insertResult.rows).toBeDefined();
    expect(insertResult.rows.length).toBeGreaterThan(0);
    const id = insertResult.rows[0].id;
    expect(id).toBeDefined();

    // Update the record
    await dbPool.query("UPDATE test_table SET name = $1 WHERE id = $2", [
      "updated_name",
      id,
    ]);

    // Verify the update
    const selectResult = await dbPool.query(
      "SELECT * FROM test_table WHERE id = $1",
      [id],
    );

    // Check if selectResult has rows and the expected data
    expect(selectResult.rows).toBeDefined();
    expect(selectResult.rows.length).toBeGreaterThan(0);
    expect(selectResult.rows[0].name).toBe("updated_name");
  });

  test("can delete data from test table", async () => {
    // Insert a test record
    const insertResult = await dbPool.query(
      "INSERT INTO test_table (name) VALUES ($1) RETURNING id",
      ["delete_test"],
    );

    // Verify insert worked properly
    expect(insertResult.rows).toBeDefined();
    expect(insertResult.rows.length).toBeGreaterThan(0);
    const id = insertResult.rows[0].id;
    expect(id).toBeDefined();

    // Delete the record
    await dbPool.query("DELETE FROM test_table WHERE id = $1", [id]);

    // Verify the delete
    const selectResult = await dbPool.query(
      "SELECT * FROM test_table WHERE id = $1",
      [id],
    );

    // Check if selectResult has rows
    expect(selectResult.rows).toBeDefined();
    expect(selectResult.rows.length).toBe(0);
  });
});
