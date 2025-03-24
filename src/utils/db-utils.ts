/**
 * Database Utilities
 *
 * This module provides utility functions for working with the database,
 * especially for handling parameterized queries with proper type annotations.
 */

import { db, dbPool } from "@/db/config";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";

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
  params: any[],
  types: string[] = [],
): Promise<any> {
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
    console.error("Error executing typed query:", error);
    throw error;
  }
}

/**
 * Safe delete operation that falls back to SQL if ORM delete is not available
 *
 * @param tableName The name of the table to delete from
 * @param condition Optional WHERE condition string (without "WHERE")
 * @param params Optional parameters for the condition
 */
export async function safeDelete(
  tableName: string,
  condition?: string,
  params: any[] = [],
): Promise<void> {
  try {
    // Try direct SQL approach first since it's most reliable
    if (condition) {
      await executeTypedQuery(
        `DELETE FROM ${tableName} WHERE ${condition}`,
        params,
      );
    } else {
      await executeTypedQuery(`DELETE FROM ${tableName}`, []);
    }
  } catch (error) {
    console.error(`Failed to delete from ${tableName} with SQL:`, error);

    // Try to use ORM approach as fallback
    try {
      if (condition) {
        throw new Error("Conditional delete not supported in fallback mode");
      }

      // Try to find the table in the schema
      const schema = (db as any)?.["_schema"] || {};
      const table = schema[tableName];

      if (table) {
        await db.delete(table);
      } else {
        throw new Error(`Table ${tableName} not found in schema`);
      }
    } catch (ormError) {
      console.error(`Failed to delete from ${tableName} with ORM:`, ormError);
      throw error; // Throw the original error
    }
  }
}

/**
 * Safe insert operation that handles proper type annotations
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
  values: any[],
  types: string[] = [],
  returning: boolean = false,
): Promise<any> {
  try {
    // Build a parameterized query
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
    const sqlQuery = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})${returning ? " RETURNING *" : ""}`;

    // Try SQL approach first
    return await executeTypedQuery(sqlQuery, values, types);
  } catch (error) {
    console.error(`Failed to insert into ${tableName} with SQL:`, error);

    // Try ORM approach as fallback
    try {
      // Try to find the table in the schema
      const schema = (db as any)?.["_schema"] || {};
      const table = schema[tableName];

      if (table) {
        // Convert columns and values to an object
        const data: Record<string, any> = {};
        columns.forEach((col, i) => {
          data[col] = values[i];
        });

        // Insert using the ORM
        const result = db.insert(table).values(data);

        if (returning && typeof result["returning"] === "function") {
          return result.returning();
        }

        return result;
      } else {
        throw new Error(`Table ${tableName} not found in schema`);
      }
    } catch (ormError) {
      console.error(`Failed to insert into ${tableName} with ORM:`, ormError);
      throw error; // Throw the original error
    }
  }
}

/**
 * Safe update operation that handles proper type annotations
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
  values: any[],
  conditionColumn: string,
  conditionValue: any,
  types: string[] = [],
  returning: boolean = false,
): Promise<any> {
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

    // Execute with type annotations
    return await executeTypedQuery(sqlQuery, allValues, types);
  } catch (error) {
    console.error(`Failed to update table ${tableName} with SQL:`, error);

    // Try ORM approach as fallback
    try {
      // Try to find the table in the schema
      const schema = (db as any)?.["_schema"] || {};
      const table = schema[tableName];

      if (table) {
        // Convert columns and values to an object
        const data: Record<string, any> = {};
        columnsToUpdate.forEach((col, i) => {
          data[col] = values[i];
        });

        // Create a condition using the eq operator from drizzle-orm
        const condition = eq(table[conditionColumn], conditionValue);

        // Update using the ORM
        const result = db.update(table).set(data).where(condition);

        if (returning && typeof result["returning"] === "function") {
          return result.returning();
        }

        return result;
      } else {
        throw new Error(`Table ${tableName} not found in schema`);
      }
    } catch (ormError) {
      console.error(`Failed to update table ${tableName} with ORM:`, ormError);
      throw error; // Throw the original error
    }
  }
}
