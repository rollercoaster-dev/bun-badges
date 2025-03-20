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

// Mock base64url
mock.module("@scure/base", () => ({
  base64url: {
    decode: () => new Uint8Array([1, 2, 3, 4]),
    encode: () => "test-base64-encoded-value",
  },
  base58: {
    decode: () => new Uint8Array([5, 6, 7, 8]),
    encode: () => "test-base58-encoded-value",
  },
}));

// Ensure all methods are set up in the mocked db
mock.module("@/db/config", () => {
  const mockDb = {
    select: () => ({
      from: (table: { name?: string }) => ({
        where: () => {
          if (table.name === "issuerProfiles") {
            return [
              {
                issuerId: "test-issuer-id",
                name: "Test Issuer",
                publicKey: [
                  {
                    id: "did:key:123#key-1",
                    type: "Ed25519VerificationKey2020",
                    controller: "did:key:123",
                    publicKeyJwk: { kty: "OKP", crv: "Ed25519", x: "test" },
                  },
                ],
              },
            ];
          } else if (table.name === "badgeClasses") {
            return [
              {
                badgeId: "test-badge-id",
                issuerId: "test-issuer-id",
                name: "Test Badge",
              },
            ];
          } else {
            return [
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
                  "@context": [
                    "https://www.w3.org/2018/credentials/v1",
                    "https://w3id.org/security/suites/ed25519-2020/v1",
                  ],
                  id: "https://example.com/assertions/test-assertion-id",
                  type: ["VerifiableCredential", "OpenBadgeCredential"],
                  issuer: {
                    id: "did:key:123",
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
                    },
                  },
                  proof: {
                    type: "Ed25519Signature2020",
                    created: new Date().toISOString(),
                    verificationMethod: "did:key:123#key-1",
                    proofPurpose: "assertionMethod",
                    proofValue: "test-proof-value",
                  },
                },
              },
            ];
          }
        },
      }),
    }),
  };
  return { db: mockDb };
});

// Mock verification for ed25519
mock.module("@noble/ed25519", () => ({
  verify: () => Promise.resolve(true),
}));

