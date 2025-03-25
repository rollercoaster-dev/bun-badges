import { pgTable, jsonb, uuid, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  toJsonb,
  normalizeJsonb,
  compareJsonbValues,
} from "../../../src/utils/db-helpers";

console.log("⚠️ JSONB Helper Functions Example ⚠️");
console.log("------------------------------------");

// 1. Define a table with jsonb column
const exampleTable = pgTable("example_table", {
  id: uuid("id").primaryKey().defaultRandom(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. Example object we want to store
const exampleObject = {
  type: "Example",
  name: "Test Object",
  tags: ["tag1", "tag2"],
  nested: {
    key1: "value1",
    key2: 123,
  },
};

// 3. Example of how to build a proper SQL query for insertion
console.log("\n🔍 Inserting JSONB Data");
console.log("----------------------");

// This is the wrong way (may insert as string):
// @ts-ignore - This is only for demonstration
const wrongInsertSql = `
  INSERT INTO example_table (data) 
  VALUES (${JSON.stringify(exampleObject)})
`;

// This is the correct way using the helper:
// @ts-ignore - This is only for demonstration
const correctInsertSql = sql`
  INSERT INTO ${exampleTable} (data)
  VALUES (${toJsonb(exampleObject)})
`;

// The SQL that would be generated (simplified):
console.log("✓ Correct SQL (using helper):");
console.log("    INSERT INTO example_table (data) VALUES ($1::jsonb)");
console.log("    With parameter:", JSON.stringify(exampleObject));

// 4. Example of how to read and normalize values
console.log("\n🔍 Reading JSONB Data");
console.log("-------------------");

// Simulate two different ways we might get the data back
const asObject = { ...exampleObject }; // Simulating when we get back an object
const asString = JSON.stringify(exampleObject); // Simulating when we get back a string

// Using the normalizeJsonb helper
const normalizedObject = normalizeJsonb(asObject);
const normalizedString = normalizeJsonb(asString);

console.log(
  "✓ Normalizing an object:",
  typeof normalizedObject === "object" ? "Success" : "Failed",
);
console.log(
  "✓ Normalizing a string:",
  typeof normalizedString === "object" ? "Success" : "Failed",
);

// 5. Example of comparing values in tests
console.log("\n🔍 Comparing JSONB Values in Tests");
console.log("-------------------------------");

const expectedValue = { ...exampleObject };
const actualAsObject = { ...exampleObject };
const actualAsString = JSON.stringify(exampleObject);

// Simulating a case where properties are in different order
const actualReordered = {
  name: "Test Object",
  type: "Example",
  nested: {
    key2: 123,
    key1: "value1",
  },
  tags: ["tag1", "tag2"],
};

// Test with nested property differences
const actualWithDeeplyReorderedProps = {
  type: "Example",
  name: "Test Object",
  tags: ["tag1", "tag2"],
  nested: {
    // Order of these nested properties is different
    key2: 123,
    key1: "value1",
  },
};

// Test with nested array order differences
const actualWithArrayReordering = {
  type: "Example",
  name: "Test Object",
  // Order of array elements is different
  tags: ["tag2", "tag1"],
  nested: {
    key1: "value1",
    key2: 123,
  },
};

console.log(
  "✓ Object comparison:",
  compareJsonbValues(actualAsObject, expectedValue) ? "Success" : "Failed",
);
console.log(
  "✓ String comparison:",
  compareJsonbValues(actualAsString, expectedValue) ? "Success" : "Failed",
);
console.log(
  "✓ Reordered properties:",
  compareJsonbValues(actualReordered, expectedValue) ? "Success" : "Failed",
);
console.log(
  "✓ Deeply reordered properties:",
  compareJsonbValues(actualWithDeeplyReorderedProps, expectedValue)
    ? "Success"
    : "Failed",
);
console.log(
  "✓ Array order difference (should fail):",
  !compareJsonbValues(actualWithArrayReordering, expectedValue)
    ? "Success"
    : "Failed",
);

console.log("\n⚠️ Summary");
console.log("---------");
console.log("1. Always use the toJsonb() helper when inserting JSON data");
console.log("2. Use normalizeJsonb() when reading JSON values");
console.log("3. Use compareJsonbValues() in tests for reliable comparisons");
console.log("4. See JSONB-NOTES.md for full documentation");
