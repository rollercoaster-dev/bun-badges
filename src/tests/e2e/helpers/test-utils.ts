/**
 * E2E Test Utilities
 *
 * This module provides helper functions and utilities for E2E testing,
 * making it easier to create standardized tests.
 */

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import supertest from "supertest";
import { dbPool } from "@/db/config";

/**
 * Create a test server with the provided Hono app
 * @param app Hono application to serve
 * @returns Test server instance and supertest client
 */
export function createTestServer(app: Hono) {
  // Start the server on a random port
  const server = serve({ fetch: app.fetch, port: 0 });
  const port = (server.address() as { port: number }).port;

  // Create supertest client
  const request = supertest(`http://localhost:${port}`);

  console.log(`Test server started on port ${port}`);

  return { server, request, port };
}

/**
 * Create a random test user
 * @param prefix Optional prefix for the email
 * @returns Test user credentials
 */
export function createTestUserData(prefix = "e2e_user") {
  const timestamp = Date.now();
  return {
    email: `${prefix}_${timestamp}@example.com`,
    password: `TestPassword123!${timestamp}`,
    name: `Test User ${timestamp}`,
  };
}

/**
 * Register and login a test user
 * @param request Supertest request object
 * @param userData User credentials (uses random user if not provided)
 * @param authBasePath Base path for auth endpoints (defaults to '/auth')
 * @returns User data with auth token
 */
export async function registerAndLoginUser(
  request: ReturnType<typeof supertest>,
  userData = createTestUserData(),
  authBasePath = "/auth",
) {
  // Register user
  const registerResponse = await request
    .post(`${authBasePath}/register`)
    .send(userData);

  if (registerResponse.status !== 201) {
    throw new Error(
      `Failed to register user: ${JSON.stringify(registerResponse.body)}`,
    );
  }

  // Login user
  const loginResponse = await request.post(`${authBasePath}/login`).send({
    email: userData.email,
    password: userData.password,
  });

  if (loginResponse.status !== 200 || !loginResponse.body.token) {
    throw new Error(
      `Failed to login user: ${JSON.stringify(loginResponse.body)}`,
    );
  }

  return {
    ...userData,
    token: loginResponse.body.token,
    userId: loginResponse.body.user.id,
  };
}

/**
 * Clean up test resources (server and database)
 * @param server Server instance to close
 */
export async function cleanupTestResources(server: ReturnType<typeof serve>) {
  // Close server
  server.close();

  // Don't close database connection here - this will be handled in the global cleanup
  // to prevent "Cannot use a pool after calling end on the pool" errors
  // when running multiple test files
}

/**
 * Reset the database to a clean state for testing
 * @param tables Tables to truncate (defaults to all)
 */
export async function resetDatabase(tables?: string[]) {
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

    // Truncate all tables
    for (const table of tables) {
      await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
    }

    // Reset sequences
    const seqResult = await client.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);

    for (const seq of seqResult.rows) {
      await client.query(
        `ALTER SEQUENCE "${seq.sequence_name}" RESTART WITH 1`,
      );
    }

    // Re-enable triggers
    await client.query("SET session_replication_role = DEFAULT");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Make an authenticated request
 * @param request Supertest request object
 * @param method HTTP method
 * @param url URL to request
 * @param token Auth token
 * @param body Optional request body
 * @returns Supertest response
 */
export function authenticatedRequest(
  request: ReturnType<typeof supertest>,
  method: "get" | "post" | "put" | "delete" | "patch",
  url: string,
  token: string,
  body?: any,
) {
  const req = request[method](url).set("Authorization", `Bearer ${token}`);

  if (body && ["post", "put", "patch"].includes(method)) {
    return req.send(body);
  }

  return req;
}

/**
 * Example E2E test flow for convenience
 * @example
 * ```ts
 * // In your test file:
 * import { describe, it, beforeAll, afterAll } from 'vitest';
 * import { testFlow, createTestServer } from './test-utils';
 * import { app } from '@/app';
 *
 * describe('User API', () => {
 *   const { server, request } = createTestServer(app);
 *
 *   afterAll(async () => {
 *     await cleanupTestResources(server);
 *   });
 *
 *   it('should complete the entire flow', async () => {
 *     await testFlow(request);
 *   });
 * });
 * ```
 */
export async function testFlow(request: ReturnType<typeof supertest>) {
  // 1. Health check
  const healthResponse = await request.get("/health");
  if (healthResponse.status !== 200) {
    throw new Error("Health check failed");
  }

  // 2. Register and login
  const user = await registerAndLoginUser(request);

  // 3. Access protected endpoint
  const protectedResponse = await authenticatedRequest(
    request,
    "get",
    "/badges/private",
    user.token,
  );

  if (protectedResponse.status !== 200) {
    throw new Error("Protected endpoint access failed");
  }

  return {
    user,
    responses: { health: healthResponse, protected: protectedResponse },
  };
}
