/**
 * Basic Badge Lifecycle Flow Test
 *
 * A simplified test that checks if our test infrastructure is working
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { createTestServer } from "../../setup/server-setup";

describe("Basic Test Infrastructure", () => {
  // Create a mock app
  const app = new Hono();

  // Add a simple endpoint
  app.get("/health", (c) => c.json({ status: "ok" }));

  // Create test server
  const { server, request } = createTestServer(app, {
    label: "basic-test",
  });

  // Clean up
  afterAll(() => {
    server.close();
  });

  it("should be able to make a request to a mock endpoint", async () => {
    const response = await request.get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });
});
