/**
 * Test SQL Utilities for PostgreSQL
 *
 * This file contains helpers for safe SQL query execution in test environments
 * with proper parameter handling to avoid SQL syntax errors.
 */

import { pool as dbPool } from "@/utils/test/integration-setup";

/**
 * Execute a parameterized SQL query safely
 *
 * @param query The SQL query string with $1, $2, etc. for parameters
 * @param params Array of parameters to substitute
 * @returns Query result rows
 */
export async function executeTestQuery<T>(
  query: string,
  params: any[] = [],
): Promise<T[]> {
  try {
    const result = await dbPool.query(query, params);
    return result.rows as T[];
  } catch (error) {
    console.error("SQL query execution error:", error);
    console.error("Query:", query);
    console.error("Parameters:", params);
    throw error;
  }
}

/**
 * Compare JSON objects from database with expected values
 * Handles both string and object representations
 *
 * @param actual JSON value from database (may be string or object)
 * @param expected Expected JSON value to compare against
 * @returns true if equivalent, false otherwise
 */
export function compareJsonFields(actual: any, expected: any): boolean {
  // Handle case where actual is a string but expected is an object
  const actualJson = typeof actual === "string" ? JSON.parse(actual) : actual;

  const expectedJson =
    typeof expected === "string" ? JSON.parse(expected) : expected;

  return JSON.stringify(actualJson) === JSON.stringify(expectedJson);
}

/**
 * Create a safe IN clause for PostgreSQL
 * Properly formats array parameters for IN clauses to avoid syntax errors
 *
 * @param values Array of values for the IN clause
 * @returns Formatted IN clause parameter
 */
export function createInClause(values: any[]): string {
  // Join values with proper escaping based on type
  return values
    .map((v) => {
      if (typeof v === "string") {
        // Escape strings and wrap in quotes
        return `'${v.replace(/'/g, "''")}'`;
      } else if (v === null) {
        return "NULL";
      } else {
        // Numbers and booleans can be converted directly
        return String(v);
      }
    })
    .join(", ");
}

/**
 * Create a JSON parameter for PostgreSQL
 * Safely formats a JSON object for use in queries
 *
 * @param value Object to convert to JSON parameter
 * @returns Formatted JSON string with proper escaping
 * @deprecated Use the toJsonb function from @/utils/db-helpers instead
 */
export function toJsonParam(value: any): string {
  console.warn(
    "⚠️ WARNING: toJsonParam is deprecated. Use the toJsonb function from @/utils/db-helpers instead.",
  );
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}
