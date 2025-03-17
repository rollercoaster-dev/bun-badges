import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { Role } from "../../middleware/auth";
import { mock, expect } from "bun:test";

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
) {
  const c = {
    req: {
      header: (name: string) => {
        if (name === "Authorization") return options.headers?.Authorization;
        return options.headers?.[name] ?? null;
      },
      param: (name: string) => options.params?.[name] ?? null,
      query: (name: string) => options.query?.[name] ?? null,
      json: () => Promise.resolve(options.body || {}),
    },
    set: (key: string, value: any) => {
      (c as any)[key] = value;
    },
    get: (key: string) => (c as any)[key],
    status: (code: number) => {
      (c as any).statusCode = code;
      return c;
    },
    json: (data: any, status?: number) => {
      (c as any).body = data;
      if (status) (c as any).statusCode = status;
      (c as any).finalized = true;
      return c;
    },
    text: (data: string, status?: number) => {
      (c as any).body = data;
      if (status) (c as any).statusCode = status;
      (c as any).finalized = true;
      return c;
    },
    finalized: false,
    statusCode: 200,
  } as unknown as Context;

  if (options.user) {
    c.set("user", options.user);
  }

  return c;
}

/**
 * Creates standard user objects for testing
 */
export function createTestUsers() {
  return {
    viewer: {
      id: "user123",
      roles: [Role.ISSUER_VIEWER],
      organizationId: "org123",
    },
    admin: {
      id: "admin123",
      roles: [Role.ISSUER_ADMIN],
      organizationId: "org123",
    },
    owner: {
      id: "owner123",
      roles: [Role.ISSUER_OWNER],
      organizationId: "org123",
    },
    superAdmin: {
      id: "super123",
      roles: [Role.ADMIN],
      organizationId: "org123",
    },
  };
}

/**
 * Standard mock JWT implementation for auth tests
 */
export function mockJwtModule() {
  const users = createTestUsers();

  return {
    verify: async (token: string) => {
      if (token === "valid-token") {
        return {
          sub: users.viewer.id,
          roles: users.viewer.roles,
          organizationId: users.viewer.organizationId,
          exp: Date.now() / 1000 + 3600,
        };
      } else if (token === "admin-token") {
        return {
          sub: users.admin.id,
          roles: users.admin.roles,
          organizationId: users.admin.organizationId,
          exp: Date.now() / 1000 + 3600,
        };
      } else if (token === "owner-token") {
        return {
          sub: users.owner.id,
          roles: users.owner.roles,
          organizationId: users.owner.organizationId,
          exp: Date.now() / 1000 + 3600,
        };
      } else if (token === "super-token") {
        return {
          sub: users.superAdmin.id,
          roles: users.superAdmin.roles,
          organizationId: users.superAdmin.organizationId,
          exp: Date.now() / 1000 + 3600,
        };
      }
      throw new Error("Invalid token");
    },
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
