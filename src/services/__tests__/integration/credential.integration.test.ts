import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { CredentialService } from "@/services/credential.service";
import { VerificationService } from "@/services/verification.service";
import { db } from "@/db/config";
import { issuerProfiles, badgeClasses, badgeAssertions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateSigningKey } from "@/utils/signing/keys";
import crypto from "crypto";

/**
 * This is an integration test that tests the full credential lifecycle
 * using actual database interactions rather than mocks
 */
describe("Credential Service Integration", () => {
  const credentialService = new CredentialService();
  const verificationService = new VerificationService();

  // Test data
  const hostUrl = "https://example.com";
  let issuerId: string;
  let badgeId: string;
  let assertionId: string;
  let receivedCredential: any;

  // Setup test environment with actual database records
  beforeAll(async () => {
    // Create an issuer for testing
    const [issuer] = await db
      .insert(issuerProfiles)
      .values({
        name: "Test Issuer",
        url: "https://example.com/issuer",
        description: "A test issuer for integration tests",
        email: "test@example.com",
        ownerUserId: crypto.randomUUID(),
        issuerJson: {
          "@context": "https://w3id.org/openbadges/v2",
          type: "Issuer",
          id: `${hostUrl}/issuers/test`,
          name: "Test Issuer",
          url: "https://example.com/issuer",
          email: "test@example.com",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    issuerId = issuer.issuerId;

    // Generate a signing key for the issuer
    await generateSigningKey(issuerId);

    // Create a badge class for testing
    const [badge] = await db
      .insert(badgeClasses)
      .values({
        issuerId,
        name: "Test Badge",
        description: "A test badge for integration tests",
        criteria: "Complete integration tests",
        imageUrl: "https://example.com/badge.png",
        badgeJson: {
          "@context": "https://w3id.org/openbadges/v2",
          type: "BadgeClass",
          id: `${hostUrl}/badges/test`,
          name: "Test Badge",
          description: "A test badge for integration tests",
          criteria: {
            narrative: "Complete integration tests",
          },
          image: "https://example.com/badge.png",
          issuer: `${hostUrl}/issuers/${issuerId}`,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    badgeId = badge.badgeId;

    // Create an assertion for testing
    const [assertion] = await db
      .insert(badgeAssertions)
      .values({
        badgeId,
        issuerId,
        recipientType: "email",
        recipientIdentity: "recipient@example.com",
        recipientHashed: false,
        issuedOn: new Date(),
        evidenceUrl: "https://example.com/evidence",
        revoked: false,
        revocationReason: null,
        assertionJson: {
          "@context": "https://w3id.org/openbadges/v2",
          type: "Assertion",
          id: `${hostUrl}/assertions/test`,
          recipient: {
            type: "email",
            identity: "recipient@example.com",
            hashed: false,
          },
          badge: `${hostUrl}/badges/${badgeId}`,
          issuedOn: new Date().toISOString(),
          verification: {
            type: "HostedBadge",
          },
          evidence: "https://example.com/evidence",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    assertionId = assertion.assertionId;
  });

  // Clean up after tests
  afterAll(async () => {
    // Remove test data
    if (assertionId) {
      await db
        .delete(badgeAssertions)
        .where(eq(badgeAssertions.assertionId, assertionId));
    }

    if (badgeId) {
      await db.delete(badgeClasses).where(eq(badgeClasses.badgeId, badgeId));
    }

    if (issuerId) {
      await db
        .delete(issuerProfiles)
        .where(eq(issuerProfiles.issuerId, issuerId));
    }
  });

  it("should create a verifiable credential from an assertion", async () => {
    // Create the credential
    receivedCredential = await credentialService.createCredential(
      hostUrl,
      assertionId,
    );

    // Verify it has the required structure
    expect(receivedCredential).toBeDefined();
    expect(receivedCredential["@context"]).toContain(
      "https://www.w3.org/2018/credentials/v1",
    );
    expect(receivedCredential.type).toContain("VerifiableCredential");
    expect(receivedCredential.type).toContain("OpenBadgeCredential");

    // Check that it has the required properties
    expect(receivedCredential.id).toBe(`${hostUrl}/assertions/${assertionId}`);
    expect(receivedCredential.issuer).toBe(`${hostUrl}/issuers/${issuerId}`);
    expect(receivedCredential.issuanceDate).toBeDefined();
    expect(receivedCredential.credentialSubject).toBeDefined();
    expect(receivedCredential.credentialSubject.achievement).toBeDefined();

    // Verify it has a proof
    expect(receivedCredential.proof).toBeDefined();
    expect(receivedCredential.proof.type).toBe("Ed25519Signature2020");
    expect(receivedCredential.proof.proofValue).toBeDefined();
    expect(receivedCredential.proof.proofPurpose).toBe("assertionMethod");
  });

  it("should verify a valid credential", async () => {
    // Verify the credential's signature
    const isValid = await credentialService.verifySignature(receivedCredential);
    expect(isValid).toBe(true);

    // Use the verification service to verify the credential
    const result = await verificationService.verifyOB3Assertion(assertionId);
    expect(result.valid).toBe(true);
    expect(result.checks.signature).toBe(true);
    expect(result.checks.revocation).toBe(true);
    expect(result.checks.structure).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("should detect revoked credentials", async () => {
    // Revoke the assertion
    await db
      .update(badgeAssertions)
      .set({
        revoked: true,
        revocationReason: "Testing revocation",
        updatedAt: new Date(),
      })
      .where(eq(badgeAssertions.assertionId, assertionId));

    // Verify the credential again
    const result = await verificationService.verifyOB3Assertion(assertionId);
    expect(result.valid).toBe(false);
    expect(result.checks.revocation).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("revoked");
  });

  it("should restore verification after un-revoking", async () => {
    // Unrevoke the assertion
    await db
      .update(badgeAssertions)
      .set({
        revoked: false,
        revocationReason: null,
        updatedAt: new Date(),
      })
      .where(eq(badgeAssertions.assertionId, assertionId));

    // Verify the credential again
    const result = await verificationService.verifyOB3Assertion(assertionId);
    expect(result.valid).toBe(true);
    expect(result.checks.revocation).toBe(true);
  });

  it("should update credential in database with cryptographic proof", async () => {
    // Update the assertion with the credential
    await db
      .update(badgeAssertions)
      .set({
        assertionJson: receivedCredential,
        updatedAt: new Date(),
      })
      .where(eq(badgeAssertions.assertionId, assertionId));

    // Retrieve the assertion from the database
    const [assertion] = await db
      .select()
      .from(badgeAssertions)
      .where(eq(badgeAssertions.assertionId, assertionId))
      .limit(1);

    // Verify the credential was saved correctly
    const savedCredential = assertion.assertionJson as any;
    expect(savedCredential.proof).toBeDefined();
    expect(savedCredential.proof.type).toBe("Ed25519Signature2020");

    // Verify the stored credential
    const isValid = await credentialService.verifySignature(savedCredential);
    expect(isValid).toBe(true);
  });
});
