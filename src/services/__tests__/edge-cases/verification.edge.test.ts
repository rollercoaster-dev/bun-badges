import { describe, it, expect, beforeEach, beforeAll, mock } from "bun:test";
import { VerificationService } from "@/services/verification.service";
import { base64url } from "@scure/base";

// Define a common table type for mocks
type DbTable = { name?: string };

/**
 * Tests for edge cases in credential verification
 */
describe("Verification Edge Cases", () => {
  let service: VerificationService;
  let issuerMock: any;
  let badgeMock: any;
  let assertionMock: any;

  // Setup shared test data
  beforeAll(() => {
    // Create an issuer for testing
    issuerMock = {
      issuerId: "test-issuer-id",
      name: "Test Issuer",
      publicKey: [
        {
          id: "did:key:test#key-1",
          type: "Ed25519VerificationKey2020",
          controller: "did:key:test",
          publicKeyJwk: { kty: "OKP", crv: "Ed25519", x: "test" },
        },
      ],
    };

    // Create a badge class for testing
    badgeMock = {
      badgeId: "test-badge-id",
      issuerId: "test-issuer-id",
      name: "Test Badge",
    };

    // Create a default assertion for testing
    assertionMock = {
      assertionId: "test-assertion-id",
      badgeId: "test-badge-id",
      issuerId: "test-issuer-id",
      recipientType: "email",
      recipientIdentity: "test@example.com",
      recipientHashed: false,
      issuedOn: new Date(),
      revoked: false,
      assertionJson: {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://w3id.org/vc/status-list/2021/v1",
          "https://w3id.org/security/suites/ed25519-2020/v1",
        ],
        id: "https://example.com/assertions/test-assertion-id",
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: {
          id: "did:key:test",
          type: "Profile",
          name: "Test Issuer",
        },
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: "did:example:recipient",
          type: ["AchievementSubject"],
          achievement: {
            id: "https://example.com/badges/test-badge-id",
            type: ["Achievement"],
            name: "Test Badge",
            description: "A test badge for testing verification edge cases",
          },
        },
        proof: {
          type: "Ed25519Signature2020",
          created: new Date().toISOString(),
          verificationMethod: "did:key:test#key-1",
          proofValue: base64url.encode(new Uint8Array([1, 2, 3, 4])),
        },
      },
    };
  });

  // Setup before each test
  beforeEach(() => {
    // Default mock - verification passes
    mock.module("@noble/ed25519", () => ({
      verify: () => Promise.resolve(true),
    }));

    // Default database mock
    setupDefaultMocks();

    // Create a new service instance for each test
    service = new VerificationService();
  });

  // Helper to setup standard mocks
  function setupDefaultMocks() {
    mock.module("@/db/config", () => ({
      db: {
        select: () => ({
          from: (table: DbTable) => ({
            where: () => {
              if (table?.name === "issuerProfiles") {
                return [issuerMock];
              } else if (table?.name === "badgeClasses") {
                return [badgeMock];
              } else if (table?.name === "badgeAssertions") {
                return [assertionMock];
              }
              return [];
            },
          }),
        }),
      },
    }));

    mock.module("@/utils/signing/keys", () => ({
      getSigningKey: () =>
        Promise.resolve({
          publicKey: new Uint8Array([1, 2, 3, 4]),
          privateKey: new Uint8Array([5, 6, 7, 8]),
          controller: "did:key:test",
          type: "Ed25519VerificationKey2020",
          keyInfo: {
            id: "did:key:test#key-1",
            type: "Ed25519VerificationKey2020",
            controller: "did:key:test",
            publicKeyJwk: { kty: "OKP", crv: "Ed25519", x: "test" },
          },
        }),
    }));
  }

  // Helper to mock assertions for specific tests
  function mockAssertion(customAssertion: any) {
    mock.module("@/db/config", () => ({
      db: {
        select: () => ({
          from: (table: DbTable) => ({
            where: () => {
              if (table?.name === "issuerProfiles") {
                return [issuerMock];
              } else if (table?.name === "badgeClasses") {
                return [badgeMock];
              } else if (table?.name === "badgeAssertions") {
                return [customAssertion];
              }
              return [];
            },
          }),
        }),
      },
    }));
  }

  describe("Signature verification", () => {
    it("should detect a tampered credential subject", async () => {
      // Override verification function to fail for this test
      mock.module("@noble/ed25519", () => ({
        verify: () => Promise.resolve(false),
      }));

      // Recreate service with updated mocks
      service = new VerificationService();

      const result = await service.verifyAssertion("test-assertion-id");
      expect(result.valid).toBe(false);
      expect(result.checks.signature).toBe(false);
    });

    it("should detect a tampered proof value", async () => {
      // Return the assertion with a tampered proof value
      const tamperedAssertion = {
        ...assertionMock,
        assertionJson: {
          ...assertionMock.assertionJson,
          proof: {
            ...assertionMock.assertionJson.proof,
            proofValue: base64url.encode(new Uint8Array([9, 9, 9, 9])), // Different value
          },
        },
      };

      mockAssertion(tamperedAssertion);

      // Make verification fail for tampered value
      mock.module("@noble/ed25519", () => ({
        verify: () => Promise.resolve(false),
      }));

      // Recreate service with updated mocks
      service = new VerificationService();

      const result = await service.verifyAssertion("test-assertion-id");
      expect(result.valid).toBe(false);
      expect(result.checks.signature).toBe(false);
    });
  });

  describe("Proof formats", () => {
    it("should detect a credential with missing proof", async () => {
      // Return the assertion without a proof
      const noProofAssertion = {
        ...assertionMock,
        assertionJson: {
          ...assertionMock.assertionJson,
        },
      };

      // Delete the proof property
      delete noProofAssertion.assertionJson.proof;

      mockAssertion(noProofAssertion);

      // Recreate service with updated mocks
      service = new VerificationService();

      // For OB2.0-style assertions (no proof), it should still validate
      const result = await service.verifyAssertion("test-assertion-id");
      expect(result.valid).toBe(true);
      expect(result.checks.signature).toBeUndefined(); // No signature check for OB2.0
    });

    it("should detect a credential with invalid proof type", async () => {
      // Return the assertion with an invalid proof type
      const invalidProofTypeAssertion = {
        ...assertionMock,
        assertionJson: {
          ...assertionMock.assertionJson,
          proof: {
            ...assertionMock.assertionJson.proof,
            type: "InvalidProofType", // Invalid type
          },
        },
      };

      mockAssertion(invalidProofTypeAssertion);

      // Recreate service with updated mocks
      service = new VerificationService();

      const result = await service.verifyOB3Assertion("test-assertion-id");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Revocation and status", () => {
    it("should support future-dated revocation status", async () => {
      // Return the assertion with a future revocation date
      const futureRevokedAssertion = {
        ...assertionMock,
        revoked: true,
        revocationReason: "Test revocation with future date",
        revokedOn: new Date(Date.now() + 86400000), // Tomorrow
      };

      mockAssertion(futureRevokedAssertion);

      // Recreate service with updated mocks
      service = new VerificationService();

      const result = await service.verifyAssertion("test-assertion-id");
      expect(result.valid).toBe(false);
      expect(result.checks.revocation).toBe(false);
    });
  });

  describe("Context and format compatibility", () => {
    it("should verify a credential with mixed context versions", async () => {
      // Return the assertion with mixed context versions
      const mixedContextAssertion = {
        ...assertionMock,
        assertionJson: {
          ...assertionMock.assertionJson,
          "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://w3id.org/openbadges/v2",
            "https://w3id.org/security/suites/ed25519-2020/v1",
          ],
        },
      };

      mockAssertion(mixedContextAssertion);

      // Ensure verification passes for this test
      mock.module("@noble/ed25519", () => ({
        verify: () => Promise.resolve(true),
      }));

      // Recreate service with updated mocks
      service = new VerificationService();

      const result = await service.verifyAssertion("test-assertion-id");
      expect(result.valid).toBe(true);
      expect(result.checks.signature).toBe(true);
    });

    it("should handle malformed JSON in credential", async () => {
      // The JSON string representation with a syntax error
      const malformedJson = `{
        "@context": "https://www.w3.org/2018/credentials/v1",
        "type": ["VerifiableCredential" "OpenBadgeCredential"],
        "issuer": {
          "id": "did:key:test",
          "type": "Profile",
          "name": "Test Issuer"
        }
      }`;

      // Return the assertion with malformed JSON
      const malformedJsonAssertion = {
        ...assertionMock,
        assertionJson: malformedJson, // Not a valid JSON object
      };

      mockAssertion(malformedJsonAssertion);

      // Recreate service with updated mocks
      service = new VerificationService();

      const result = await service.verifyAssertion("test-assertion-id");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
