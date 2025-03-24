// Test different ways of importing jsonb from drizzle-orm 0.41.0

// Test 1: Direct pg-core import
import { jsonb } from "drizzle-orm/pg-core";
console.log(
  "Test 1 (pg-core direct import):",
  typeof jsonb === "function" ? "SUCCESS" : "FAILED",
);

// Test 3: Destructured import
const { jsonb: jsonb2 } = require("drizzle-orm/pg-core");
console.log(
  "Test 3 (destructured require):",
  typeof jsonb2 === "function" ? "SUCCESS" : "FAILED",
);

// Log the version of drizzle-orm
const pkg = require("drizzle-orm/package.json");
console.log("drizzle-orm version:", pkg.version);

// Test 4: Check if jsonb has properties
console.log("Test 4 (jsonb function properties):", Object.keys(jsonb));

// Test 5: Create a jsonb column type and check its methods
const jsonbCol = jsonb("test_column");
console.log("Test 5 (jsonb column methods):", Object.keys(jsonbCol));
