/**
 * E2E Test Database Utilities
 *
 * This module provides functions for database operations in E2E tests,
 * with improved isolation between test runs.
 */

import { dbPool } from "@/db/config";

/**
 * Resets the database to a clean state for testing
 * @param tables Tables to truncate (defaults to all)
 * @param resetSequences Whether to reset sequences (defaults to true)
 */
export async function resetDatabase(tables?: string[], resetSequences = true) {
  // Get all tables if not specified
  if (!tables || tables.length === 0) {
    const result = await dbPool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `);
    tables = result.rows.map((row) => row.tablename);
  }

  // Start a transaction
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");

    // Disable triggers temporarily
    await client.query("SET session_replication_role = replica");

    // Truncate all specified tables
    for (const table of tables) {
      await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
    }

    // Track number of reset sequences
    let sequencesCount = 0;

    // Reset sequences if requested
    if (resetSequences) {
      const seqResult = await client.query(`
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
      `);

      sequencesCount = seqResult.rows.length;

      for (const seq of seqResult.rows) {
        await client.query(
          `ALTER SEQUENCE "${seq.sequence_name}" RESTART WITH 1`,
        );
      }
    }

    // Re-enable triggers
    await client.query("SET session_replication_role = DEFAULT");

    await client.query("COMMIT");

    return {
      tablesReset: tables.length,
      sequencesReset: sequencesCount,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Creates a sandbox transaction for test isolation
 * This allows tests to run in a transaction that gets rolled back
 * @returns Transaction object with commit/rollback functions
 */
export async function createTestTransaction() {
  const client = await dbPool.connect();

  // Begin transaction and disable triggers to avoid side effects
  await client.query("BEGIN");
  await client.query("SET session_replication_role = replica");

  return {
    client,

    // Execute a query within the transaction
    async query(text: string, params?: any[]) {
      return client.query(text, params);
    },

    // Commit the transaction (rarely used in tests)
    async commit() {
      await client.query("SET session_replication_role = DEFAULT");
      await client.query("COMMIT");
      client.release();
    },

    // Rollback the transaction (used to clean up after tests)
    async rollback() {
      await client.query("SET session_replication_role = DEFAULT");
      await client.query("ROLLBACK");
      client.release();
    },
  };
}

/**
 * Creates a temporary table for test data
 * @param tableName Name for the temporary table
 * @param schema Table schema definition
 * @returns The created table name (may be modified to ensure uniqueness)
 */
export async function createTemporaryTable(tableName: string, schema: string) {
  // Add a timestamp to ensure uniqueness
  const uniqueTableName = `${tableName}_${Date.now()}`;

  await dbPool.query(`
    CREATE TEMPORARY TABLE ${uniqueTableName} (
      ${schema}
    ) ON COMMIT DROP
  `);

  return uniqueTableName;
}

/**
 * Inserts seed data for testing
 * @param table Table to insert into
 * @param columns Column names
 * @param values Array of value arrays
 * @returns Count of inserted rows
 */
export async function insertSeedData(
  table: string,
  columns: string[],
  values: any[][],
) {
  if (values.length === 0) {
    return 0;
  }

  // Create placeholders for parameterized query
  const placeholderGroups = values.map(
    (row, rowIndex) =>
      `(${row.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(", ")})`,
  );

  // Flatten values array
  const flatValues = values.flat();

  // Build and execute query
  const query = `
    INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")})
    VALUES ${placeholderGroups.join(", ")}
    RETURNING *
  `;

  const result = await dbPool.query(query, flatValues);
  return result.rowCount || 0;
}

/**
 * Utility to ensure database connectivity
 * @returns Information about the database connection
 */
export async function checkDatabaseConnection() {
  try {
    const client = await dbPool.connect();

    try {
      // Get database information
      const {
        rows: [dbInfo],
      } = await client.query(`
        SELECT 
          current_database() as database,
          current_schema() as schema,
          version() as version
      `);

      // Check connection count
      const {
        rows: [poolInfo],
      } = await client.query(`
        SELECT 
          numbackends as active_connections
        FROM pg_stat_database 
        WHERE datname = current_database()
      `);

      return {
        connected: true,
        ...dbInfo,
        connections: {
          active: parseInt(poolInfo.active_connections),
          pool: {
            total: dbPool.totalCount,
            idle: dbPool.idleCount,
            waiting: dbPool.waitingCount,
          },
        },
      };
    } finally {
      client.release();
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
