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

    try {
      // Use the new db-test-utils if available
      const { testInsert } = await import("../../../helpers/db-test-utils");

      // Create test issuer
      await testInsert(
        "issuer_profiles",
        {
          issuerId,
          name: "Test Issuer",
          url: "https://example.com",
          email: "test@example.com",
          ownerUserId: "test-user",
          issuerJson: JSON.stringify({
            "@context": "https://w3id.org/openbadges/v2",
            type: "Issuer",
            id: `https://example.com/issuers/${issuerId}`,
            name: "Test Issuer",
            url: "https://example.com",
            email: "test@example.com",
          }),
        },
        {
          issuerId: "uuid",
          issuerJson: "jsonb",
        },
      );

      console.log("Test issuer created successfully with db-test-utils");
    } catch (error) {
      console.error(
        "Failed to use db-test-utils, falling back to legacy methods",
        error,
      );

      // Create test issuer using legacy method
      try {
        await db.execute(
          `INSERT INTO issuer_profiles (
          issuer_id, 
          name, 
          url, 
          email, 
          owner_user_id, 
          issuer_json
        ) VALUES (
          $1::uuid, $2, $3, $4, $5, $6::jsonb
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
      } catch (error) {
        // Fallback to using insert if execute is not available
        await db.insert(issuerProfiles).values({
          issuerId,
          name: "Test Issuer",
          url: "https://example.com",
          email: "test@example.com",
          ownerUserId: "test-user",
          issuerJson: JSON.stringify({
            "@context": "https://w3id.org/openbadges/v2",
            type: "Issuer",
            id: `https://example.com/issuers/${issuerId}`,
            name: "Test Issuer",
            url: "https://example.com",
            email: "test@example.com",
          }),
        });
      }
      console.log("Test issuer created successfully with legacy methods");
    }

    try {
      // Use the new db-test-utils if available
      const { testInsert } = await import("../../../helpers/db-test-utils");

      // Create test badge
      await testInsert(
        "badge_classes",
        {
          badgeId,
          issuerId,
          name: "Test Badge",
          description: "Test badge description",
          imageUrl: "https://example.com/badge.png",
          criteria: "Test criteria",
          badgeJson: JSON.stringify({
            "@context": "https://w3id.org/openbadges/v2",
            type: "BadgeClass",
            id: `https://example.com/badges/${badgeId}`,
            name: "Test Badge",
            description: "Test badge description",
            image: "https://example.com/badge.png",
            criteria: { narrative: "Test criteria" },
            issuer: `https://example.com/issuers/${issuerId}`,
          }),
        },
        {
          badgeId: "uuid",
          issuerId: "uuid",
          badgeJson: "jsonb",
        },
      );

      // Create test assertion
      await testInsert(
        "badge_assertions",
        {
          assertionId,
          badgeId,
          issuerId,
          recipientIdentity: "test-recipient@example.com",
          recipientType: "email",
          recipientHashed: false,
          issuedOn: new Date(),
          assertionJson: JSON.stringify({
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
          revoked: false,
        },
        {
          assertionId: "uuid",
          badgeId: "uuid",
          issuerId: "uuid",
          issuedOn: "timestamp",
          assertionJson: "jsonb",
          recipientHashed: "boolean",
          revoked: "boolean",
        },
      );

      console.log(
        "Test badge and assertion created successfully with db-test-utils",
      );
    } catch (error) {
      console.error(
        "Failed to use db-test-utils for badge/assertion, falling back to legacy methods",
        error,
      );

      // Create test badge using legacy method
      try {
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
            $1::uuid, $2::uuid, $3, $4, $5, $6, $7::jsonb
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
            $1::uuid, $2::uuid, $3::uuid, $4, $5, $6::boolean, $7::timestamp, $8::jsonb, $9::boolean
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
      } catch (insertError) {
        console.error(
          "Error in direct SQL operations, badge creation may have failed",
          insertError,
        );
        // We don't rethrow as we want the test to run anyway if possible
      }
    }

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
    try {
      // Use the new db-test-utils if available
      const { cleanupTestData } = await import(
        "../../../helpers/db-test-utils"
      );
      await cleanupTestData();
      console.log("Test data cleanup successful with db-test-utils");
    } catch (error) {
      console.error(
        "Failed to use db-test-utils for cleanup, falling back to legacy methods",
        error,
      );

      // Fallback to legacy cleanup methods
      try {
        await db.delete(badgeClasses);
      } catch (error) {
        // Fallback to using direct SQL if delete is not supported
        await db.execute(`DELETE FROM badge_classes`);
      }
      try {
        await db.delete(signingKeys);
      } catch (error) {
        // Fallback to using direct SQL if delete is not supported
        await db.execute(`DELETE FROM signing_keys`);
      }

      try {
        await db.delete(issuerProfiles);
      } catch (error) {
        // Fallback to using direct SQL if delete is not supported
        await db.execute(`DELETE FROM issuer_profiles`);
      }

      try {
        await db.delete(users);
      } catch (error) {
        // Fallback to using direct SQL if delete is not supported
        await db.execute(`DELETE FROM users`);
      }

      console.log("Test data cleanup successful with legacy methods");
    }
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
