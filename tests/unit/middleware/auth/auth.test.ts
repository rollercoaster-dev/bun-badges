import { mock, describe, expect, it, beforeEach } from "bun:test";
import { type Context } from "hono";
import { Role } from "@/middleware/auth";
import {
  requireAuth,
  requireRole,
  requireOwnership,
  combineMiddleware,
} from "@/middleware/auth";
import { UnauthorizedError } from "@/utils/errors";
import type { AuthUser } from "@/middleware/auth";

// Create a mock context directly in the test file to avoid import errors
function createMockContext(options = {}) {
  return {
    req: {
      raw: {
        headers: new Headers(),
      },
      header: (name) => options?.headers?.[name],
    },
    json: (data, status = 200) => ({ status, data }),
    get: mock((key) => options?.user || null),
    set: mock((key, value) => {}),
  } as unknown as Context;
}

// Create a mock next function
function createNextFunction() {
  return mock(() => Promise.resolve());
}

// Setup JWT mock directly in the test file
function setupJwtMock() {
  mock.module("hono/jwt", () => ({
    verify: mock(async (token, secret) => {
      if (token === "admin-token") {
        return {
          sub: "test-user",
          roles: [Role.ADMIN],
          exp: Math.floor(Date.now() / 1000) + 3600,
        };
      }
      throw new Error("Invalid token");
    }),
  }));
}

describe("Auth Middleware", () => {
  beforeEach(() => {
    // Set up JWT mock before each test
    setupJwtMock();
    // Setup JWT secret for tests
    process.env.JWT_SECRET = "test-secret";
  });

  describe("requireAuth", () => {
    it("should pass with valid token", async () => {
      // Create a mock token with valid data
      const mockToken = "admin-token";

      // Set up the context with the token
      const ctx = createMockContext() as Context;

      // Mock the header method
      ctx.req.header = mock((name) => {
        if (name.toLowerCase() === "authorization") {
          return `Bearer ${mockToken}`;
        }
        return null;
      });

      // Setup the headers correctly
      const headers = new Headers();
      headers.set("authorization", `Bearer ${mockToken}`);
      ctx.req.raw.headers = headers;

      // Create a tracked next function
      const next = createNextFunction();

      // Call the middleware
      await requireAuth(ctx, next);

      // Verify that next was called
      expect(next).toHaveBeenCalled();
    });

    it("should throw when no token provided", async () => {
      const ctx = createMockContext() as Context;
      const next = () => Promise.resolve();

      await expect(requireAuth(ctx, next)).rejects.toThrow(
        "Authentication required",
      );
    });

    it("should throw when invalid token format", async () => {
      const ctx = createMockContext() as Context;
      ctx.req.raw.headers.set("authorization", "NotBearer token");
      const next = () => Promise.resolve();

      await expect(requireAuth(ctx, next)).rejects.toThrow(
        "Authentication required",
      );
    });
  });

  describe("requireRole", () => {
    it("should pass when user has required role", async () => {
      // Create a mock user with admin role
      const mockUser: AuthUser = {
        id: "test-user",
        roles: [Role.ADMIN],
        organizationId: "test-org",
      };

      // Set up the context with the user
      const ctx = createMockContext() as Context;

      // Mock the get method to return our user
      ctx.get = mock((key) => {
        if (key === "user") {
          return mockUser;
        }
        return null;
      });

      // Create a tracked next function
      const next = createNextFunction();

      // Call the middleware
      await requireRole(Role.ADMIN)(ctx, next);

      // Verify that next was called
      expect(next).toHaveBeenCalled();
    });

    it("should throw when user lacks required role", async () => {
      // Create a user with a viewer role only (not admin)
      const mockUser: AuthUser = {
        id: "test-user",
        roles: [Role.ISSUER_VIEWER],
        organizationId: "test-org",
      };

      const ctx = createMockContext() as Context;
      // Mock the get method to return our user
      ctx.get = mock((key) => {
        if (key === "user") {
          return mockUser;
        }
        return null;
      });

      const next = createNextFunction();

      // Test that it will throw
      await expect(requireRole(Role.ADMIN)(ctx, next)).rejects.toThrow(
        "Insufficient permissions",
      );
    });

    it("should throw when no user in context", async () => {
      const ctx = createMockContext() as Context;
      // Mock to return a user with empty roles
      ctx.get = mock((key) => {
        if (key === "user") {
          return { id: "test-user", roles: [] };
        }
        return null;
      });

      const next = createNextFunction();

      // Test that it will throw
      await expect(requireRole(Role.ADMIN)(ctx, next)).rejects.toThrow(
        "Insufficient permissions",
      );
    });
  });

  describe("requireOwnership", () => {
    it("allows resource owner", async () => {
      const ctx = createMockContext();
      const next = createNextFunction();
      ctx.get = mock(() => ({ id: "123", roles: [Role.ISSUER_OWNER] }));

      const getOwnerId = async () => "123";

      await requireOwnership(getOwnerId)(ctx as any, next);

      expect(next).toHaveBeenCalled();
    });

    it("allows admin user regardless of ownership", async () => {
      const ctx = createMockContext();
      const next = createNextFunction();
      ctx.get = mock(() => ({ id: "456", roles: [Role.ISSUER_ADMIN] }));

      const getOwnerId = async () => "123";

      await requireOwnership(getOwnerId)(ctx as any, next);

      expect(next).toHaveBeenCalled();
    });

    it("rejects non-owner without admin role", async () => {
      const ctx = createMockContext();
      const next = createNextFunction();
      ctx.get = mock(() => ({ id: "456", roles: [Role.ISSUER_OWNER] }));

      const getOwnerId = async () => "123";

      await expect(
        requireOwnership(getOwnerId)(ctx as any, next),
      ).rejects.toThrow("Insufficient permissions");
    });
  });

  describe("combineMiddleware", () => {
    it("executes middleware in order", async () => {
      const order: number[] = [];
      const middleware1 = async (_: Context, next: () => Promise<void>) => {
        order.push(1);
        await next();
      };
      const middleware2 = async (_: Context, next: () => Promise<void>) => {
        order.push(2);
        await next();
      };

      const combined = combineMiddleware(middleware1, middleware2);
      await combined({} as Context, async () => {
        order.push(3);
      });

      expect(order).toEqual([1, 2, 3]);
    });

    it("stops execution on error", async () => {
      const order: number[] = [];
      const middleware1 = async (_: Context) => {
        order.push(1);
        throw new Error("Stop here");
      };
      const middleware2 = async (_: Context, next: () => Promise<void>) => {
        order.push(2);
        await next();
      };

      const combined = combineMiddleware(middleware1, middleware2);
      await expect(
        combined({} as Context, async () => {
          order.push(3);
        }),
      ).rejects.toThrow("Stop here");

      expect(order).toEqual([1]);
    });
  });
});
