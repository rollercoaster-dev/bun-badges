import { pgTable, jsonb, uuid, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Define a simple schema with a jsonb column, similar to your real schema
const testTable = pgTable("test_jsonb_table", {
  id: uuid("id").primaryKey().defaultRandom(),
  dataJson: jsonb("data_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// For simulation only, we won't actually connect to a database
const simulateInsert = () => {
  // 1. Test that jsonb is a function
  console.log("Is jsonb a function?", typeof jsonb === "function");

  // 2. Create a table definition with jsonb
  console.log("Table definition:", "test_jsonb_table");

  // 3. Try to build an insert query like your tests do
  const testData = {
    type: "TestType",
    name: "Test Name",
    description: "Test Description",
  };

  try {
    // This simulates what happens in integration tests
    const query = sql`
      INSERT INTO ${testTable} (data_json)
      VALUES (${JSON.stringify(testData)}::jsonb)
      RETURNING *
    `;

    console.log("SQL query built successfully");

    // 4. Try with another method that drizzle might use internally
    const insertObj = {
      dataJson: testData,
    };

    // This is how Drizzle ORM might handle the insert
    console.log("Insert object prepared:", insertObj);
  } catch (error) {
    console.error("Error building query:", error);
  }
};

// Run the test
console.log("Testing jsonb usage from drizzle-orm v0.41.0");
simulateInsert();
