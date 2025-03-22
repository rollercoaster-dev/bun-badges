import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import assertions from "@/routes/assertions.routes";
import { clearTestData } from "@/utils/test/db-helpers";

/**
 * Integration test to verify the UUID validation fix in assertions routes
 */
describe("Assertions UUID Validation Fix", () => {
  const app = new Hono();
  const apiBase = "/api";
  const hostUrl = "http://localhost:7777";

  // Mount the assertions route
  app.route(`${apiBase}/assertions`, assertions);

  // Setup and cleanup
  beforeAll(async () => {
    // Connect to test database
    console.log("Running test with database:", process.env.DATABASE_URL);
  });

  afterAll(async () => {
    // Clean up any test data
    await clearTestData();
  });

  it("should return 404 (not 500) for invalid UUID format", async () => {
    // Invalid UUID format
    const invalidUuid = "not-a-valid-uuid";

    const req = new Request(`${hostUrl}${apiBase}/assertions/${invalidUuid}`, {
      method: "GET",
    });

    // Make the request
    const res = await app.fetch(req);

    // Should return 404, not 500
    expect(res.status).toBe(404);

    const responseText = await res.text();
    console.log("Response:", responseText);

    // We expect a 404 status code - we don't need to validate the exact response structure
    // as our main concern is that invalid UUIDs return 404, not 500
  });

  it("should return 404 for non-existent but valid UUID format", async () => {
    // Valid UUID format but doesn't exist
    const validNonExistentUuid = "00000000-0000-4000-a000-000000000000";

    const req = new Request(
      `${hostUrl}${apiBase}/assertions/${validNonExistentUuid}`,
      {
        method: "GET",
      },
    );

    // Make the request
    const res = await app.fetch(req);

    // Should return 404
    expect(res.status).toBe(404);

    const responseText = await res.text();
    console.log("Response for valid UUID:", responseText);

    // We expect a 404 status code - we don't need to validate the exact response structure
  });

  it("should correctly handle revoke endpoint with invalid UUID", async () => {
    // Invalid UUID format
    const invalidUuid = "not-a-valid-uuid";

    const req = new Request(
      `${hostUrl}${apiBase}/assertions/${invalidUuid}/revoke`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Test revocation",
        }),
      },
    );

    // Make the request
    const res = await app.fetch(req);

    // Should return 404, not 500
    expect(res.status).toBe(404);

    const responseText = await res.text();
    console.log("Response for revoke with invalid UUID:", responseText);

    // We expect a 404 status code for invalid UUIDs
  });
});
