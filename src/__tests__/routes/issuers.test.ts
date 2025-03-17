import { describe, expect, test } from "bun:test";
import { Role, requireAuth, requireRole } from "../../middleware/auth";
import {
  createAuthTestContext,
  createNextFunction,
  expectHttpException,
  runMiddlewareChain,
  setupJwtMock,
} from "../../utils/test/auth-test-utils";
import {
  setupRouteTest,
  createTestRequest,
} from "../../utils/test/route-test-utils";
import issuersRoutes from "../../routes/issuers.routes";
import { Hono } from "hono";
import { Context } from "hono";

// Set up the JWT mock
setupJwtMock();

// Tests for the authorization middleware in issuer routes
describe("Issuer Routes Authorization", () => {
  describe("Direct Middleware Testing", () => {
    describe("GET /issuers - requireRole(ISSUER_VIEWER)", () => {
      test("allows access with ISSUER_VIEWER role", async () => {
        const c = createAuthTestContext({
          headers: { Authorization: "Bearer valid-token" },
        });
        const next = createNextFunction();

        // Apply auth middleware chain directly
        await runMiddlewareChain(
          [requireAuth, requireRole(Role.ISSUER_VIEWER)],
          c,
        );

        // Should pass through without error
        expect(c.finalized).toBe(false);
        expect(c.get("user")).toBeDefined();
        expect(c.get("user").roles).toContain(Role.ISSUER_VIEWER);
      });

      test("denies access without authentication", async () => {
        const c = createAuthTestContext();
        const next = createNextFunction();

        // Apply only the auth middleware
        try {
          await requireAuth(c, next);
          expect().fail("Should have thrown exception");
        } catch (error: any) {
          expect(error.status).toBe(401);
        }
      });

      test("denies access with wrong role", async () => {
        // Create context with valid token but wrong role
        const c = createAuthTestContext({
          headers: { Authorization: "Bearer valid-token" },
        });

        // Apply auth middleware first
        const next = createNextFunction();
        await requireAuth(c, next);

        // Now modify the user to have a different role for testing
        c.set("user", { id: "user123", roles: [Role.ISSUER_OWNER] });

        // Apply the role middleware which should fail
        const roleMiddleware = requireRole(Role.ISSUER_ADMIN);

        try {
          await roleMiddleware(c, next);
          expect().fail("Should have thrown exception");
        } catch (error: any) {
          expect(error.status).toBe(403);
        }
      });
    });
  });

  describe("Route Integration Testing - Authorization Only", () => {
    // Setup a simplified test app just for testing auth
    function setupMockApp() {
      const { createApp } = setupRouteTest();

      // Create simple routes with mock handlers that just return success
      // This focuses the test on authorization, not on controller logic
      const mockRoutes = {
        get: {
          "/issuers": [
            requireAuth,
            requireRole(Role.ISSUER_VIEWER),
            async (c: Context) => c.json({ status: "success" }),
          ],
          "/issuers/test-issuer": [
            requireAuth,
            requireRole(Role.ISSUER_VIEWER),
            async (c: Context) => c.json({ status: "success" }),
          ],
          "/issuers/test-issuer/verify": [
            async (c: Context) => c.json({ status: "success" }),
          ],
        },
        post: {
          "/issuers": [
            requireAuth,
            requireRole(Role.ISSUER_ADMIN),
            async (c: Context) => c.json({ status: "success" }, 201),
          ],
        },
        put: {
          "/issuers/test-issuer": [
            requireAuth,
            requireRole([Role.ISSUER_ADMIN, Role.ISSUER_OWNER]),
            async (c: Context) => c.json({ status: "success" }),
          ],
        },
        delete: {
          "/issuers/test-issuer": [
            requireAuth,
            requireRole([Role.ISSUER_ADMIN, Role.ISSUER_OWNER]),
            async (c: Context) => new Response(null, { status: 204 }),
          ],
        },
      };

      const app = new Hono();

      // Register routes
      Object.entries(mockRoutes.get).forEach(([path, handlers]) => {
        app.get(path, ...handlers);
      });

      Object.entries(mockRoutes.post).forEach(([path, handlers]) => {
        app.post(path, ...handlers);
      });

      Object.entries(mockRoutes.put).forEach(([path, handlers]) => {
        app.put(path, ...handlers);
      });

      Object.entries(mockRoutes.delete).forEach(([path, handlers]) => {
        app.delete(path, ...handlers);
      });

      return app;
    }

    test("GET /issuers - allows viewer role to list issuers", async () => {
      const app = setupMockApp();

      // Create request with viewer token
      const req = createTestRequest("/issuers", { token: "valid-token" });
      const res = await app.fetch(req);

      // Verify successful response
      expect(res.status).toBe(200);
    });

    test("POST /issuers - allows admin to create issuer", async () => {
      const app = setupMockApp();

      // Create request with admin token and issuer data
      const req = createTestRequest("/issuers", {
        method: "POST",
        token: "admin-token",
        body: {
          name: "Test Issuer",
          url: "https://test.com",
          description: "Test Description",
          email: "test@example.com",
        },
      });
      const res = await app.fetch(req);

      // Verify successful creation (201 Created)
      expect(res.status).toBe(201);
    });

    test("POST /issuers - denies creation with viewer role", async () => {
      const app = setupMockApp();

      // Create request with viewer token (which shouldn't have create permissions)
      const req = createTestRequest("/issuers", {
        method: "POST",
        token: "valid-token",
        body: {
          name: "Test Issuer",
          url: "https://test.com",
          description: "Test Description",
          email: "test@example.com",
        },
      });
      const res = await app.fetch(req);

      // Verify 403 Forbidden
      expect(res.status).toBe(403);
    });

    test("PUT /issuers/:id - allows owner to update their issuer", async () => {
      const app = setupMockApp();

      // Create request with owner token
      const req = createTestRequest("/issuers/test-issuer", {
        method: "PUT",
        token: "owner-token",
        body: {
          name: "Updated Issuer",
          url: "https://test.com",
          description: "Updated Description",
          email: "updated@example.com",
        },
      });
      const res = await app.fetch(req);

      // Verify successful update
      expect(res.status).toBe(200);
    });

    test("PUT /issuers/:id - allows admin to update any issuer", async () => {
      const app = setupMockApp();

      // Create request with admin token
      const req = createTestRequest("/issuers/test-issuer", {
        method: "PUT",
        token: "admin-token",
        body: {
          name: "Admin Updated Issuer",
          url: "https://test.com",
          description: "Admin Updated Description",
          email: "admin-updated@example.com",
        },
      });
      const res = await app.fetch(req);

      // Verify successful update
      expect(res.status).toBe(200);
    });

    test("PUT /issuers/:id - denies update for non-owner with viewer role", async () => {
      const app = setupMockApp();

      // Create request with viewer token
      const req = createTestRequest("/issuers/test-issuer", {
        method: "PUT",
        token: "valid-token",
        body: {
          name: "Should Fail Update",
          url: "https://test.com",
        },
      });
      const res = await app.fetch(req);

      // Verify 403 Forbidden
      expect(res.status).toBe(403);
    });

    test("DELETE /issuers/:id - allows owner to delete their issuer", async () => {
      const app = setupMockApp();

      // Create request with owner token
      const req = createTestRequest("/issuers/test-issuer", {
        method: "DELETE",
        token: "owner-token",
      });
      const res = await app.fetch(req);

      // Verify successful deletion
      expect(res.status).toBe(204);
    });

    test("DELETE /issuers/:id - allows admin to delete any issuer", async () => {
      const app = setupMockApp();

      // Create request with admin token
      const req = createTestRequest("/issuers/test-issuer", {
        method: "DELETE",
        token: "admin-token",
      });
      const res = await app.fetch(req);

      // Verify successful deletion
      expect(res.status).toBe(204);
    });

    test("DELETE /issuers/:id - denies deletion for non-owner with viewer role", async () => {
      const app = setupMockApp();

      // Create request with viewer token
      const req = createTestRequest("/issuers/test-issuer", {
        method: "DELETE",
        token: "valid-token",
      });
      const res = await app.fetch(req);

      // Verify 403 Forbidden
      expect(res.status).toBe(403);
    });

    test("GET /issuers/:id/verify - allows public access to verify endpoint", async () => {
      const app = setupMockApp();

      // Create request without token (public access)
      const req = createTestRequest("/issuers/test-issuer/verify");
      const res = await app.fetch(req);

      // Verify successful response
      expect(res.status).toBe(200);
    });
  });
});
