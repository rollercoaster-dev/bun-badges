import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  CredentialsService,
  CredentialStatus,
} from "@/services/credentials.service";
import { db } from "@/db/config";
import { credentials } from "@/db/schema/credentials.schema";
import { eq } from "drizzle-orm";

describe("CredentialsService Integration", () => {
  let credentialsService: CredentialsService;
  let testCredentialId: string;
  const testIssuerId = "test-issuer-id";
  const testRecipientId = "test-recipient-id";
  const testKeyId = "test-key-id";

  beforeEach(async () => {
    credentialsService = new CredentialsService();

    // Clean up any existing test credentials
    await db.delete(credentials).where(eq(credentials.issuerId, testIssuerId));

    // Create a test credential for use in tests
    const [testCredential] = await db
      .insert(credentials)
      .values({
        type: "OpenBadgeCredential",
        issuerId: testIssuerId,
        recipientId: testRecipientId,
        credentialHash: "test-credential-hash",
        data: { test: "data" },
        proof: { test: "proof" },
        keyId: testKeyId,
        status: "active",
        issuedAt: new Date(),
        isActive: true,
      })
      .returning();

    testCredentialId = testCredential.id;
  });

  afterEach(async () => {
    // Clean up test credentials
    await db.delete(credentials).where(eq(credentials.issuerId, testIssuerId));
  });

  test("should store a new credential", async () => {
    const credentialData = {
      type: "VerifiableCredential",
      issuerId: testIssuerId,
      recipientId: "new-test-recipient-id",
      credentialHash: "new-test-credential-hash",
      data: { test: "new-data" },
      proof: { test: "new-proof" },
      keyId: testKeyId,
      status: "active",
    };

    const credential = await credentialsService.storeCredential(credentialData);

    expect(credential).toBeDefined();
    expect(credential.id).toBeDefined();
    expect(credential.type).toBe("VerifiableCredential");
    expect(credential.issuerId).toBe(testIssuerId);
    expect(credential.recipientId).toBe("new-test-recipient-id");
    expect(credential.credentialHash).toBe("new-test-credential-hash");
    expect(credential.data).toEqual({ test: "new-data" });
    expect(credential.proof).toEqual({ test: "new-proof" });
    expect(credential.keyId).toBe(testKeyId);
    expect(credential.status).toBe("active");
    expect(credential.isActive).toBe(true);
    expect(credential.issuedAt).toBeDefined();

    // Clean up the created credential
    await db.delete(credentials).where(eq(credentials.id, credential.id));
  });

  test("should get a credential by ID", async () => {
    const credential =
      await credentialsService.getCredentialById(testCredentialId);

    expect(credential).toBeDefined();
    expect(credential?.id).toBe(testCredentialId);
    expect(credential?.type).toBe("OpenBadgeCredential");
    expect(credential?.issuerId).toBe(testIssuerId);
    expect(credential?.recipientId).toBe(testRecipientId);
    expect(credential?.credentialHash).toBe("test-credential-hash");
    expect(credential?.data).toEqual({ test: "data" });
    expect(credential?.proof).toEqual({ test: "proof" });
    expect(credential?.keyId).toBe(testKeyId);
    expect(credential?.status).toBe("active");
    expect(credential?.isActive).toBe(true);
  });

  test("should verify a credential", async () => {
    const result = await credentialsService.verifyCredential(testCredentialId);

    expect(result).toBeDefined();
    expect(result.valid).toBe(true);
    expect(result.checks.structure).toBe(true);
    expect(result.checks.revocation).toBe(true);
    expect(result.checks.proof).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.details?.credentialId).toBe(testCredentialId);
    expect(result.details?.issuerId).toBe(testIssuerId);
  });

  test("should update credential status", async () => {
    const credential = await credentialsService.updateCredentialStatus(
      testCredentialId,
      CredentialStatus.REVOKED,
      "Test revocation",
    );

    expect(credential).toBeDefined();
    expect(credential.id).toBe(testCredentialId);
    expect(credential.status).toBe("revoked");
    expect(credential.revokedAt).toBeDefined();
    expect(credential.revocationReason).toBe("Test revocation");
    expect(credential.isActive).toBe(false);

    // Verify the credential
    const result = await credentialsService.verifyCredential(testCredentialId);
    expect(result.valid).toBe(false);
    expect(result.checks.revocation).toBe(false);
  });

  test("should list credentials by issuer", async () => {
    // Create a second credential for the same issuer
    await credentialsService.storeCredential({
      type: "VerifiableCredential",
      issuerId: testIssuerId,
      recipientId: "second-test-recipient-id",
      credentialHash: "second-test-credential-hash",
      data: { test: "second-data" },
      proof: { test: "second-proof" },
      keyId: testKeyId,
      status: "active",
    });

    const credentials =
      await credentialsService.listCredentialsByIssuer(testIssuerId);

    expect(credentials).toBeDefined();
    expect(credentials.length).toBeGreaterThanOrEqual(2);

    // Find our test credentials in the results
    const originalCredential = credentials.find(
      (c) => c.id === testCredentialId,
    );
    expect(originalCredential).toBeDefined();
    expect(originalCredential?.recipientId).toBe(testRecipientId);

    const secondCredential = credentials.find(
      (c) => c.recipientId === "second-test-recipient-id",
    );
    expect(secondCredential).toBeDefined();
    expect(secondCredential?.type).toBe("VerifiableCredential");
  });

  test("should list credentials by recipient", async () => {
    // Create a second credential for the same recipient
    await credentialsService.storeCredential({
      type: "VerifiableCredential",
      issuerId: "second-test-issuer-id",
      recipientId: testRecipientId,
      credentialHash: "second-test-credential-hash",
      data: { test: "second-data" },
      proof: { test: "second-proof" },
      keyId: testKeyId,
      status: "active",
    });

    const credentials =
      await credentialsService.listCredentialsByRecipient(testRecipientId);

    expect(credentials).toBeDefined();
    expect(credentials.length).toBeGreaterThanOrEqual(2);

    // Find our test credentials in the results
    const originalCredential = credentials.find(
      (c) => c.id === testCredentialId,
    );
    expect(originalCredential).toBeDefined();
    expect(originalCredential?.issuerId).toBe(testIssuerId);

    const secondCredential = credentials.find(
      (c) => c.issuerId === "second-test-issuer-id",
    );
    expect(secondCredential).toBeDefined();
    expect(secondCredential?.type).toBe("VerifiableCredential");

    // Note: The second credential will be cleaned up in afterEach
  });

  test("should check if a credential is revoked", async () => {
    // First check a non-revoked credential
    let isRevoked =
      await credentialsService.isCredentialRevoked(testCredentialId);
    expect(isRevoked).toBe(false);

    // Now revoke the credential and check again
    await credentialsService.updateCredentialStatus(
      testCredentialId,
      CredentialStatus.REVOKED,
      "Test revocation",
    );

    isRevoked = await credentialsService.isCredentialRevoked(testCredentialId);
    expect(isRevoked).toBe(true);
  });

  test("should hash a credential", () => {
    const credentialData = JSON.stringify({ test: "credential" });
    const hash = credentialsService.hashCredential(credentialData);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash.length).toBe(64); // SHA-256 hash is 64 characters in hex

    // Verify the hash is consistent
    const hash2 = credentialsService.hashCredential(credentialData);
    expect(hash).toBe(hash2);

    // Verify different credentials produce different hashes
    const hash3 = credentialsService.hashCredential(
      JSON.stringify({ test: "different" }),
    );
    expect(hash).not.toBe(hash3);
  });
});
