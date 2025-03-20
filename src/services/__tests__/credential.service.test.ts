import { describe, it, expect, beforeEach, mock } from "bun:test";

// Local mock for drizzle-orm
mock.module("drizzle-orm", () => ({
  and: () => ({ type: "and_operator" }),
  eq: () => ({ type: "eq_operator" }),
  // Add other operators as needed
}));

// Continue with the rest of the imports
import { CredentialService } from "@/services/credential.service";
import { base64url } from "@scure/base";

// Create mock data
const mockKeyPair = {
  publicKey: new Uint8Array([1, 2, 3]),
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
            badgeId: "test-badge-id",
            issuerId: "test-issuer-id",
            name: "Test Badge",
            description: "Test Description",
            criteria: "Test Criteria",
            imageUrl: "http://example.com/badge.png",
            assertionId: "test-assertion-id",
            recipientType: "email",
            recipientIdentity: "recipient@example.com",
            recipientHashed: false,
            issuedOn: new Date(),
            evidenceUrl: "http://example.com/evidence",
          },
        ],
      }),
    }),
  },
}));

mock.module("@/utils/signing/keys", () => ({
  getSigningKey: () => Promise.resolve(mockKeyPair),
  generateSigningKey: () => Promise.resolve(mockKeyPair),
}));

mock.module("@noble/ed25519", () => ({
  sign: () => Promise.resolve(new Uint8Array([7, 8, 9])),
  verify: () => Promise.resolve(true),
}));

describe("CredentialService", () => {
  let service: CredentialService;
  const hostUrl = "https://example.com";

  beforeEach(() => {
    service = new CredentialService();
  });

  it("should create an achievement", async () => {
    const badgeId = "test-badge-id";
    const result = await service.createAchievement(hostUrl, badgeId);

    expect(result).toBeDefined();
    expect(result.id).toEqual(`${hostUrl}/badges/${badgeId}`);
    expect(result.name).toEqual("Test Badge");
    expect(result.type).toContain("AchievementCredential");
  });

  it("should sign a credential", async () => {
    const issuerId = "test-issuer-id";
    const credential = {
      id: "test-credential",
      type: ["VerifiableCredential"],
      issuer: "https://example.com/issuers/test-issuer-id",
    };

    const result = await service.signCredential(issuerId, credential);

    expect(result).toBeDefined();
    expect(result.proof).toBeDefined();
    expect(result.proof.type).toEqual("Ed25519Signature2020");
    expect(result.proof.proofValue).toBeDefined();
  });

  it("should verify a credential signature", async () => {
    const credential = {
      id: "test-credential",
      type: ["VerifiableCredential"],
      issuer: "https://example.com/issuers/test-issuer-id",
      proof: {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        verificationMethod: "did:key:123#key-1",
        proofPurpose: "assertionMethod",
        proofValue: base64url.encode(new Uint8Array([7, 8, 9])),
      },
    };

    const result = await service.verifySignature(credential);

    expect(result).toBe(true);
  });

  it("should return false for missing proof", async () => {
    const credential = {
      id: "test-credential",
      type: ["VerifiableCredential"],
      issuer: "https://example.com/issuers/test-issuer-id",
      proof: undefined,
    };

    const result = await service.verifySignature(credential);

    expect(result).toBe(false);
  });

  it("should create a verifiable credential", async () => {
    const assertionId = "test-assertion-id";

    const result = await service.createCredential(hostUrl, assertionId);

    expect(result).toBeDefined();
    expect(result.id).toEqual(`${hostUrl}/assertions/${assertionId}`);
    expect(result.type).toContain("VerifiableCredential");
    expect(result.type).toContain("OpenBadgeCredential");
    expect(result.proof).toBeDefined();
    expect(result.credentialSubject).toBeDefined();
    expect(result.credentialSubject.achievement).toBeDefined();
  });
});
