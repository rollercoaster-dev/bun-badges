import { describe, test, expect, mock, beforeEach } from "bun:test";
import {
  CredentialsService,
  CredentialStatus,
} from "@/services/credentials.service";
import "@/utils/test/unit-setup";

// Mock the database module
mock.module("@/db/config", () => {
  return {
    db: {
      insert: () => ({
        values: () => ({
          returning: () => [
            {
              id: "test-credential-id",
              type: "OpenBadgeCredential",
              issuerId: "test-issuer-id",
              recipientId: "test-recipient-id",
              credentialHash: "test-credential-hash",
              data: { test: "data" },
              proof: { test: "proof" },
              keyId: "test-key-id",
              status: "active",
              createdAt: new Date(),
              issuedAt: new Date(),
              isActive: true,
            },
          ],
        }),
      }),
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => [
              {
                id: "test-credential-id",
                type: "OpenBadgeCredential",
                issuerId: "test-issuer-id",
                recipientId: "test-recipient-id",
                credentialHash: "test-credential-hash",
                data: { test: "data" },
                proof: { test: "proof" },
                keyId: "test-key-id",
                status: "active",
                createdAt: new Date(),
                issuedAt: new Date(),
                isActive: true,
              },
            ],
          }),
        }),
      }),
      update: () => ({
        set: () => ({
          where: () => ({
            returning: () => [
              {
                id: "test-credential-id",
                type: "OpenBadgeCredential",
                issuerId: "test-issuer-id",
                recipientId: "test-recipient-id",
                credentialHash: "test-credential-hash",
                data: { test: "data" },
                proof: { test: "proof" },
                keyId: "test-key-id",
                status: "revoked",
                createdAt: new Date(),
                issuedAt: new Date(),
                revokedAt: new Date(),
                revocationReason: "Test revocation",
                isActive: false,
              },
            ],
          }),
        }),
      }),
    },
  };
});

describe("CredentialsService", () => {
  let credentialsService: CredentialsService;

  beforeEach(() => {
    credentialsService = new CredentialsService();
  });

  test("should store a new credential", async () => {
    const credentialData = {
      type: "OpenBadgeCredential",
      issuerId: "test-issuer-id",
      recipientId: "test-recipient-id",
      credentialHash: "test-credential-hash",
      data: { test: "data" },
      proof: { test: "proof" },
      keyId: "test-key-id",
      status: "active",
    };

    const credential = await credentialsService.storeCredential(credentialData);

    expect(credential).toBeDefined();
    expect(credential.id).toBe("test-credential-id");
    expect(credential.type).toBe("OpenBadgeCredential");
    expect(credential.issuerId).toBe("test-issuer-id");
    expect(credential.recipientId).toBe("test-recipient-id");
    expect(credential.credentialHash).toBe("test-credential-hash");
    expect(credential.data).toEqual({ test: "data" });
    expect(credential.proof).toEqual({ test: "proof" });
    expect(credential.keyId).toBe("test-key-id");
    expect(credential.status).toBe("active");
    expect(credential.isActive).toBe(true);
  });

  test("should get a credential by ID", async () => {
    const credential =
      await credentialsService.getCredentialById("test-credential-id");

    expect(credential).toBeDefined();
    expect(credential?.id).toBe("test-credential-id");
    expect(credential?.type).toBe("OpenBadgeCredential");
    expect(credential?.issuerId).toBe("test-issuer-id");
    expect(credential?.recipientId).toBe("test-recipient-id");
    expect(credential?.credentialHash).toBe("test-credential-hash");
    expect(credential?.data).toEqual({ test: "data" });
    expect(credential?.proof).toEqual({ test: "proof" });
    expect(credential?.keyId).toBe("test-key-id");
    expect(credential?.status).toBe("active");
    expect(credential?.isActive).toBe(true);
  });

  test("should verify a credential", async () => {
    const result =
      await credentialsService.verifyCredential("test-credential-id");

    expect(result).toBeDefined();
    expect(result.valid).toBe(true);
    expect(result.checks.structure).toBe(true);
    expect(result.checks.revocation).toBe(true);
    expect(result.checks.expiration).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.details?.credentialId).toBe("test-credential-id");
    expect(result.details?.issuerId).toBe("test-issuer-id");
  });

  test("should update credential status", async () => {
    const credential = await credentialsService.updateCredentialStatus(
      "test-credential-id",
      CredentialStatus.REVOKED,
      "Test revocation",
    );

    expect(credential).toBeDefined();
    expect(credential.id).toBe("test-credential-id");
    expect(credential.status).toBe("revoked");
    expect(credential.revokedAt).toBeDefined();
    expect(credential.revocationReason).toBe("Test revocation");
    expect(credential.isActive).toBe(false);
  });

  test("should list credentials by issuer", async () => {
    const credentials =
      await credentialsService.listCredentialsByIssuer("test-issuer-id");

    expect(credentials).toBeDefined();
    expect(credentials.length).toBe(1);
    expect(credentials[0].id).toBe("test-credential-id");
    expect(credentials[0].issuerId).toBe("test-issuer-id");
  });

  test("should list credentials by recipient", async () => {
    const credentials =
      await credentialsService.listCredentialsByRecipient("test-recipient-id");

    expect(credentials).toBeDefined();
    expect(credentials.length).toBe(1);
    expect(credentials[0].id).toBe("test-credential-id");
    expect(credentials[0].recipientId).toBe("test-recipient-id");
  });

  test("should check if a credential is revoked", async () => {
    const isRevoked =
      await credentialsService.isCredentialRevoked("test-credential-id");

    expect(isRevoked).toBe(false);
  });

  test("should hash a credential", () => {
    const hash = credentialsService.hashCredential(
      JSON.stringify({ test: "credential" }),
    );

    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash.length).toBe(64); // SHA-256 hash is 64 characters in hex
  });
});
