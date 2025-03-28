import { sql } from "drizzle-orm";

/**
 * Helper function to properly format jsonb values for PostgreSQL
 * Works around issues with jsonb in drizzle-orm 0.41.0
 *
 * @param value - The object or array to convert to JSONB
 * @returns A properly formatted SQL expression for JSONB insertion
 */
export function toJsonb(value: unknown) {
  // When using drizzle-orm with SQL templates, we need to cast strings to jsonb
  return sql`${JSON.stringify(value)}::jsonb`;
}

/**
 * Helper function to check if a value is already a JSON string
 *
 * @param value - The value to check
 * @returns Whether the value is already a JSON string
 */
export function isJsonString(value: unknown): boolean {
  if (typeof value !== "string") return false;

  try {
    JSON.parse(value);
    // Check if it's a simple string that happens to be valid JSON
    const parsed = JSON.parse(value);
    return typeof parsed === "object" || Array.isArray(parsed);
  } catch {
    return false;
  }
}

/**
 * Helper function to normalize JSON values from the database
 * Handles both string-encoded and object representations
 *
 * @param value - JSON value from the database (may be string or object)
 * @returns The normalized object or array
 */
export function normalizeJsonb(value: unknown): unknown {
  if (value === null || value === undefined) return null;

  // If it's already an object or array, return it
  if (typeof value === "object") return value;

  // If it's a string, try to parse it
  if (typeof value === "string" && isJsonString(value)) {
    return JSON.parse(value);
  }

  // Otherwise return the original value
  return value;
}

/**
 * Compare JSON objects from database with expected values
 * Handles both string and object representations
 *
 * @param actual - JSON value from database (may be string or object)
 * @param expected - Expected JSON value to compare against
 * @returns Whether the values are equivalent
 */
export function compareJsonbValues(
  actual: unknown,
  expected: unknown,
): boolean {
  const normalizedActual = normalizeJsonb(actual);
  const normalizedExpected = normalizeJsonb(expected);

  // Use a deep comparison approach that sorts object keys for consistent ordering
  return deepCompareJson(normalizedActual, normalizedExpected);
}

/**
 * Deep comparison of JSON objects that handles property order differences
 *
 * @param a - First object to compare
 * @param b - Second object to compare
 * @returns Whether the objects are deeply equal
 */
function deepCompareJson(a: unknown, b: unknown): boolean {
  // Check if both are null/undefined
  if (a == null && b == null) return true;

  // If only one is null/undefined, they're not equal
  if (a == null || b == null) return false;

  // Check if types match
  if (typeof a !== typeof b) return false;

  // Handle primitive types
  if (typeof a !== "object") return a === b;

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;

    // Compare arrays item by item
    for (let i = 0; i < a.length; i++) {
      if (!deepCompareJson(a[i], b[i])) return false;
    }
    return true;
  }

  // If one is array and the other isn't, they're not equal
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  // Handle regular objects
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();

  // Check if they have the same number of keys
  if (keysA.length !== keysB.length) return false;

  // Check if all keys match
  if (!keysA.every((key, i) => key === keysB[i])) return false;

  // Deep compare values for each key
  return keysA.every((key) =>
    deepCompareJson(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key],
    ),
  );
}