// Mock db and dependencies
mock.module("@/db/config", () => ({
  db: {
    select: () => ({
      from: (table: any) => ({
        where: () => {
          // Return proper data based on table name
          if (table?.name === "issuerProfiles") {
            return [
              {
                issuerId: "test-issuer-id",
                name: "Test Issuer",
                publicKey: [
                  {
                    id: "did:key:123#key-1",
                    type: "Ed25519VerificationKey2020",
                    controller: "did:key:123",
                    publicKeyJwk: { kty: "OKP", crv: "Ed25519", x: "test" },
                  },
                ],
              },
            ];
          } else if (table?.name === "badgeClasses") {
            return [
              {
                badgeId: "test-badge-id",
                issuerId: "test-issuer-id",
                name: "Test Badge",
              },
            ];
          } else {
            // Return assertion data by default
            return [
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
                  "@context": [
                    "https://www.w3.org/2018/credentials/v1",
                    "https://w3id.org/security/suites/ed25519-2020/v1",
                  ],
                  id: "https://example.com/assertions/test-assertion-id",
                  type: ["VerifiableCredential", "OpenBadgeCredential"],
                  issuer: {
                    id: "did:key:123",
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
                    },
                  },
                  proof: {
                    type: "Ed25519Signature2020",
                    created: new Date().toISOString(),
                    verificationMethod: "did:key:123#key-1",
                    proofPurpose: "assertionMethod",
                    proofValue: "test-proof-value",
                  },
                },
              },
            ];
          }
        },
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
    // Reset mocks
    mock.module("@noble/ed25519", () => ({
      verify: () => Promise.resolve(true),
    }));

    // Reset base64 mock
    mock.module("@scure/base", () => ({
      base64url: {
        decode: () => new Uint8Array([1, 2, 3, 4]),
        encode: () => "test-base64-encoded-value",
      },
      base58: {
        decode: () => new Uint8Array([5, 6, 7, 8]),
        encode: () => "test-base58-encoded-value",
      },
    }));

    // Default database mock
    mock.module("@/db/config", () => ({
      db: {
        select: () => ({
          from: (table: any) => ({
            where: () => {
              // Return different data based on table name
              if (table?.name === "issuerProfiles") {
                return [
                  {
                    issuerId: "test-issuer-id",
                    name: "Test Issuer",
                    publicKey: [
                      {
                        id: "did:key:123#key-1",
                        type: "Ed25519VerificationKey2020",
                        controller: "did:key:123",
                        publicKeyJwk: { kty: "OKP", crv: "Ed25519", x: "test" },
                      },
                    ],
                  },
                ];
              } else if (table?.name === "badgeClasses") {
                return [
                  {
                    badgeId: "test-badge-id",
                    issuerId: "test-issuer-id",
                    name: "Test Badge",
                  },
                ];
              } else {
                // Return assertion data by default
                return [
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
                      "@context": [
                        "https://www.w3.org/2018/credentials/v1",
                        "https://w3id.org/security/suites/ed25519-2020/v1",
                      ],
                      id: "https://example.com/assertions/test-assertion-id",
                      type: ["VerifiableCredential", "OpenBadgeCredential"],
                      issuer: {
                        id: "did:key:123",
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
                        },
                      },
                      proof: {
                        type: "Ed25519Signature2020",
                        created: new Date().toISOString(),
                        verificationMethod: "did:key:123#key-1",
                        proofPurpose: "assertionMethod",
                        proofValue: "test-proof-value",
                      },
                    },
                  },
                ];
              }
            },
          }),
        }),
      },
    }));

    // Mock getSigningKey
    mock.module("@/utils/signing/keys", () => ({
      getSigningKey: () =>
        Promise.resolve({
          publicKey: new Uint8Array([1, 2, 3, 4]),
          privateKey: new Uint8Array([5, 6, 7, 8]),
          controller: "did:key:123",
          type: "Ed25519VerificationKey2020",
          keyInfo: {
            id: "did:key:123#key-1",
            type: "Ed25519VerificationKey2020",
            controller: "did:key:123",
            publicKeyJwk: { kty: "OKP", crv: "Ed25519", x: "test" },
          },
        }),
    }));

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

    // Override database mock to make the issuer have a public key
    mock.module("@/db/config", () => ({
      db: {
        select: () => ({
          from: (table: any) => ({
            where: () => {
              // Return different data based on table name
              if (table?.name === "issuerProfiles") {
                return [
                  {
                    issuerId: "test-issuer-id",
                    name: "Test Issuer",
                    publicKey: [
                      {
                        id: "did:key:123#key-1",
                        type: "Ed25519VerificationKey2020",
                        controller: "did:key:123",
                        publicKeyJwk: { kty: "OKP", crv: "Ed25519", x: "test" },
                      },
                    ],
                  },
                ];
              } else if (table?.name === "badgeClasses") {
                return [
                  {
                    badgeId: "test-badge-id",
                    issuerId: "test-issuer-id",
                    name: "Test Badge",
                  },
                ];
              } else {
                // Return assertion data by default
                return [
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
                      "@context": [
                        "https://www.w3.org/2018/credentials/v1",
                        "https://w3id.org/security/suites/ed25519-2020/v1",
                      ],
                      id: "https://example.com/assertions/test-assertion-id",
                      type: ["VerifiableCredential", "OpenBadgeCredential"],
                      issuer: {
                        id: "did:key:123",
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
                        },
                      },
                      proof: {
                        type: "Ed25519Signature2020",
                        created: new Date().toISOString(),
                        verificationMethod: "did:key:123#key-1",
                        proofPurpose: "assertionMethod",
                        proofValue: "test-proof-value",
                      },
                    },
                  },
                ];
              }
            },
          }),
        }),
      },
    }));

    // Ensure ed25519 verify returns true
    mock.module("@noble/ed25519", () => ({
      verify: () => Promise.resolve(true),
    }));

    // Recreate service after mock changes
    service = new VerificationService();

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

    // Override database mock to make the issuer have a public key
    mock.module("@/db/config", () => ({
      db: {
        select: () => ({
          from: (table: any) => ({
            where: () => {
              // Return different data based on table name
              if (table?.name === "issuerProfiles") {
                return [
                  {
                    issuerId: "test-issuer-id",
                    name: "Test Issuer",
                    publicKey: [
                      {
                        id: "did:key:123#key-1",
                        type: "Ed25519VerificationKey2020",
                        controller: "did:key:123",
                        publicKeyJwk: { kty: "OKP", crv: "Ed25519", x: "test" },
                      },
                    ],
                  },
                ];
              } else if (table?.name === "badgeClasses") {
                return [
                  {
                    badgeId: "test-badge-id",
                    issuerId: "test-issuer-id",
                    name: "Test Badge",
                  },
                ];
              } else {
                // Return assertion data by default
                return [
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
                      "@context": [
                        "https://www.w3.org/2018/credentials/v1",
                        "https://w3id.org/security/suites/ed25519-2020/v1",
                      ],
                      id: "https://example.com/assertions/test-assertion-id",
                      type: ["VerifiableCredential", "OpenBadgeCredential"],
                      issuer: {
                        id: "did:key:123",
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
                        },
                      },
                      proof: {
                        type: "Ed25519Signature2020",
                        created: new Date().toISOString(),
                        verificationMethod: "did:key:123#key-1",
                        proofPurpose: "assertionMethod",
                        proofValue: "test-proof-value",
                      },
                    },
                  },
                ];
              }
            },
          }),
        }),
      },
    }));

    // Recreate service after mock change
    service = new VerificationService();

    const result = await service.verifyOB3Assertion(assertionId);

    expect(result.valid).toBe(false);
    expect(result.checks.signature).toBe(false);
    expect(result.errors).toContain("Invalid signature - verification failed");
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

    // Setup proper mock for ed25519 verification
    mock.module("@noble/ed25519", () => ({
      verify: () => Promise.resolve(true),
    }));

    // Setup proper mock for base64url
    mock.module("@scure/base", () => ({
      base64url: {
        decode: () => new Uint8Array([1, 2, 3, 4]),
        encode: () => "test-base64-encoded-value",
      },
      base58: {
        decode: () => new Uint8Array([5, 6, 7, 8]),
        encode: () => "test-base58-encoded-value",
      },
    }));

    // Reset database mock with proof
    mock.module("@/db/config", () => ({
      db: {
        select: () => ({
          from: (table: any) => ({
            where: () => {
              // Return different data based on table name
              if (table?.name === "issuerProfiles") {
                return [
                  {
                    issuerId: "test-issuer-id",
                    name: "Test Issuer",
                    publicKey: [
                      {
                        id: "did:key:123#key-1",
                        type: "Ed25519VerificationKey2020",
                        controller: "did:key:123",
                        publicKeyJwk: { kty: "OKP", crv: "Ed25519", x: "test" },
                      },
                    ],
                  },
                ];
              } else if (table?.name === "badgeClasses") {
                return [
                  {
                    badgeId: "test-badge-id",
                    issuerId: "test-issuer-id",
                    name: "Test Badge",
                  },
                ];
              } else {
                // Return assertion data by default
                return [
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
                      "@context": [
                        "https://www.w3.org/2018/credentials/v1",
                        "https://w3id.org/security/suites/ed25519-2020/v1",
                      ],
                      id: "https://example.com/assertions/test-assertion-id",
                      type: ["VerifiableCredential", "OpenBadgeCredential"],
                      issuer: {
                        id: "did:key:123",
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
                        },
                      },
                      proof: {
                        type: "Ed25519Signature2020",
                        created: new Date().toISOString(),
                        verificationMethod: "did:key:123#key-1",
                        proofPurpose: "assertionMethod",
                        proofValue: "test-proof-value",
                      },
                    },
                  },
                ];
              }
            },
          }),
        }),
      },
    }));

    // Re-add key mock
    mock.module("@/utils/signing/keys", () => ({
      getSigningKey: () =>
        Promise.resolve({
          publicKey: new Uint8Array([1, 2, 3, 4]),
          privateKey: new Uint8Array([5, 6, 7, 8]),
          controller: "did:key:123",
          type: "Ed25519VerificationKey2020",
          keyInfo: {
            id: "did:key:123#key-1",
            type: "Ed25519VerificationKey2020",
            controller: "did:key:123",
            publicKeyJwk: { kty: "OKP", crv: "Ed25519", x: "test" },
          },
        }),
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
