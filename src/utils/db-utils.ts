/**
 * Database Utilities
 *
 * This module provides utility functions for working with the database,
 * especially for handling parameterized queries with proper type annotations.
 */

import { db, dbPool } from "@/db/config";
import { sql } from "drizzle-orm";
import logger from "@/utils/logger";
// Import necessary Drizzle types if possible, otherwise use 'any' loosely

// Create logger instance
const baseLogger = logger.child({ context: "DbUtils" });

/**
 * Execute a SQL query with proper type annotations
 * This helps PostgreSQL properly interpret parameter types
 *
 * @param sqlQuery The SQL query with $1, $2, etc. placeholders
 * @param params The parameters to bind to the query
 * @param types Optional array of type annotations (e.g., "uuid", "jsonb", "boolean")
 * @returns The query result
 */
export async function executeTypedQuery(
  sqlQuery: string,
  params: unknown[],
  types: string[] = [],
): Promise<unknown> {
  // Build a modified query with type annotations if needed
  let typedSql = sqlQuery;

  if (types.length > 0) {
    // Create a new query with type annotations
    // This is a simplistic approach which might not work for complex SQL
    params.forEach((_, index) => {
      if (types[index]) {
        const search = new RegExp(`\\$${index + 1}(?![0-9])`, "g");
        typedSql = typedSql.replace(search, `$${index + 1}::${types[index]}`);
      }
    });
  }

  try {
    // First try with db.execute if available
    if (db && typeof db.execute === "function") {
      return await db.execute(typedSql);
    }
    // Otherwise try with dbPool
    else if (dbPool && typeof dbPool.query === "function") {
      return await dbPool.query(typedSql, params);
    }
    // If still no success, try with sql-tagged template if possible
    else if (db && typeof sql === "function") {
      // This approach doesn't use the types parameter but at least gives a fallback
      const sqlTemplate = sql.raw(sqlQuery);
      return await db.execute(sqlTemplate);
    }
    // Last resort - throw an error
    else {
      throw new Error("No database execution method available");
    }
  } catch (error) {
    baseLogger.error(error, "Error executing typed query:");
    throw error;
  }
}

/**
 * Safe delete operation using executeTypedQuery.
 *
 * @param tableName The name of the table to delete from
 * @param condition Optional WHERE condition string (without "WHERE")
 * @param params Optional parameters for the condition
 */
export async function safeDelete(
  tableName: string,
  condition?: string,
  params: unknown[] = [],
): Promise<void> {
  try {
    // Use direct SQL approach via executeTypedQuery
    if (condition) {
      await executeTypedQuery(
        `DELETE FROM ${tableName} WHERE ${condition}`,
        params,
      );
    } else {
      await executeTypedQuery(`DELETE FROM ${tableName}`, []);
    }
  } catch (error) {
    // Log the error from the SQL attempt and rethrow
    baseLogger.error(error, `Failed to delete from ${tableName} with SQL:`);
    throw error;
  }
}

/**
 * Safe insert operation using executeTypedQuery.
 *
 * @param tableName The name of the table to insert into
 * @param columns Array of column names
 * @param values Array of values to insert
 * @param types Optional array of type annotations for each value
 * @param returning Whether to return the inserted row(s)
 * @returns The inserted row(s) if returning is true
 */
export async function safeInsert(
  tableName: string,
  columns: string[],
  values: unknown[],
  types: string[] = [],
  returning: boolean = false,
): Promise<unknown> {
  try {
    // Build a parameterized query
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
    const sqlQuery = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})${returning ? " RETURNING *" : ""}`;

    // Use SQL approach via executeTypedQuery
    return await executeTypedQuery(sqlQuery, values, types);
  } catch (error) {
    // Log the error from the SQL attempt and rethrow
    baseLogger.error(error, `Failed to insert into ${tableName} with SQL:`);
    throw error;
  }
}

/**
 * Safe update operation using executeTypedQuery.
 *
 * @param tableName The name of the table to update
 * @param columnsToUpdate Array of column names to update
 * @param values Array of values to set for each column
 * @param conditionColumn The column name to use in the WHERE clause
 * @param conditionValue The value to match in the WHERE clause
 * @param types Optional array of type annotations for all values (update values first, then condition value)
 * @param returning Whether to return the updated row(s)
 * @returns The updated row(s) if returning is true
 */
export async function safeUpdate(
  tableName: string,
  columnsToUpdate: string[],
  values: unknown[],
  conditionColumn: string,
  conditionValue: unknown,
  types: string[] = [],
  returning: boolean = false,
): Promise<unknown> {
  try {
    // Build the SET clause
    const setClauses = columnsToUpdate
      .map((col, i) => `${col} = $${i + 1}`)
      .join(", ");

    // Build the full query
    const conditionIndex = values.length + 1;
    const sqlQuery = `UPDATE ${tableName} SET ${setClauses} WHERE ${conditionColumn} = $${conditionIndex}${returning ? " RETURNING *" : ""}`;

    // All values plus the condition value
    const allValues = [...values, conditionValue];

    // Execute with type annotations via executeTypedQuery
    return await executeTypedQuery(sqlQuery, allValues, types);
  } catch (error) {
    // Log the error from the SQL attempt and rethrow
    baseLogger.error(error, `Failed to update table ${tableName} with SQL:`);
    throw error;
  }
}
