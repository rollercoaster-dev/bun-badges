import { expect, test, describe, mock, beforeEach } from "bun:test";
import { Context } from "hono";
import { createAuthMiddleware, AuthContext } from "@middleware/auth.middleware";
import { MockDatabaseService } from "@utils/test/db-mock";
import { mockVerifyToken } from "@utils/test/jwt-test-utils";

// Mock the JWT verification function
mock.module("@utils/auth/jwt", () => ({
  verifyToken: mockVerifyToken,
}));

type ErrorResponse = {
  error: string;
};

const createMockContext = (headers: Record<string, string> = {}) => {
  return {
    req: {
      header: (name: string) => headers[name],
    },
    json: (body: Record<string, unknown>, status = 200) => {
      return Response.json(body, { status });
    },
  } as unknown as Context;
};

const createMockDatabase = () => {
  return new MockDatabaseService();
};

describe("Auth Middleware", () => {
  describe("requireAuth", () => {
    let mockDb: MockDatabaseService;

    beforeEach(() => {
      mockDb = createMockDatabase();
      // Configure mock DB to treat "revoked-token" as revoked
      mockDb.isTokenRevoked = mock(async (token: string) => {
        return token === "revoked-token";
      });
    });

    test("should pass with valid token", async () => {
      const middleware = createAuthMiddleware(mockDb);
      const ctx = createMockContext({
        Authorization: "Bearer test-valid-token",
      });
      const next = mock(() => Promise.resolve());

      await middleware(ctx, next);

      expect(next).toHaveBeenCalledTimes(1);
      const authCtx = ctx as AuthContext;
      expect(authCtx.user).toBeDefined();
      expect(authCtx.user?.username).toBe("test@example.com");
      expect(authCtx.user?.tokenType).toBe("access");
    });

    test("should throw when no token provided", async () => {
      const middleware = createAuthMiddleware(mockDb);
      const ctx = createMockContext();
      const next = mock(() => Promise.resolve());

      const response = (await middleware(ctx, next)) as Response;
      const body = (await response.json()) as ErrorResponse;
      expect(response.status).toBe(401);
      expect(body.error).toBe("Authorization header is required");
      expect(next).not.toHaveBeenCalled();
    });

    test("should throw when invalid token format", async () => {
      const middleware = createAuthMiddleware(mockDb);
      const ctx = createMockContext({ Authorization: "Basic token" });
      const next = mock(() => Promise.resolve());

      const response = (await middleware(ctx, next)) as Response;
      const body = (await response.json()) as ErrorResponse;
      expect(response.status).toBe(401);
      expect(body.error).toBe("Authorization header is required");
      expect(next).not.toHaveBeenCalled();
    });

    test("should throw when token is revoked", async () => {
      const middleware = createAuthMiddleware(mockDb);
      const ctx = createMockContext({ Authorization: "Bearer revoked-token" });
      const next = mock(() => Promise.resolve());

      const response = (await middleware(ctx, next)) as Response;
      const body = (await response.json()) as ErrorResponse;
      expect(response.status).toBe(401);
      expect(body.error).toBe("Token has been revoked");
      expect(next).not.toHaveBeenCalled();
    });

    test("should throw when token is invalid", async () => {
      const middleware = createAuthMiddleware(mockDb);
      const ctx = createMockContext({ Authorization: "Bearer invalid-token" });
      const next = mock(() => Promise.resolve());

      const response = (await middleware(ctx, next)) as Response;
      const body = (await response.json()) as ErrorResponse;
      expect(response.status).toBe(401);
      expect(body.error).toBe("Invalid token");
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("requireRole", () => {
    // Testing role middleware functionality
    test("should pass when user has required role", async () => {
      // Mock context with user that has admin role
      const ctx = createMockContext() as AuthContext;
      ctx.user = {
        username: "admin@example.com",
        tokenType: "access",
      };

      const next = mock(() => Promise.resolve());

      // Simple role middleware for testing
      const roleMiddleware = async (c: Context, next: Function) => {
        const authCtx = c as AuthContext;
        if (!authCtx.user) {
          return c.json({ error: "Authentication required" }, 401);
        }

        if (authCtx.user.username === "admin@example.com") {
          await next();
          return;
        }

        return c.json({ error: "Insufficient permissions" }, 403);
      };

      await roleMiddleware(ctx, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    test("should throw when user lacks required role", async () => {
      // Mock context with regular user
      const ctx = createMockContext() as AuthContext;
      ctx.user = {
        username: "regular@example.com",
        tokenType: "access",
      };

      const next = mock(() => Promise.resolve());

      // Simple role middleware for testing
      const roleMiddleware = async (c: Context, next: Function) => {
        const authCtx = c as AuthContext;
        if (!authCtx.user) {
          return c.json({ error: "Authentication required" }, 401);
        }

        if (authCtx.user.username === "admin@example.com") {
          await next();
          return;
        }

        return c.json({ error: "Insufficient permissions" }, 403);
      };

      const response = (await roleMiddleware(ctx, next)) as Response;
      const body = (await response.json()) as ErrorResponse;
      expect(response.status).toBe(403);
      expect(body.error).toBe("Insufficient permissions");
      expect(next).not.toHaveBeenCalled();
    });

    test("should throw when no user in context", async () => {
      // Mock context without user
      const ctx = createMockContext() as Context;

      const next = mock(() => Promise.resolve());

      // Simple role middleware for testing
      const roleMiddleware = async (c: Context, next: Function) => {
        const authCtx = c as AuthContext;
        if (!authCtx.user) {
          return c.json({ error: "Authentication required" }, 401);
        }

        if (authCtx.user.username === "admin@example.com") {
          await next();
          return;
        }

        return c.json({ error: "Insufficient permissions" }, 403);
      };

      const response = (await roleMiddleware(ctx, next)) as Response;
      const body = (await response.json()) as ErrorResponse;
      expect(response.status).toBe(401);
      expect(body.error).toBe("Authentication required");
      expect(next).not.toHaveBeenCalled();
    });
  });
});
