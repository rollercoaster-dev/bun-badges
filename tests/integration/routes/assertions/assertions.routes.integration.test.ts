import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { Hono } from "hono";
import assertionsRoutes from "@/routes/assertions.routes";
import verificationRoutes from "@/routes/verification.routes";
import { db } from "@/db/config";
import { issuerProfiles, badgeClasses } from "@/db/schema";
import crypto from "crypto";
import {
  TestData,
  getOB2AssertionJson,
  getOB3CredentialJson,
  updateOB2AssertionJson,
  updateOB3CredentialJson,
} from "../../../helpers/test-utils";

// Define interfaces for the API responses
interface ApiResponse<T> {
  status: "success" | "error";
  data: T;
}

interface AssertionResponse {
  assertion: {
    assertionId: string;
    assertionJson: {
      "@context": string | string[];
      type: string | string[];
      id: string;
      proof?: unknown;
      credentialStatus?: {
        type: string;
        id: string;
      };
    };
  };
}

interface CredentialResponse {
  credential: {
    "@context": string[];
    type: string[];
    id: string;
    issuer: {
      id: string;
      type: string;
      name: string;
      url: string;
    };
    issuanceDate: string;
    credentialSubject: {
      id: string;
      type: string;
      achievement: {
        id: string;
        type: string[];
        name: string;
        description?: string;
        criteria?: {
          narrative: string;
        };
        image?: {
          id: string;
          type: string;
        };
      };
    };
    proof?: {
      type: string;
      created: string;
      verificationMethod: string;
      proofPurpose: string;
      proofValue?: string;
      jws?: string;
    };
  };
  verification?: {
    valid: boolean;
    checks: {
      signature?: boolean;
      revocation?: boolean;
      structure?: boolean;
    };
  };
}

interface VerificationResponse {
  valid: boolean;
  checks: {
    signature?: boolean;
    revocation?: boolean;
    structure?: boolean;
  };
  errors: string[];
}

describe("Assertions Routes Integration", () => {
  let testData: TestData;
  let assertionId: string;
  let app: Hono;
  const baseUrl = "http://example.org"; // Using a fixed base URL for tests

  beforeEach(async () => {
    testData = new TestData();

    // Create test data
    const issuerId = crypto.randomUUID();
    const badgeId = crypto.randomUUID();
    assertionId = crypto.randomUUID();

    // Create test issuer
    await db.insert(issuerProfiles).values({
      issuerId,
      name: "Test Issuer",
      url: "https://example.com",
      email: "test@example.com",
      ownerUserId: "test-user",
      issuerJson: {
        "@context": "https://w3id.org/openbadges/v2",
        type: "Issuer",
        id: `https://example.com/issuers/${issuerId}`,
        name: "Test Issuer",
        url: "https://example.com",
        email: "test@example.com",
      },
    });

    // Create test badge
    await db.insert(badgeClasses).values({
      badgeId,
      issuerId,
      name: "Test Badge",
      description: "Test badge description",
      imageUrl: "https://example.com/badge.png",
      criteria: JSON.stringify({ narrative: "Test criteria" }),
      badgeJson: {
        "@context": "https://w3id.org/openbadges/v2",
        type: "BadgeClass",
        id: `https://example.com/badges/${badgeId}`,
        name: "Test Badge",
        description: "Test badge description",
        image: "https://example.com/badge.png",
        criteria: { narrative: "Test criteria" },
        issuer: `https://example.com/issuers/${issuerId}`,
      },
    });

    testData.set("issuerId", issuerId);
    testData.set("badgeId", badgeId);
    testData.set("assertionId", assertionId);

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
    // Clear test data from the database
    await db.delete(badgeClasses).execute();
    await db.delete(issuerProfiles).execute();
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

      const data = (await res.json()) as ApiResponse<AssertionResponse>;
      expect(data.status).toBe("success");
      expect(data.data.assertion).toBeDefined();
      expect(data.data.assertion.assertionId).toBe(assertionId);

      const assertionJson = data.data.assertion.assertionJson;
      expect(assertionJson["@context"]).toBe("https://w3id.org/openbadges/v2");
      expect(assertionJson.type).toBe("Assertion");
      expect(assertionJson.id).toContain(assertionId);
    });

    test("should return an assertion by ID in OB3 format", async () => {
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

      expect(res.status).toBe(200);

      const data = (await res.json()) as ApiResponse<CredentialResponse>;
      expect(data.status).toBe("success");
      expect(data.data.credential).toBeDefined();

      const credential = data.data.credential;
      expect(Array.isArray(credential["@context"])).toBe(true);
      expect(credential["@context"]).toContain(
        "https://www.w3.org/2018/credentials/v1",
      );
      expect(credential.type).toContain("OpenBadgeCredential");
      expect(credential.id).toContain(assertionId);
      expect(credential.proof).toBeDefined();
    });

    test("should verify an assertion by ID", async () => {
      const path = `/api/verify/${assertionId}`;
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

      expect(res.status).toBe(200);

      const data = (await res.json()) as ApiResponse<VerificationResponse>;
      expect(data.status).toBe("success");
      expect(data.data.valid).toBe(true);
      expect(data.data.checks.signature).toBe(true);
      expect(data.data.checks.revocation).toBe(true);
      expect(data.data.checks.structure).toBe(true);
    });
  });
});
