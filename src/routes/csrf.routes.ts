import { Hono } from "hono";
import { createCSRFTokenHandler } from "@/utils/auth/csrf-form";

/**
 * Creates routes for CSRF token management
 * @returns Hono router for CSRF token endpoints
 */
export function createCSRFRoutes() {
  const router = new Hono();

  /**
   * GET /csrf-token
   *
   * Generates a new CSRF token and returns it as JSON
   * This endpoint is useful for SPA applications that need to include
   * CSRF tokens in AJAX requests.
   */
  router.get("/token", createCSRFTokenHandler());

  return router;
}
