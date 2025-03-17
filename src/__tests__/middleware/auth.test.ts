import { describe, expect, test, mock, beforeEach } from "bun:test";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  Role,
  requireAuth,
  requireRole,
  requireOwnership,
  combineMiddleware,
} from "../../middleware/auth";
import {
  createAuthTestContext,
  createNextFunction,
  expectHttpException,
  setupJwtMock,
} from "../../utils/test/auth-test-utils";

// Set up the JWT mock
setupJwtMock();

describe("Auth Middleware", () => {
  beforeEach(() => {
    // Reset mocks
    mock.restore();
  });

  describe("requireAuth", () => {
    test("allows request with valid token", async () => {
      const c = createAuthTestContext({
        headers: { Authorization: "Bearer valid-token" },
      });
      const next = createNextFunction();

      await requireAuth(c, next);

      expect(c.get("user")).toBeDefined();
      expect(c.get("user").id).toBe("user123");
    });

    test("rejects request without token", async () => {
      const c = createAuthTestContext();
      const next = createNextFunction();

      try {
        await requireAuth(c, next);
        expect().fail("Should have thrown exception");
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
    });

    test("rejects invalid token", async () => {
      const c = createAuthTestContext({
        headers: { Authorization: "Bearer invalid-token" },
      });
      const next = createNextFunction();

      try {
        await requireAuth(c, next);
        expect().fail("Should have thrown exception");
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
    });
  });

  describe("requireRole", () => {
    test("allows access with matching single role", async () => {
      const c = createAuthTestContext({
        user: {
          id: "user123",
          roles: [Role.ISSUER_VIEWER],
          organizationId: "org123",
        },
      });
      const next = createNextFunction();
      const middleware = requireRole(Role.ISSUER_VIEWER);

      await middleware(c, next);
      expect(c.finalized).toBe(false);
    });

    test("allows access with one matching role from array", async () => {
      const c = createAuthTestContext({
        user: {
          id: "user123",
          roles: [Role.ISSUER_VIEWER],
          organizationId: "org123",
        },
      });
      const next = createNextFunction();
      const middleware = requireRole([Role.ISSUER_ADMIN, Role.ISSUER_VIEWER]);

      await middleware(c, next);
      expect(c.finalized).toBe(false);
    });

    test("denies access with no matching roles from array", async () => {
      const c = createAuthTestContext({
        user: {
          id: "user123",
          roles: [Role.ISSUER_VIEWER],
          organizationId: "org123",
        },
      });
      const next = createNextFunction();
      const middleware = requireRole([Role.ISSUER_ADMIN, Role.ISSUER_OWNER]);

      try {
        await middleware(c, next);
        expect().fail("Should have thrown exception");
      } catch (error: any) {
        expect(error.status).toBe(403);
      }
    });

    test("denies access with non-matching single role", async () => {
      const c = createAuthTestContext({
        user: {
          id: "user123",
          roles: [Role.ISSUER_VIEWER],
          organizationId: "org123",
        },
      });
      const next = createNextFunction();
      const middleware = requireRole(Role.ISSUER_ADMIN);

      try {
        await middleware(c, next);
        expect().fail("Should have thrown exception");
      } catch (error: any) {
        expect(error.status).toBe(403);
      }
    });
  });

  describe("requireOwnership", () => {
    test("allows resource owner", async () => {
      const userId = "user123";
      const c = createAuthTestContext({
        user: {
          id: userId,
          roles: [Role.ISSUER_VIEWER],
          organizationId: "org123",
        },
      });
      const next = createNextFunction();
      const getOwnerId = () => Promise.resolve(userId);
      const middleware = requireOwnership(getOwnerId);

      await middleware(c, next);
      expect(c.finalized).toBe(false);
    });

    test("allows admin user regardless of ownership", async () => {
      const c = createAuthTestContext({
        user: {
          id: "admin123",
          roles: [Role.ADMIN],
          organizationId: "org123",
        },
      });
      const next = createNextFunction();
      const getOwnerId = () => Promise.resolve("other-user");
      const middleware = requireOwnership(getOwnerId);

      await middleware(c, next);
      expect(c.finalized).toBe(false);
    });

    test("rejects non-owner without admin role", async () => {
      const c = createAuthTestContext({
        user: {
          id: "user123",
          roles: [Role.ISSUER_VIEWER],
          organizationId: "org123",
        },
      });
      const next = createNextFunction();
      const getOwnerId = () => Promise.resolve("other-user");
      const middleware = requireOwnership(getOwnerId);

      try {
        await middleware(c, next);
        expect().fail("Should have thrown exception");
      } catch (error: any) {
        expect(error.status).toBe(403);
      }
    });
  });

  describe("combineMiddleware", () => {
    test("executes middleware in order", async () => {
      const c = createAuthTestContext();
      const next = createNextFunction();
      const order: number[] = [];

      const middleware1 = async (c: Context, next: () => Promise<void>) => {
        order.push(1);
        await next();
      };

      const middleware2 = async (c: Context, next: () => Promise<void>) => {
        order.push(2);
        await next();
      };

      const combined = combineMiddleware(middleware1, middleware2);
      await combined(c, next);

      expect(order).toEqual([1, 2]);
    });

    test("stops execution on error", async () => {
      const c = createAuthTestContext();
      const next = createNextFunction();
      const order: number[] = [];

      const middleware1 = async (c: Context, next: () => Promise<void>) => {
        order.push(1);
        throw new Error("Test error");
      };

      const middleware2 = async (c: Context, next: () => Promise<void>) => {
        order.push(2);
        await next();
      };

      const combined = combineMiddleware(middleware1, middleware2);
      try {
        await combined(c, next);
        expect().fail("Should have thrown exception");
      } catch (error) {
        expect(error).toBeDefined();
        expect(order).toEqual([1]);
      }
    });
  });
});
