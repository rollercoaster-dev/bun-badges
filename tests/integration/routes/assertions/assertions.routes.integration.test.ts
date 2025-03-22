import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { Hono } from "hono";
import { seedTestData, clearTestData } from "@/utils/test/db-helpers";
import assertionsRoutes from "@/routes/assertions.routes";
import verificationRoutes from "@/routes/verification.routes";

// Define interfaces for the API responses
interface ApiResponse<T> {
  status: "success" | "error";
  data: T;
}

interface AssertionResponse {
  assertion: {
    assertionId: string;
    [key: string]: any;
  };
}

interface CredentialResponse {
  credential: {
    type: string[];
    [key: string]: any;
  };
  verification: any;
}

interface VerificationResponse {
  valid: boolean;
  revoked?: boolean;
}

describe("Assertions Routes Integration", () => {
  let testData: any;
  let assertionId: string;
  let app: Hono;
  const baseUrl = "http://example.org"; // Using a fixed base URL for tests

  beforeEach(async () => {
    testData = await seedTestData();
    assertionId = testData.assertion.assertionId;

    // Create an app with the same structure as the main application
    app = new Hono();

    // Create API router (matches src/index.ts structure)
    const api = new Hono();

    // Mount routes on API router
    api.route("/assertions", assertionsRoutes);
    api.route("/verify", verificationRoutes);

    // Mount API router on app
    app.route("/api", api);

    console.log(`Test set up with assertionId: ${assertionId}`);

    // Print all registered routes for debugging
    console.log("Registered routes:");
    app.routes.forEach((route) => {
      console.log(`${route.method} ${route.path}`);
    });
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe("GET /api/assertions/:id", () => {
    test("should return an assertion by ID in OB2 format", async () => {
      const path = `/api/assertions/${assertionId}`;
      const url = baseUrl + path;

      console.log(`Making request to: ${url}`);
      const req = new Request(url, {
        method: "GET",
      });

      const res = await app.fetch(req, {
        env: {
          basePath: "",
          path,
          url,
        },
      });
      console.log(`Response status: ${res.status}`);

      // For debugging, let's try to get response text if there's an error
      if (res.status !== 200) {
        try {
          const text = await res.clone().text();
          console.log(
            `Response body: ${text.substring(0, 200)}${text.length > 200 ? "..." : ""}`,
          );
        } catch (e) {
          console.log(`Failed to get response body: ${e}`);
        }
      }

      expect(res.status).toBe(200);

      const body = (await res.json()) as ApiResponse<AssertionResponse>;
      expect(body.status).toBe("success");
      expect(body.data.assertion).toBeDefined();
      expect(body.data.assertion.assertionId).toBe(assertionId);
    });

    test("should return an assertion in OB3 format", async () => {
      const path = `/api/assertions/${assertionId}?format=ob3`;
      const url = baseUrl + path;

      console.log(`Making request to: ${url}`);
      const req = new Request(url, {
        method: "GET",
      });

      const res = await app.fetch(req, {
        env: {
          basePath: "",
          path,
          url,
        },
      });
      console.log(`Response status: ${res.status}`);

      // Debug response if error
      if (res.status !== 200) {
        try {
          const text = await res.clone().text();
          console.log(
            `Response body: ${text.substring(0, 200)}${text.length > 200 ? "..." : ""}`,
          );
        } catch (e) {
          console.log(`Failed to get response body: ${e}`);
        }
      }

      expect(res.status).toBe(200);

      const body = (await res.json()) as ApiResponse<CredentialResponse>;
      expect(body.status).toBe("success");
      expect(body.data.credential).toBeDefined();
      expect(body.data.credential.type).toContain("OpenBadgeCredential");
      expect(body.data.verification).toBeDefined();
    });

    test("should return 404 for non-existent assertion", async () => {
      const path = `/api/assertions/non-existent-id`;
      const url = baseUrl + path;

      console.log(`Making request to: ${url}`);
      const req = new Request(url, {
        method: "GET",
      });

      const res = await app.fetch(req, {
        env: {
          basePath: "",
          path,
          url,
        },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/verify/assertions/:id", () => {
    test("should verify an assertion", async () => {
      const path = `/api/verify/assertions/${assertionId}`;
      const url = baseUrl + path;

      console.log(`Making request to: ${url}`);
      const req = new Request(url, {
        method: "GET",
      });

      const res = await app.fetch(req, {
        env: {
          basePath: "",
          path,
          url,
        },
      });
      console.log(`Response status: ${res.status}`);

      // Debug response if error
      if (res.status !== 200) {
        try {
          const text = await res.clone().text();
          console.log(
            `Response body: ${text.substring(0, 200)}${text.length > 200 ? "..." : ""}`,
          );
        } catch (e) {
          console.log(`Failed to get response body: ${e}`);
        }
      }

      expect(res.status).toBe(200);

      const body = (await res.json()) as VerificationResponse;
      expect(body.valid).toBe(true);
    });
  });

  describe("POST /api/assertions/:id/revoke", () => {
    test("should revoke an assertion", async () => {
      const revokePath = `/api/assertions/${assertionId}/revoke`;
      const revokeUrl = baseUrl + revokePath;

      console.log(`Making revoke request to: ${revokeUrl}`);
      const revokeReq = new Request(revokeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Testing revocation",
        }),
      });

      const revokeRes = await app.fetch(revokeReq, {
        env: {
          basePath: "",
          path: revokePath,
          url: revokeUrl,
        },
      });
      console.log(`Revoke response status: ${revokeRes.status}`);

      // Debug response if error
      if (revokeRes.status !== 200) {
        try {
          const text = await revokeRes.clone().text();
          console.log(
            `Revoke response body: ${text.substring(0, 200)}${text.length > 200 ? "..." : ""}`,
          );
        } catch (e) {
          console.log(`Failed to get response body: ${e}`);
        }
      }

      expect(revokeRes.status).toBe(200);

      // Verify the assertion is now revoked
      const verifyPath = `/api/verify/assertions/${assertionId}`;
      const verifyUrl = baseUrl + verifyPath;

      console.log(`Making verify request to: ${verifyUrl}`);
      const verifyReq = new Request(verifyUrl, {
        method: "GET",
      });

      const verifyRes = await app.fetch(verifyReq, {
        env: {
          basePath: "",
          path: verifyPath,
          url: verifyUrl,
        },
      });
      console.log(`Verify response status: ${verifyRes.status}`);

      expect(verifyRes.status).toBe(200);

      const verifyBody = (await verifyRes.json()) as VerificationResponse;
      expect(verifyBody.valid).toBe(false);
      expect(verifyBody.revoked).toBe(true);
    });

    test("should include status info in OB3 credential after revocation", async () => {
      // First revoke the assertion
      const revokePath = `/api/assertions/${assertionId}/revoke`;
      const revokeUrl = baseUrl + revokePath;

      console.log(`Making revoke request to: ${revokeUrl}`);
      const revokeReq = new Request(revokeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Testing revocation",
        }),
      });

      await app.fetch(revokeReq, {
        env: {
          basePath: "",
          path: revokePath,
          url: revokeUrl,
        },
      });

      // Then get the OB3 credential
      const getPath = `/api/assertions/${assertionId}?format=ob3`;
      const getUrl = baseUrl + getPath;

      console.log(`Checking OB3 credential after revocation: ${getUrl}`);
      const getReq = new Request(getUrl, {
        method: "GET",
      });

      const getRes = await app.fetch(getReq, {
        env: {
          basePath: "",
          path: getPath,
          url: getUrl,
        },
      });

      expect(getRes.status).toBe(200);

      const body = (await getRes.json()) as ApiResponse<
        CredentialResponse & { revoked: boolean; revocationReason: string }
      >;
      expect(body.status).toBe("success");
      expect(body.data.revoked).toBe(true);
      expect(body.data.revocationReason).toBe("Testing revocation");
      expect(body.data.credential).toBeDefined();
    });
  });
});
