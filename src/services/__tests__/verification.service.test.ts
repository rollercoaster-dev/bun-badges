import { describe, it, expect, beforeEach, mock } from "bun:test";
import { VerificationService } from "@/services/verification.service";
import { TEST_PUBLIC_KEY } from "@/utils/test/crypto-setup";

// Import crypto setup to ensure mocks are applied
import "@/utils/test/crypto-setup";

// Create mock data
const mockKeyPair = {
  publicKey: TEST_PUBLIC_KEY.slice(),
  privateKey: new Uint8Array([4, 5, 6]),
  controller: "did:key:123",
  type: "Ed25519VerificationKey2020" as const,
  keyInfo: {
    id: "did:key:123#key-1",
    type: "Ed25519VerificationKey2020",
    controller: "did:key:123",
    publicKeyJwk: { kty: "OKP", crv: "Ed25519", x: "test" },
  },
};

// Mock db and dependencies
mock.module("@/db/config", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => [
          {
            assertionId: "test-assertion-id",
            badgeId: "test-badge-id",
            issuerId: "test-issuer-id",
            recipientType: "email",
            recipientIdentity: "test-recipient",
            recipientHashed: false,
            issuedOn: new Date(),
            revoked: false,
            assertionJson: {
              id: "https://example.com/assertions/test-assertion-id",
              type: "Assertion",
              badge: {
                id: "https://example.com/badges/test-badge-id",
                type: "BadgeClass",
                name: "Test Badge",
              },
              proof: {
                type: "Ed25519Signature2020",
                created: "2023-01-01T00:00:00Z",
                verificationMethod: "did:key:123#key-1",
                proofPurpose: "assertionMethod",
                proofValue: "test-proof-value",
              },
            },
          },
        ],
      }),
    }),
  },
}));

// Mock getSigningKey
mock.module("@/utils/signing/keys", () => ({
  getSigningKey: async () => mockKeyPair,
}));

let service: VerificationService;

