import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { Hono } from "hono";
import assertionsRoutes from "@/routes/assertions.routes";
import verificationRoutes from "@/routes/verification.routes";
import { db } from "@/db/config";
import { issuerProfiles, badgeClasses, signingKeys, users } from "@/db/schema";
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
    await db.execute(
      `INSERT INTO issuer_profiles (
        issuer_id, 
        name, 
        url, 
        email, 
        owner_user_id, 
        issuer_json
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      )`,
      [
        issuerId,
        "Test Issuer",
        "https://example.com",
        "test@example.com",
        "test-user",
        JSON.stringify({
          "@context": "https://w3id.org/openbadges/v2",
          type: "Issuer",
          id: `https://example.com/issuers/${issuerId}`,
          name: "Test Issuer",
          url: "https://example.com",
          email: "test@example.com",
        }),
      ],
    );

    // Create test badge
    await db.execute(
      `INSERT INTO badge_classes (
        badge_id, 
        issuer_id, 
        name, 
        description, 
        image_url, 
        criteria, 
        badge_json
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )`,
      [
        badgeId,
        issuerId,
        "Test Badge",
        "Test badge description",
        "https://example.com/badge.png",
        "Test criteria",
        JSON.stringify({
          "@context": "https://w3id.org/openbadges/v2",
          type: "BadgeClass",
          id: `https://example.com/badges/${badgeId}`,
          name: "Test Badge",
          description: "Test badge description",
          image: "https://example.com/badge.png",
          criteria: { narrative: "Test criteria" },
          issuer: `https://example.com/issuers/${issuerId}`,
        }),
      ],
    );

    // Create test assertion - this was missing before
    await db.execute(
      `INSERT INTO badge_assertions (
        assertion_id,
        badge_id,
        issuer_id,
        recipient_identity,
        recipient_type,
        recipient_hashed,
        issued_on,
        assertion_json,
        revoked
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )`,
      [
        assertionId,
        badgeId,
        issuerId,
        "test-recipient@example.com",
        "email",
        false,
        new Date(),
        JSON.stringify({
          "@context": "https://w3id.org/openbadges/v2",
          type: "Assertion",
          id: `${baseUrl}/assertions/${assertionId}`,
          recipient: {
            identity: "test-recipient@example.com",
            type: "email",
            hashed: false,
          },
          badge: `${baseUrl}/badges/${badgeId}`,
          issuedOn: new Date().toISOString(),
          verification: {
            type: "HostedBadge",
          },
        }),
        false,
      ],
    );

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
    await db.delete(badgeClasses);
    await db.delete(signingKeys);
    await db.delete(issuerProfiles);
    await db.delete(users);
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
