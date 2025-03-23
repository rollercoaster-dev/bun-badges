/**
 * E2E Test Environment Setup
 *
 * This module handles environment configuration for E2E tests,
 * ensuring consistent test environments across test runs.
 */

import { randomUUID } from "crypto";
import { dbPool } from "@/db/config";

// Generate a unique run ID for this test run
export const testRunId = randomUUID();

/**
 * Prepares the environment for E2E testing
 */
export async function setupTestEnvironment() {
  // Set environment variables for testing
  process.env.NODE_ENV = "test";
  process.env.E2E_TEST = "true";
  process.env.TEST_RUN_ID = testRunId;

  // Configure test-specific environment variables if not already set
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = `test-jwt-secret-${testRunId}`;
  }

  if (!process.env.AUTH_TOKEN_EXPIRY) {
    process.env.AUTH_TOKEN_EXPIRY = "1d";
  }

  if (!process.env.LOG_LEVEL) {
    process.env.LOG_LEVEL = "error"; // Suppress non-error logs during tests
  }

  console.log(`Setting up test environment with run ID: ${testRunId}`);

  // Verify database connection
  try {
    const client = await dbPool.connect();
    client.release();
    console.log("Database connection verified");
  } catch (error) {
    console.error("Database connection failed:", error);
    throw new Error("Failed to connect to the test database");
  }

  return {
    testRunId,
    env: {
      nodeEnv: process.env.NODE_ENV,
      jwtSecret: process.env.JWT_SECRET,
      authTokenExpiry: process.env.AUTH_TOKEN_EXPIRY,
      logLevel: process.env.LOG_LEVEL,
    },
  };
}

/**
 * Tears down the test environment
 */
export async function teardownTestEnvironment() {
  console.log(`Tearing down test environment with run ID: ${testRunId}`);

  // Close database pool
  try {
    await dbPool.end();
    console.log("Database pool closed");
  } catch (error) {
    console.error("Error closing database pool:", error);
  }
}

/**
 * Creates a test-specific database schema
 * @param schema Schema name (defaults to based on test run ID)
 */
export async function createTestSchema(
  schema = `test_${testRunId.replace(/-/g, "_")}`,
) {
  const client = await dbPool.connect();

  try {
    // Create a new schema for this test run
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);

    // Set the search path for this connection
    await client.query(`SET search_path TO ${schema}, public`);

    return schema;
  } finally {
    client.release();
  }
}

/**
 * Drops a test-specific database schema
 * @param schema Schema name to drop
 */
export async function dropTestSchema(schema: string) {
  const client = await dbPool.connect();

  try {
    // Drop the schema and all its objects
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  } finally {
    client.release();
  }
}

/**
 * Creates a transaction for test isolation
 * @returns Client and functions to commit/rollback the transaction
 */
export async function createTestTransaction() {
  const client = await dbPool.connect();

  await client.query("BEGIN");

  return {
    client,
    async commit() {
      await client.query("COMMIT");
      client.release();
    },
    async rollback() {
      await client.query("ROLLBACK");
      client.release();
    },
  };
}
