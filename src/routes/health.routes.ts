import { Hono } from "hono";
import { db } from "@/db/config";
import { sql } from "drizzle-orm";

// Create a router for health checks
const healthRouter = new Hono();

/**
 * Health check endpoint
 * Used by Docker and other monitoring systems to verify the application is running
 */
healthRouter.get("/", async (c) => {
  try {
    // Check database connection
    const dbResult = await db.execute(sql`SELECT 1 as health_check`);
    const isDbConnected = dbResult.rows?.[0]?.health_check === 1;

    if (isDbConnected) {
      return c.json(
        {
          status: "healthy",
          time: new Date().toISOString(),
          database: "connected",
          version: process.env.npm_package_version || "unknown",
        },
        200,
      );
    } else {
      return c.json(
        {
          status: "degraded",
          time: new Date().toISOString(),
          database: "error",
          message: "Database check failed",
        },
        500,
      );
    }
  } catch (error) {
    console.error("Health check failed:", error);
    return c.json(
      {
        status: "unhealthy",
        time: new Date().toISOString(),
        database: "disconnected",
        message: "Error connecting to database",
      },
      500,
    );
  }
});

export default healthRouter;
