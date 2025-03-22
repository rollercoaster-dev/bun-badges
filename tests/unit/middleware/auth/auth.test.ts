import { mock, describe, expect, it, beforeEach } from "bun:test";
import { type Context } from "hono";
import { Role } from "@/middleware/auth";
import {
  createMockContext,
  createNextFunction,
} from "@utils/test/route-test-utils";
import {
  requireAuth,
  requireRole,
  requireOwnership,
  combineMiddleware,
} from "@/middleware/auth";
import { setupJwtMock } from "@utils/test/auth-test-utils";
import { UnauthorizedError } from "@/utils/errors";
import type { AuthUser } from "@/middleware/auth";

describe("Auth Middleware", () => {
  beforeEach(() => {
    // Set up JWT mock before each test
    setupJwtMock();
  });

  describe("requireAuth", () => {
    it("should pass with valid token", async () => {
      const mockToken = "valid.jwt.token";
      const mockUser: AuthUser = {
        id: "test-user",
        roles: [Role.ADMIN],
        organizationId: "test-org",
      };

      const ctx = createMockContext() as Context;
      ctx.req.raw.headers.set("authorization", `Bearer ${mockToken}`);
      ctx.set("user", mockUser);

      const next = () => Promise.resolve();
      await requireAuth(ctx, next);

      expect(ctx.get("user")).toEqual(mockUser);
    });

    it("should throw when no token provided", async () => {
      const ctx = createMockContext() as Context;
      const next = () => Promise.resolve();

      await expect(requireAuth(ctx, next)).rejects.toThrow(UnauthorizedError);
    });

    it("should throw when invalid token format", async () => {
      const ctx = createMockContext() as Context;
      ctx.req.raw.headers.set("authorization", "NotBearer token");
      const next = () => Promise.resolve();

      await expect(requireAuth(ctx, next)).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("requireRole", () => {
    it("should pass when user has required role", async () => {
      const mockUser: AuthUser = {
        id: "test-user",
        roles: [Role.ADMIN],
        organizationId: "test-org",
      };

      const ctx = createMockContext() as Context;
      ctx.set("user", mockUser);

      const next = () => Promise.resolve();
      await requireRole(Role.ADMIN)(ctx, next);
    });

    it("should throw when user lacks required role", async () => {
      const mockUser: AuthUser = {
        id: "test-user",
        roles: [Role.ISSUER_VIEWER],
        organizationId: "test-org",
      };

      const ctx = createMockContext() as Context;
      ctx.set("user", mockUser);

      const next = () => Promise.resolve();
      await expect(requireRole(Role.ADMIN)(ctx, next)).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it("should throw when no user in context", async () => {
      const ctx = createMockContext() as Context;
      const next = () => Promise.resolve();

      await expect(requireRole(Role.ADMIN)(ctx, next)).rejects.toThrow(
        UnauthorizedError,
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
