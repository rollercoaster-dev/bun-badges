/**
 * E2E Test Server Setup
 *
 * This module provides functions for creating and managing test server instances
 * with proper isolation between test runs.
 */

import { Hono } from "hono";
import { testRunId } from "./environment";

interface TestServerOptions {
  /**
   * Whether to log server startup (defaults to false)
   */
  silent?: boolean;

  /**
   * Server label for logging (defaults to test run ID)
   */
  label?: string;
}

/**
 * Creates a test client for the provided Hono app
 * This uses Hono's built-in testing capabilities instead of starting a real server
 *
 * @param app Hono application to test
 * @param options Configuration options
 * @returns Test client and utilities
 */
export function createTestServer(app: Hono, options: TestServerOptions = {}) {
  // Default options
  const { silent = false, label = `test-server-${testRunId.slice(0, 8)}` } =
    options;

  if (!silent) {
    console.log(`Test client '${label}' created`);
  }

  // Create a simplified request function that wraps app.request
  const request = {
    async get(path: string, headers: Record<string, string> = {}) {
      const response = await app.request(path, { method: "GET", headers });
      return {
        status: response.status,
        body: await response.json().catch(() => ({})),
        headers: Object.fromEntries(response.headers.entries()),
        text: async () => await response.text(),
      };
    },

    async post(path: string, body?: any, headers: Record<string, string> = {}) {
      const requestInit: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      };

      if (body) {
        requestInit.body = JSON.stringify(body);
      }

      const response = await app.request(path, requestInit);
      return {
        status: response.status,
        body: await response.json().catch(() => ({})),
        headers: Object.fromEntries(response.headers.entries()),
        text: async () => await response.text(),
      };
    },

    async put(path: string, body?: any, headers: Record<string, string> = {}) {
      const requestInit: RequestInit = {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      };

      if (body) {
        requestInit.body = JSON.stringify(body);
      }

      const response = await app.request(path, requestInit);
      return {
        status: response.status,
        body: await response.json().catch(() => ({})),
        headers: Object.fromEntries(response.headers.entries()),
        text: async () => await response.text(),
      };
    },

    async delete(path: string, headers: Record<string, string> = {}) {
      const response = await app.request(path, { method: "DELETE", headers });
      return {
        status: response.status,
        body: await response.json().catch(() => ({})),
        headers: Object.fromEntries(response.headers.entries()),
        text: async () => await response.text(),
      };
    },

    // Special helper for authenticated requests
    async authRequest(
      method: "get" | "post" | "put" | "delete",
      path: string,
      token: string,
      body?: any,
    ) {
      const headers = { Authorization: `Bearer ${token}` };
      if (method === "get" || method === "delete") {
        return await this[method](path, headers);
      } else {
        return await this[method](path, body, headers);
      }
    },
  };

  // Return a mock server object to maintain API compatibility
  const mockServer = {
    close: () => {
      if (!silent) {
        console.log(`Test client '${label}' closed`);
      }
    },
  };

  return {
    server: mockServer,
    request,
    label,
  };
}

/**
 * Creates a test app with common middleware and routes
 * @returns Configured Hono app for testing
 */
export function createTestApp() {
  const app = new Hono();

  // Add health check
  app.get("/health", (c) => c.json({ status: "ok", testRunId }));

  // Add request logging middleware if needed
  if (process.env.LOG_REQUESTS === "true") {
    app.use("*", async (c, next) => {
      const start = Date.now();
      await next();
      const end = Date.now();
      console.log(`[${c.req.method}] ${c.req.url} - ${end - start}ms`);
    });
  }

  return app;
}

/**
 * Creates test authentication routes for testing
 * @param app Hono app to add routes to
 */
export function addTestAuthRoutes(app: Hono) {
  // Register endpoint
  app.post("/auth/register", async (c) => {
    const body = await c.req.json();
    return c.json(
      {
        id: `test-user-${Date.now()}`,
        email: body.email,
        name: body.name,
      },
      201,
    );
  });

  // Login endpoint
  app.post("/auth/login", async (c) => {
    const body = await c.req.json();
    return c.json(
      {
        token: `test-token-${Date.now()}`,
        user: {
          id: `test-user-${Date.now()}`,
          email: body.email,
          name: body.name || "Test User",
        },
      },
      200,
    );
  });

  return app;
}
