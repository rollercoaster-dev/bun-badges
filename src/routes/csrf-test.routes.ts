import { Hono } from "hono";

/**
 * Creates routes for testing CSRF protection
 * @returns Hono router for CSRF test endpoints
 */
export function createCSRFTestRoutes() {
  const router = new Hono();

  /**
   * GET /test
   *
   * Simple GET endpoint that doesn't require CSRF protection
   */
  router.get("/test", (c) => {
    return c.json({ message: "GET request successful" });
  });

  /**
   * POST /test
   *
   * Simple POST endpoint that requires CSRF protection
   * The CSRF middleware is applied globally in security.middleware.ts
   */
  router.post("/test", (c) => {
    return c.json({ message: "POST request successful with valid CSRF token" });
  });

  return router;
}
