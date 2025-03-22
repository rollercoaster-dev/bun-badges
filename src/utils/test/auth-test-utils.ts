import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { Role } from "../../middleware/auth";
import { mock, expect } from "bun:test";
import { createMockContext } from "./mock-context";

/**
 * Creates a mock context for testing auth middleware
 */
export function createAuthTestContext(
  options: {
    headers?: Record<string, string>;
    params?: Record<string, string>;
    query?: Record<string, string>;
    user?: any;
    body?: any;
  } = {},
): Context {
  return createMockContext(options) as Context;
}

/**
 * Creates test users for auth testing
 */
function createTestUsers() {
  return {
    admin: {
      userId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      roles: [Role.ADMIN],
    },
    issuerAdmin: {
      userId: "issuer-user",
      email: "issuer@example.com",
      name: "Issuer User",
      roles: [Role.ISSUER_ADMIN],
    },
    issuerViewer: {
      userId: "regular-user",
      email: "user@example.com",
      name: "Regular User",
      roles: [Role.ISSUER_VIEWER],
    },
  };
}

/**
 * Creates a mock JWT module for auth testing
 */
function mockJwtModule() {
  const users = createTestUsers();

  return {
    verify: mock((token: string, secret: string) => {
      if (token === "invalid-token") {
        throw new Error("Invalid token");
      }
      if (token === "admin-token") {
        return {
          sub: users.admin.userId,
          roles: users.admin.roles,
          exp: Math.floor(Date.now() / 1000) + 3600,
        };
      }
      if (token === "issuer-admin-token") {
        return {
          sub: users.issuerAdmin.userId,
          roles: users.issuerAdmin.roles,
          exp: Math.floor(Date.now() / 1000) + 3600,
        };
      }
      if (token === "issuer-viewer-token") {
        return {
          sub: users.issuerViewer.userId,
          roles: users.issuerViewer.roles,
          exp: Math.floor(Date.now() / 1000) + 3600,
        };
      }
      throw new Error("Invalid token");
    }),
    decode: mock((token: string) => {
      if (token === "invalid-token") {
        throw new Error("Invalid token");
      }
      if (token === "admin-token") {
        return {
          payload: {
            sub: users.admin.userId,
            roles: users.admin.roles,
            exp: Math.floor(Date.now() / 1000) + 3600,
          },
        };
      }
      if (token === "issuer-admin-token") {
        return {
          payload: {
            sub: users.issuerAdmin.userId,
            roles: users.issuerAdmin.roles,
            exp: Math.floor(Date.now() / 1000) + 3600,
          },
        };
      }
      if (token === "issuer-viewer-token") {
        return {
          payload: {
            sub: users.issuerViewer.userId,
            roles: users.issuerViewer.roles,
            exp: Math.floor(Date.now() / 1000) + 3600,
          },
        };
      }
      throw new Error("Invalid token");
    }),
    sign: mock((payload: any, secret: string) => {
      return "test-token";
    }),
  };
}

/**
 * Sets up the JWT module mock for auth testing
 */
export function setupJwtMock() {
  mock.module("hono/jwt", () => mockJwtModule());

  // Set environment variables
  process.env.JWT_SECRET = "test-secret";

  return {
    users: createTestUsers(),
  };
}

/**
 * Creates a standard next function for middleware testing
 */
export function createNextFunction() {
  return () => Promise.resolve();
}

/**
 * Creates a standard HTTP exception expectation for middleware testing
 */
export function expectHttpException(
  fn: Promise<any>,
  _status: number,
  _message?: string,
) {
  return expect(fn).rejects.toThrow(HTTPException);
}

/**
 * Helper function to execute a middleware chain for testing
 */
export async function runMiddlewareChain(
  middlewares: Array<(c: Context, next: () => Promise<void>) => Promise<void>>,
  c: Context,
) {
  let index = 0;

  const runNext = async () => {
    if (index < middlewares.length) {
      await middlewares[index++](c, runNext);
    }
  };

  await runNext();

  return c;
}

// Re-export the mock context
export { createMockContext };
