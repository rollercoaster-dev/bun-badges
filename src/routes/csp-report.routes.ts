import { Hono } from "hono";
import logger from "@/utils/logger";

/**
 * Creates routes for handling Content Security Policy (CSP) reports
 * @returns Hono router for CSP reports
 */
export function createCSPReportRoutes() {
  const router = new Hono();

  /**
   * Endpoint for receiving CSP violation reports
   */
  router.post("/", async (c) => {
    try {
      // Parse the CSP report
      const report = await c.req.json();

      // Log the CSP violation
      logger.warn("CSP Violation", {
        report: report["csp-report"] || report,
        userAgent: c.req.header("User-Agent"),
        ip:
          c.req.header("X-Forwarded-For") ||
          c.req.header("CF-Connecting-IP") ||
          "unknown",
      });

      // Return a success response
      // Use c.body() for 204 responses instead of c.json()
      c.status(204);
      return c.body(null);
    } catch (error) {
      // Log the error
      logger.error("Error processing CSP report", { error });

      // Return an error response
      return c.json({ error: "Invalid CSP report" }, 400);
    }
  });

  return router;
}
