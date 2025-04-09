import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { app } from "../../src/index";
import { KeyType, KeyAlgorithm } from "../../src/services/key-management.service";
import { generateToken } from "../../src/utils/auth/jwt";

describe("API Endpoints", () => {
  // Create a test admin token
  let adminToken: string;
  let issuerToken: string;

  beforeAll(async () => {
    // Generate an admin token
    adminToken = await generateToken({
      sub: "admin",
      type: "access",
      scope: "openid profile email",
    });

    // Generate an issuer token
    issuerToken = await generateToken({
      sub: "issuer-123",
      type: "access",
      scope: "ob:credentials:create",
    });
  });

  describe("Key Management API", () => {
    test("should create a new key", async () => {
      // Create a new key
      const response = await app.request("/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          type: KeyType.SIGNING,
          algorithm: KeyAlgorithm.RS256,
          id: "api-test-key",
        }),
      });

      // Verify the response
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBe("api-test-key");
      expect(data.type).toBe(KeyType.SIGNING);
      expect(data.algorithm).toBe(KeyAlgorithm.RS256);
      expect(data.isRevoked).toBe(false);
    });

    test("should get all keys", async () => {
      // Get all keys
      const response = await app.request("/keys", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
        },
      });

      // Verify the response
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.keys).toBeDefined();
      expect(Array.isArray(data.keys)).toBe(true);
      expect(data.keys.length).toBeGreaterThan(0);
      expect(data.keys.some((key: any) => key.id === "api-test-key")).toBe(true);
    });

    test("should get a key by ID", async () => {
      // Get a key by ID
      const response = await app.request("/keys/api-test-key", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
        },
      });

      // Verify the response
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe("api-test-key");
      expect(data.type).toBe(KeyType.SIGNING);
      expect(data.algorithm).toBe(KeyAlgorithm.RS256);
    });

    test("should rotate a key", async () => {
      // Rotate a key
      const response = await app.request("/keys/api-test-key/rotate", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
        },
      });

      // Verify the response
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).not.toBe("api-test-key");
      expect(data.id).toContain("api-test-key-rotated-");
      expect(data.type).toBe(KeyType.SIGNING);
      expect(data.algorithm).toBe(KeyAlgorithm.RS256);
      expect(data.isRevoked).toBe(false);
    });

    test("should delete a key", async () => {
      // Create a key to delete
      await app.request("/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          type: KeyType.SIGNING,
          algorithm: KeyAlgorithm.RS256,
          id: "api-delete-test-key",
        }),
      });

      // Delete the key
      const response = await app.request("/keys/api-delete-test-key", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
        },
      });

      // Verify the response
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Key deleted successfully");
    });

    test("should deny access to non-admin users", async () => {
      // Try to get all keys with a non-admin token
      const response = await app.request("/keys", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${issuerToken}`,
        },
      });

      // Verify the response
      expect(response.status).toBe(403);
    });
  });

  describe("Credential Signing API", () => {
    test("should sign a credential using JWT", async () => {
      // Create a test credential payload
      const payload = {
        iss: "https://example.com",
        sub: "recipient-123",
        vc: {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential", "OpenBadgeCredential"],
          issuer: {
            id: "https://example.com",
            name: "Example Issuer"
          },
          credentialSubject: {
            id: "recipient-123",
            achievement: {
              id: "https://example.com/badges/123",
              name: "Test Badge",
              description: "A test badge for unit testing"
            }
          }
        }
      };

      // Sign the credential
      const response = await app.request("/credentials/sign/jwt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${issuerToken}`,
        },
        body: JSON.stringify({
          payload,
        }),
      });

      // Verify the response
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.jwt).toBeDefined();
      expect(typeof data.jwt).toBe("string");
      expect(data.jwt.split(".").length).toBe(3); // Header, payload, signature
    });

    test("should verify a credential JWT", async () => {
      // Create a test credential payload
      const payload = {
        iss: "https://example.com",
        sub: "recipient-123",
        vc: {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential", "OpenBadgeCredential"],
          issuer: {
            id: "https://example.com",
            name: "Example Issuer"
          },
          credentialSubject: {
            id: "recipient-123",
            achievement: {
              id: "https://example.com/badges/123",
              name: "Test Badge",
              description: "A test badge for unit testing"
            }
          }
        }
      };

      // Sign the credential
      const signResponse = await app.request("/credentials/sign/jwt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${issuerToken}`,
        },
        body: JSON.stringify({
          payload,
        }),
      });

      const signData = await signResponse.json();
      const jwt = signData.jwt;

      // Verify the credential
      const verifyResponse = await app.request("/credentials/verify/jwt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${issuerToken}`,
        },
        body: JSON.stringify({
          jwt,
        }),
      });

      // Verify the response
      expect(verifyResponse.status).toBe(200);
      const verifyData = await verifyResponse.json();
      expect(verifyData.isValid).toBe(true);
      expect(verifyData.payload).toBeDefined();
      expect(verifyData.payload.iss).toBe(payload.iss);
      expect(verifyData.payload.sub).toBe(payload.sub);
    });

    test("should sign a credential using Linked Data Signatures", async () => {
      // Create a test credential
      const credential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://w3id.org/security/suites/ed25519-2020/v1"
        ],
        id: "https://example.com/credentials/123",
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: {
          id: "https://example.com",
          name: "Example Issuer"
        },
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: "did:example:recipient-123",
          achievement: {
            id: "https://example.com/badges/123",
            name: "Test Badge",
            description: "A test badge for unit testing"
          }
        }
      };

      // Sign the credential
      const response = await app.request("/credentials/sign/ld", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${issuerToken}`,
        },
        body: JSON.stringify({
          credential,
        }),
      });

      // Verify the response
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.credential).toBeDefined();
      expect(data.credential.proof).toBeDefined();
      expect(data.credential.proof.type).toBe("Ed25519Signature2020");
      expect(data.credential.proof.proofPurpose).toBe("assertionMethod");
    });

    test("should verify a credential with Linked Data Signatures", async () => {
      // Create a test credential
      const credential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://w3id.org/security/suites/ed25519-2020/v1"
        ],
        id: "https://example.com/credentials/123",
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: {
          id: "https://example.com",
          name: "Example Issuer"
        },
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: "did:example:recipient-123",
          achievement: {
            id: "https://example.com/badges/123",
            name: "Test Badge",
            description: "A test badge for unit testing"
          }
        }
      };

      // Sign the credential
      const signResponse = await app.request("/credentials/sign/ld", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${issuerToken}`,
        },
        body: JSON.stringify({
          credential,
        }),
      });

      const signData = await signResponse.json();
      const signedCredential = signData.credential;

      // Verify the credential
      const verifyResponse = await app.request("/credentials/verify/ld", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${issuerToken}`,
        },
        body: JSON.stringify({
          credential: signedCredential,
        }),
      });

      // Verify the response
      expect(verifyResponse.status).toBe(200);
      const verifyData = await verifyResponse.json();
      expect(verifyData.isValid).toBe(true);
    });

    test("should deny access to non-issuer users for signing", async () => {
      // Create a non-issuer token
      const nonIssuerToken = await generateToken({
        sub: "user-123",
        type: "access",
        scope: "openid profile email",
      });

      // Try to sign a credential with a non-issuer token
      const response = await app.request("/credentials/sign/jwt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${nonIssuerToken}`,
        },
        body: JSON.stringify({
          payload: {},
        }),
      });

      // Verify the response
      expect(response.status).toBe(403);
    });
  });
});
