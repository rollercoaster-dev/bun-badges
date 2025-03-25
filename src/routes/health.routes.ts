import { Hono } from "hono";

// Create a new router
const router = new Hono();

// Health check endpoint
router.get("/", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

export default router;
