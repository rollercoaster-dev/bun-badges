import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { CredentialService } from "@/services/credential.service";
import { VerificationService } from "@/services/verification.service";
import { db } from "@/db/config";
import { issuerProfiles, badgeClasses, badgeAssertions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateSigningKey } from "@/utils/signing/keys";
import crypto from "crypto";
import { base64url } from "@scure/base";

/**
 * Edge case tests for verification
 * This tests unusual scenarios like tampered credentials, expired credentials,
 * and other edge cases to ensure robust verification
 */
describe("Verification Edge Cases", () => {
  const credentialService = new CredentialService();
  const verificationService = new VerificationService();

  // Test data
  const hostUrl = "https://example.com";
  let issuerId: string;
  let badgeId: string;
  let assertionId: string;
  let credential: any;

  // Setup test environment with actual database records
  beforeAll(async () => {
    // Create an issuer for testing
    const [issuer] = await db
      .insert(issuerProfiles)
      .values({
        name: "Test Edge Case Issuer",
        url: "https://example.com/issuer",
        description: "A test issuer for edge case tests",
        email: "edge-test@example.com",
        ownerUserId: crypto.randomUUID(),
        issuerJson: {
          "@context": "https://w3id.org/openbadges/v2",
          type: "Issuer",
          id: `${hostUrl}/issuers/edge-test`,
          name: "Test Edge Case Issuer",
          url: "https://example.com/issuer",
          email: "edge-test@example.com",
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
        name: "Edge Test Badge",
        description: "A test badge for edge case tests",
        criteria: "Complete edge case tests",
        imageUrl: "https://example.com/badge.png",
        badgeJson: {
          "@context": "https://w3id.org/openbadges/v2",
          type: "BadgeClass",
          id: `${hostUrl}/badges/edge-test`,
          name: "Edge Test Badge",
          description: "A test badge for edge case tests",
          criteria: {
            narrative: "Complete edge case tests",
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
        recipientIdentity: "edge-recipient@example.com",
        recipientHashed: false,
        issuedOn: new Date(),
        evidenceUrl: "https://example.com/evidence",
        revoked: false,
        revocationReason: null,
        assertionJson: {
          "@context": "https://w3id.org/openbadges/v2",
          type: "Assertion",
          id: `${hostUrl}/assertions/edge-test`,
          recipient: {
            type: "email",
            identity: "edge-recipient@example.com",
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

    // Create an OB3 credential
    credential = await credentialService.createCredential(hostUrl, assertionId);

    // Update the assertion with the OB3 credential
    await db
      .update(badgeAssertions)
      .set({
        assertionJson: credential,
        updatedAt: new Date(),
      })
      .where(eq(badgeAssertions.assertionId, assertionId));
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

  it("should detect a tampered credential subject", async () => {
    // Create a copy of the credential with a tampered subject
    const tamperedCredential = JSON.parse(JSON.stringify(credential));
    tamperedCredential.credentialSubject.identity = "tampered@example.com";

    // Verify the tampered credential
    const isValid = await credentialService.verifySignature(tamperedCredential);
    expect(isValid).toBe(false);
  });

  it("should detect a tampered proof value", async () => {
    // Create a copy of the credential with a tampered proof
    const tamperedCredential = JSON.parse(JSON.stringify(credential));

    // Generate a random signature to use as tampered proof
    const randomBytes = crypto.randomBytes(64);
    tamperedCredential.proof.proofValue = base64url.encode(randomBytes);

    // Verify the tampered credential
    const isValid = await credentialService.verifySignature(tamperedCredential);
    expect(isValid).toBe(false);
  });

  it("should detect a credential with missing proof", async () => {
    // Create a copy of the credential with no proof
    const noProofCredential = JSON.parse(JSON.stringify(credential));
    delete noProofCredential.proof;

    // Verify the credential without proof
    const isValid = await credentialService.verifySignature(noProofCredential);
    expect(isValid).toBe(false);
  });

  it("should detect a credential with invalid proof type", async () => {
    // Create a copy of the credential with wrong proof type
    const wrongProofCredential = JSON.parse(JSON.stringify(credential));
    wrongProofCredential.proof.type = "InvalidProofType";

    // Verify the credential with wrong proof type
    const isValid =
      await credentialService.verifySignature(wrongProofCredential);
    expect(isValid).toBe(false);
  });

  it("should support future-dated revocation status", async () => {
    // Create a future revocation date
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    // Add a credential status that indicates future revocation
    const futureRevokedCredential = JSON.parse(JSON.stringify(credential));
    futureRevokedCredential.credentialStatus = {
      id: `${hostUrl}/status/${assertionId}`,
      type: "RevocationList2020Status",
      statusListIndex: assertionId,
      statusListCredential: `${hostUrl}/status/list`,
      statusPurpose: "revocation",
      statusListDate: futureDate.toISOString(),
    };

    // Update the assertion with the future-revoked credential
    await db
      .update(badgeAssertions)
      .set({
        assertionJson: futureRevokedCredential,
        updatedAt: new Date(),
      })
      .where(eq(badgeAssertions.assertionId, assertionId));

    // The credential should still be valid now
    const result = await verificationService.verifyOB3Assertion(assertionId);
    expect(result.valid).toBe(true);
    expect(result.checks.revocation).toBe(true);
  });

  it("should verify a credential with mixed context versions", async () => {
    // Create a credential with mixed context versions (OB2.0 and OB3.0)
    const mixedContextCredential = JSON.parse(JSON.stringify(credential));
    mixedContextCredential["@context"] = [
      "https://w3id.org/openbadges/v2",
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/badges/v3",
    ];

    // Update the assertion with the mixed context credential
    await db
      .update(badgeAssertions)
      .set({
        assertionJson: mixedContextCredential,
        updatedAt: new Date(),
      })
      .where(eq(badgeAssertions.assertionId, assertionId));

    // The credential should still be valid
    const result = await verificationService.verifyOB3Assertion(assertionId);
    expect(result.valid).toBe(true);
  });

  it("should handle malformed JSON in credential", async () => {
    // Create a malformed credential by adding circular references
    const malformedCredential: any = JSON.parse(JSON.stringify(credential));
    const circular: any = { self: null };
    circular.self = circular; // Create circular reference

    try {
      // Attempting to stringify this will fail due to circular reference
      JSON.stringify(malformedCredential);
      // If we get here, the test should fail
      expect(true).toBe(false);
    } catch (error) {
      // We expect an error here
      expect(error).toBeDefined();
    }

    // Our verification service should handle this gracefully
    try {
      // This should not throw, but return a failed verification
      const isValid = await credentialService.verifySignature({
        ...malformedCredential,
        circular,
      });
      expect(isValid).toBe(false);
    } catch (error) {
      // If verification throws, the test should fail
      expect(true).toBe(false);
    }
  });
});
