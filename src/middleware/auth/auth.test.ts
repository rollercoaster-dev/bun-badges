import { mock, describe, expect, it, beforeEach } from "bun:test";
import { type Context } from "hono";
import { Role } from "../../../middleware/auth";
import {
  createMockContext,
  createNextFunction,
} from "../../../utils/test/route-test-utils";
import {
  requireAuth,
  requireRole,
  requireOwnership,
  combineMiddleware,
} from "../../../middleware/auth";
import { setupJwtMock } from "../../../utils/test/auth-test-utils";

describe("Auth Middleware", () => {
  beforeEach(() => {
    // Set up JWT mock before each test
    setupJwtMock();
  });

  describe("requireAuth", () => {
    it("allows request with valid token", async () => {
      const ctx = createMockContext();
      const next = createNextFunction();
      // Mock the Authorization header
      ctx.req.header = mock((name: string) => {
        if (name === "Authorization") return "Bearer valid-token";
        return undefined;
      });

      await requireAuth(ctx as any, next);

      expect(next).toHaveBeenCalled();
    });

    it("rejects request without token", async () => {
      const ctx = createMockContext();
      const next = createNextFunction();
      // Empty Authorization header
      ctx.req.header = mock((_: string) => undefined);

      await expect(requireAuth(ctx as any, next)).rejects.toThrow(
        "Authentication required",
      );
    });

    it("rejects invalid token", async () => {
      const ctx = createMockContext();
      const next = createNextFunction();
      // Invalid token
      ctx.req.header = mock((name: string) => {
        if (name === "Authorization") return "Bearer invalid-token";
        return undefined;
      });

      await expect(requireAuth(ctx as any, next)).rejects.toThrow(
        "Invalid or expired token",
      );
    });
  });

  describe("requireRole", () => {
    it("allows access with matching single role", async () => {
      const ctx = createMockContext();
      const next = createNextFunction();
      ctx.get = mock(() => ({ id: "123", roles: [Role.ISSUER_ADMIN] }));

      await requireRole(Role.ISSUER_ADMIN)(ctx as any, next);

      expect(next).toHaveBeenCalled();
    });

    it("allows access with one matching role from array", async () => {
      const ctx = createMockContext();
      const next = createNextFunction();
      ctx.get = mock(() => ({ id: "123", roles: [Role.ISSUER_ADMIN] }));

      await requireRole([Role.ISSUER_ADMIN, Role.ISSUER_OWNER])(
        ctx as any,
        next,
      );

      expect(next).toHaveBeenCalled();
    });

    it("denies access with no matching roles from array", async () => {
      const ctx = createMockContext();
      const next = createNextFunction();
      ctx.get = mock(() => ({ id: "123", roles: [Role.ISSUER_VIEWER] }));

      await expect(
        requireRole([Role.ISSUER_ADMIN, Role.ISSUER_OWNER])(ctx as any, next),
      ).rejects.toThrow("Insufficient permissions");
    });

    it("denies access with non-matching single role", async () => {
      const ctx = createMockContext();
      const next = createNextFunction();
      ctx.get = mock(() => ({ id: "123", roles: [Role.ISSUER_VIEWER] }));

      await expect(
        requireRole(Role.ISSUER_ADMIN)(ctx as any, next),
      ).rejects.toThrow("Insufficient permissions");
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
