import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createTRPCHonoMiddleware } from "./trpc/hono-adapter";
import { appRouter } from "./trpc";
import * as dotenv from "dotenv";
import { DatabaseService } from "@services/db.service";

// Load environment variables from .env file
dotenv.config();

// Create database service
const db = new DatabaseService();

// Create Hono app
const app = new Hono();

// Simple health check route
app.get("/health", (c) => {
  return c.json({ status: "ok", message: "tRPC Test Server" });
});

// Mount tRPC router
const trpcMiddleware = createTRPCHonoMiddleware(appRouter, db);
app.use("/trpc/*", trpcMiddleware);

// Simple badge endpoint for testing
const badgeSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

app.post("/api/badges", zValidator("json", badgeSchema), (c) => {
  const body = c.req.valid("json");
  return c.json({
    id: "test-badge-id",
    name: body.name,
    description: body.description,
    created: new Date().toISOString(),
  });
});

// Start server
const port = 3000;
console.log(`Starting tRPC test server on http://localhost:${port}`);
serve({
  fetch: app.fetch,
  port,
});