describe("VerificationService", () => {
  beforeEach(() => {
    service = new VerificationService();
  });

  it("should verify OB2 assertion", async () => {
    const assertionId = "test-assertion-id";

    // Override mock for this test to exclude proof (OB2)
    mock.module("@/db/config", () => ({
      db: {
        select: () => ({
          from: () => ({
            where: () => [
              {
                assertionId: "test-assertion-id",
                badgeId: "test-badge-id",
                issuerId: "test-issuer-id",
                recipientType: "email",
                recipientIdentity: "test-recipient",
                recipientHashed: false,
                issuedOn: new Date(),
                revoked: false,
                assertionJson: {
                  id: "https://example.com/assertions/test-assertion-id",
                  type: "Assertion",
                  badge: {
                    id: "https://example.com/badges/test-badge-id",
                    type: "BadgeClass",
                    name: "Test Badge",
                  },
                  recipient: { type: "email", identity: "test-recipient" },
                },
              },
            ],
          }),
        }),
      },
    }));

    // Recreate service after mock change
    service = new VerificationService();

    const result = await service.verifyOB2Assertion(assertionId);

    expect(result.valid).toBe(true);
    expect(result.checks.revocation).toBe(true);
    expect(result.checks.structure).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("should verify OB3 assertion", async () => {
    const assertionId = "test-assertion-id";

    const result = await service.verifyOB3Assertion(assertionId);

    expect(result.valid).toBe(true);
    expect(result.checks.revocation).toBe(true);
    expect(result.checks.signature).toBe(true);
    expect(result.checks.structure).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("should fail verification for revoked badge", async () => {
    const assertionId = "test-assertion-id";

    // Override mock for revoked badge
    mock.module("@/db/config", () => ({
      db: {
        select: () => ({
          from: () => ({
            where: () => [
              {
                assertionId: "test-assertion-id",
                badgeId: "test-badge-id",
                issuerId: "test-issuer-id",
                recipientType: "email",
                recipientIdentity: "test-recipient",
                recipientHashed: false,
                issuedOn: new Date(),
                revoked: true,
                revocationReason: "Test revocation",
                assertionJson: {
                  id: "https://example.com/assertions/test-assertion-id",
                  type: "Assertion",
                  badge: {
                    id: "https://example.com/badges/test-badge-id",
                    type: "BadgeClass",
                    name: "Test Badge",
                  },
                  recipient: { type: "email", identity: "test-recipient" },
                  proof: {
                    type: "Ed25519Signature2020",
                    created: new Date().toISOString(),
                    verificationMethod: "did:key:123#key-1",
                    proofValue: "test-proof-value",
                  },
                },
              },
            ],
          }),
        }),
      },
    }));

    // Recreate service after mock change
    service = new VerificationService();

    const result = await service.verifyOB3Assertion(assertionId);

    expect(result.valid).toBe(false);
    expect(result.checks.revocation).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("revoked");
  });

  it("should fail verification for invalid signature", async () => {
    const assertionId = "test-assertion-id";

    // Override ed25519 verify mock to return false
    mock.module("@noble/ed25519", () => ({
      verify: () => Promise.resolve(false),
    }));

    // Recreate service after mock change
    service = new VerificationService();

    const result = await service.verifyOB3Assertion(assertionId);

    expect(result.valid).toBe(false);
    expect(result.checks.signature).toBe(false);
    expect(result.errors).toContain("Invalid signature");
  });

  it("should auto-detect and verify OB2 assertion", async () => {
    const assertionId = "test-assertion-id";

    // Override mock for OB2 assertion (no proof)
    mock.module("@/db/config", () => ({
      db: {
        select: () => ({
          from: () => ({
            where: () => [
              {
                assertionId: "test-assertion-id",
                badgeId: "test-badge-id",
                issuerId: "test-issuer-id",
                recipientType: "email",
                recipientIdentity: "test-recipient",
                recipientHashed: false,
                issuedOn: new Date(),
                revoked: false,
                assertionJson: {
                  id: "https://example.com/assertions/test-assertion-id",
                  type: "Assertion",
                  badge: {
                    id: "https://example.com/badges/test-badge-id",
                    type: "BadgeClass",
                    name: "Test Badge",
                  },
                  recipient: { type: "email", identity: "test-recipient" },
                },
              },
            ],
          }),
        }),
      },
    }));

    // Recreate service after mock change
    service = new VerificationService();

    const result = await service.verifyAssertion(assertionId);

    expect(result.valid).toBe(true);
    expect(result.checks.revocation).toBe(true);
    expect(result.checks.structure).toBe(true);
    expect(result.checks.signature).toBeUndefined();
  });

  it("should auto-detect and verify OB3 assertion", async () => {
    const assertionId = "test-assertion-id";

    // Clear any previous mocks
    mock.restore();

    // Reset database mock with proof
    mock.module("@/db/config", () => ({
      db: {
        select: () => ({
          from: () => ({
            where: () => [
              {
                assertionId: "test-assertion-id",
                badgeId: "test-badge-id",
                issuerId: "test-issuer-id",
                recipientType: "email",
                recipientIdentity: "test-recipient",
                recipientHashed: false,
                issuedOn: new Date(),
                revoked: false,
                assertionJson: {
                  id: "https://example.com/assertions/test-assertion-id",
                  type: "Assertion",
                  badge: {
                    id: "https://example.com/badges/test-badge-id",
                    type: "BadgeClass",
                    name: "Test Badge",
                  },
                  recipient: { type: "email", identity: "test-recipient" },
                  proof: {
                    type: "Ed25519Signature2020",
                    created: new Date().toISOString(),
                    verificationMethod: "did:key:123#key-1",
                    proofValue: "test-proof-value",
                  },
                },
              },
            ],
          }),
        }),
      },
    }));

    // Ensure ed25519 verify returns true
    mock.module("@noble/ed25519", () => ({
      verify: () => Promise.resolve(true),
    }));

    // Re-add key mock
    mock.module("@/utils/signing/keys", () => ({
      getSigningKey: () => Promise.resolve(mockKeyPair),
    }));

    // Create a new service instance
    service = new VerificationService();

    const result = await service.verifyAssertion(assertionId);

    expect(result.valid).toBe(true);
    expect(result.checks.revocation).toBe(true);
    expect(result.checks.signature).toBe(true);
    expect(result.checks.structure).toBe(true);
  });
});
