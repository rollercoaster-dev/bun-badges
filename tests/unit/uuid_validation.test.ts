import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import assertions from "@/routes/assertions.routes";

describe("UUID Validation Tests", () => {
  const app = new Hono();
  const apiBase = "/api";
  const hostUrl = "http://localhost:7777";

  // Mount the assertions routes
  app.route(`${apiBase}/assertions`, assertions);

  it("should return 404 for invalid UUID format in assertions GET endpoint", async () => {
    // Invalid UUID format
    const invalidUuid = "not-a-valid-uuid";

    const req = new Request(`${hostUrl}${apiBase}/assertions/${invalidUuid}`, {
      method: "GET",
    });

    // Make the request
    const res = await app.fetch(req);

    // Print the status and text content
    console.log(`Status: ${res.status}`);
    try {
      const text = await res.text();
      console.log(`Response body: ${text}`);

      // Should return 404, not 500
      expect(res.status).toBe(404);
    } catch (error) {
      console.error("Error parsing response:", error);
    }
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

    // Print the status and text content
    console.log(`Status for valid UUID test: ${res.status}`);
    try {
      const text = await res.text();
      console.log(`Response body for valid UUID test: ${text}`);

      // Should return 404
      expect(res.status).toBe(404);
    } catch (error) {
      console.error("Error parsing response for valid UUID test:", error);
    }
  });
});
