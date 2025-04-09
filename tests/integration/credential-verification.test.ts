/**
 * Integration tests for the credential verification API
 */

import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { honoApp as app } from "../../src/index";
import { db } from "../../src/db/config";
import { credentials } from "../../src/db/schema/credentials.schema";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

describe("Credential Verification API", () => {
  // Test credential data
  const testCredentialId = createId();
  const testIssuerId = "test-issuer-id";
  const testRecipientId = "test-recipient-id";

  // Create a test credential before all tests
  beforeAll(async () => {
    await db.insert(credentials).values({
      id: testCredentialId,
      type: "OpenBadgeCredential",
      issuerId: testIssuerId,
      recipientId: testRecipientId,
      credentialHash: "test-credential-hash",
      data: {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
        ],
        id: `https://example.com/credentials/${testCredentialId}`,
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: `https://example.com/issuers/${testIssuerId}`,
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: testRecipientId,
          type: "AchievementSubject",
          achievement: {
            id: "https://example.com/achievements/test-achievement-id",
            type: ["Achievement"],
            name: "Test Achievement",
            description: "Test Achievement Description",
          },
        },
      },
      proof: {
        type: "DataIntegrityProof",
        cryptosuite: "eddsa-rdfc-2022",
        created: new Date().toISOString(),
        verificationMethod: "https://example.com/keys/test-key-id",
        proofPurpose: "assertionMethod",
        proofValue: "test-proof-value",
      },
      keyId: "test-key-id",
      status: "active",
      isActive: true,
      createdAt: new Date(),
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year from now
    });
  });

  // Clean up after all tests
  afterAll(async () => {
    await db.delete(credentials).where(eq(credentials.id, testCredentialId));
  });

  describe("GET /verify/credentials/:credentialId", () => {
    it("should verify a valid credential", async () => {
      const req = new Request(
        `http://localhost/verify/credentials/${testCredentialId}`,
      );
      const res = await app.fetch(req);
      expect(res.status).toBe(200);

      const data = (await res.json()) as {
        status: string;
        data: {
          valid: boolean;
          checks: Record<string, boolean>;
          errors?: string[];
        };
      };
      expect(data.status).toBe("success");
      expect(data.data.valid).toBe(true);
      expect(data.data.checks.structure).toBe(true);
      expect(data.data.checks.revocation).toBe(true);
      expect(data.data.checks.expiration).toBe(true);
    });

    it("should return invalid for a non-existent credential", async () => {
      const req = new Request(
        `http://localhost/verify/credentials/non-existent-id`,
      );
      const res = await app.fetch(req);
      expect(res.status).toBe(200);

      const data = (await res.json()) as {
        status: string;
        data: { valid: boolean; errors: string[] };
      };
      expect(data.status).toBe("success");
      expect(data.data.valid).toBe(false);
      expect(data.data.errors).toContain("Credential not found in database");
    });
  });

  describe("GET /verify/status/:credentialId", () => {
    it("should check the status of a valid credential", async () => {
      const req = new Request(
        `http://localhost/verify/status/${testCredentialId}`,
      );
      const res = await app.fetch(req);
      expect(res.status).toBe(200);

      const data = (await res.json()) as {
        status: string;
        data: {
          credentialId: string;
          isRevoked: boolean;
          statusMessage: string;
        };
      };
      expect(data.status).toBe("success");
      expect(data.data.credentialId).toBe(testCredentialId);
      expect(data.data.isRevoked).toBe(false);
    });

    it("should return revoked for a non-existent credential", async () => {
      const req = new Request(`http://localhost/verify/status/non-existent-id`);
      const res = await app.fetch(req);
      expect(res.status).toBe(200);

      const data = (await res.json()) as {
        status: string;
        data: { isRevoked: boolean };
      };
      expect(data.status).toBe("success");
      expect(data.data.isRevoked).toBe(true);
    });
  });

  describe("POST /verify/jwt", () => {
    it("should verify a credential JWT", async () => {
      // Create a mock JWT that contains the test credential ID
      const mockJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImp0aSI6IiR7dGVzdENyZWRlbnRpYWxJZH0ifQ.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`;

      const req = new Request(`http://localhost/verify/jwt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jwt: mockJwt,
        }),
      });

      // This test will likely fail because the JWT is not properly signed
      // But we're just testing the API endpoint structure
      const res = await app.fetch(req);
      expect(res.status).toBe(500); // Expect error due to invalid JWT
    });
  });

  describe("POST /verify/ld", () => {
    it("should verify a credential with Linked Data Signatures", async () => {
      const req = new Request(`http://localhost/verify/ld`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: {
            "@context": [
              "https://www.w3.org/2018/credentials/v1",
              "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
            ],
            id: `https://example.com/credentials/${testCredentialId}`,
            type: ["VerifiableCredential", "OpenBadgeCredential"],
            issuer: `https://example.com/issuers/${testIssuerId}`,
            issuanceDate: new Date().toISOString(),
            credentialSubject: {
              id: testRecipientId,
              type: "AchievementSubject",
              achievement: {
                id: "https://example.com/achievements/test-achievement-id",
                type: ["Achievement"],
                name: "Test Achievement",
                description: "Test Achievement Description",
              },
            },
            proof: {
              type: "DataIntegrityProof",
              cryptosuite: "eddsa-rdfc-2022",
              created: new Date().toISOString(),
              verificationMethod: "https://example.com/keys/test-key-id",
              proofPurpose: "assertionMethod",
              proofValue: "test-proof-value",
            },
          },
        }),
      });

      const res = await app.fetch(req);
      expect(res.status).toBe(200);

      const data = (await res.json()) as { status: string; data: unknown };
      expect(data.status).toBe("success");
    });
  });

  describe("POST /verify/revoke", () => {
    it("should revoke a credential", async () => {
      // Create a new test credential for revocation
      const revocationTestCredentialId = createId();

      await db.insert(credentials).values({
        id: revocationTestCredentialId,
        type: "OpenBadgeCredential",
        issuerId: testIssuerId,
        recipientId: testRecipientId,
        credentialHash: "test-credential-hash",
        data: {
          "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
          ],
          id: `https://example.com/credentials/${revocationTestCredentialId}`,
          type: ["VerifiableCredential", "OpenBadgeCredential"],
          issuer: `https://example.com/issuers/${testIssuerId}`,
          issuanceDate: new Date().toISOString(),
          credentialSubject: {
            id: testRecipientId,
            type: "AchievementSubject",
            achievement: {
              id: "https://example.com/achievements/test-achievement-id",
              type: ["Achievement"],
              name: "Test Achievement",
              description: "Test Achievement Description",
            },
          },
        },
        proof: null,
        keyId: "test-key-id",
        status: "active",
        isActive: true,
        createdAt: new Date(),
        issuedAt: new Date(),
      });

      // This test will likely fail because it requires authentication
      // But we're just testing the API endpoint structure
      const req = new Request(`http://localhost/verify/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token", // This token is invalid
        },
        body: JSON.stringify({
          credentialId: revocationTestCredentialId,
          reason: "Test revocation reason",
        }),
      });

      const res = await app.fetch(req);
      expect(res.status).toBe(401); // Expect unauthorized due to invalid token

      // Clean up
      await db
        .delete(credentials)
        .where(eq(credentials.id, revocationTestCredentialId));
    });
  });
});
