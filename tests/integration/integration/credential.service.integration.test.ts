import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { CredentialService } from "@/services/credential.service";
import { badgeClasses, badgeAssertions } from "@/db/schema";
import {
  testDb,
  tableExists as checkTableExists,
} from "@/utils/test/integration-setup";
import { DataIntegrityProof, CredentialProof } from "@/models/credential.model";
import { seedTestData, clearTestData } from "@/utils/test/db-helpers";
import { OB3_CREDENTIAL_CONTEXT } from "@/constants/context-urls";
import { SignableCredential } from "@/services/credential.service";

describe("CredentialService Integration Tests", () => {
  let service: CredentialService;
  const hostUrl = "https://example.com";

  // Test data
  let testData: any;

  // Helper to check if tables exist - using the exported function instead
  async function tableExists(tableName: string): Promise<boolean> {
    return checkTableExists(testDb, tableName);
  }

  // Setup before each test
  beforeEach(async () => {
    // Initialize the service
    service = new CredentialService();

    // Seed test data
    testData = await seedTestData();
  });

  // Cleanup after each test
  afterEach(async () => {
    await clearTestData();
  });

  it("should create an achievement", async () => {
    // Check if badge_classes table exists
    const hasBadges = await tableExists("badge_classes");
    if (!hasBadges) {
      console.log("badge_classes table doesn't exist, skipping test");
      return;
    }

    // Create a test badge
    const badge = await testDb
      .insert(badgeClasses)
      .values({
        name: "Achievement Test Badge",
        description: "A test badge for achievement creation",
        imageUrl: "https://example.com/badge.png",
        criteria: "Test achievement criteria",
        issuerId: testData.issuer.issuerId,
        badgeJson: {
          "@context": "https://w3id.org/openbadges/v2",
          type: "BadgeClass",
          name: "Achievement Test Badge",
          description: "A test badge for achievement creation",
          image: "https://example.com/badge.png",
          criteria: { narrative: "Test achievement criteria" },
          issuer: "https://example.com/issuer",
        },
      })
      .returning();

    // Test creating an achievement
    const result = await service.createAchievement(hostUrl, badge[0].badgeId);

    // Verify results
    expect(result).toBeDefined();
    expect(result.id).toEqual(`${hostUrl}/badges/${badge[0].badgeId}`);
    expect(result.name).toEqual("Achievement Test Badge");
    expect(result.type).toContain("AchievementCredential");
  });

  it("should sign a credential", async () => {
    // Skip if issuer doesn't exist
    if (!testData || !testData.issuer) {
      console.log("Test issuer not found, skipping test");
      return;
    }

    // Create a test credential
    const credential = {
      id: "test-credential",
      type: ["VerifiableCredential"],
      issuer: `${hostUrl}/issuers/${testData.issuer.issuerId}`,
      "@context": OB3_CREDENTIAL_CONTEXT,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: "test-recipient@example.com",
        type: "EmailCredentialSubject",
      },
    };

    // Sign the credential
    const result = await service.signCredential(
      testData.issuer.issuerId,
      credential,
    );

    // Verify results
    expect(result).toBeDefined();
    expect(result.proof).toBeDefined();
    expect(result.proof.type).toEqual("DataIntegrityProof");
    expect((result.proof as DataIntegrityProof).cryptosuite).toEqual(
      "eddsa-rdfc-2022",
    );
    expect(result.proof.proofValue).toBeDefined();

    // Verify the signature is valid
    const isValid = await service.verifySignature(result);
    expect(isValid).toBe(true);
  });

  it("should verify a credential signature", async () => {
    // Skip if issuer doesn't exist
    if (!testData || !testData.issuer) {
      console.log("Test issuer not found, skipping test");
      return;
    }

    // Create a test credential
    const credential = {
      id: "test-credential",
      type: ["VerifiableCredential"],
      issuer: `${hostUrl}/issuers/${testData.issuer.issuerId}`,
      "@context": OB3_CREDENTIAL_CONTEXT,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: "test-recipient@example.com",
        type: "EmailCredentialSubject",
      },
    };

    // Sign the credential
    const signedCredential = await service.signCredential(
      testData.issuer.issuerId,
      credential,
    );

    // Verify the signature
    const result = await service.verifySignature(signedCredential);
    expect(result).toBe(true);

    // Test tampering detection - modify the credential
    const tamperedCredential = JSON.parse(JSON.stringify(signedCredential));
    tamperedCredential.id = "tampered-credential";

    const isTamperedValid = await service.verifySignature(tamperedCredential);
    expect(isTamperedValid).toBe(false);
  });

  it("should return false for missing proof", async () => {
    const credential = {
      id: "test-credential",
      type: ["VerifiableCredential"],
      issuer: `${hostUrl}/issuers/${testData?.issuer?.issuerId || "test-issuer-id"}`,
      "@context": OB3_CREDENTIAL_CONTEXT,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: "test-recipient@example.com",
        type: "EmailCredentialSubject",
      },
      proof: undefined as unknown as CredentialProof,
    } as SignableCredential & { proof: CredentialProof };

    const result = await service.verifySignature(credential);
    expect(result).toBe(false);
  });

  it("should create a verifiable credential", async () => {
    // Skip if required tables don't exist
    const hasIssuers = await tableExists("issuer_profiles");
    const hasBadges = await tableExists("badge_classes");
    const hasAssertions = await tableExists("badge_assertions");

    if (!hasIssuers || !hasBadges || !hasAssertions) {
      console.log("Required tables don't exist, skipping test");
      return;
    }

    // Create an assertion
    const assertionJson = {
      "@context": "https://w3id.org/openbadges/v2",
      type: "Assertion",
      recipient: {
        identity: "test-recipient@example.com",
        type: "email",
        hashed: false,
      },
      badge: `${hostUrl}/badges/${testData.badge.badgeId}`,
      issuedOn: new Date().toISOString(),
    };

    const assertions = await testDb
      .insert(badgeAssertions)
      .values({
        badgeId: testData.badge.badgeId,
        issuerId: testData.issuer.issuerId,
        recipientIdentity: "test-recipient@example.com",
        recipientType: "email",
        recipientHashed: false,
        issuedOn: new Date(),
        assertionJson: assertionJson,
        evidenceUrl: null,
        revoked: false,
        revocationReason: null,
      })
      .returning();

    // Create the credential
    const result = await service.createCredential(
      hostUrl,
      assertions[0].assertionId,
    );

    // Verify results
    expect(result).toBeDefined();
    expect(result.id).toEqual(
      `${hostUrl}/assertions/${assertions[0].assertionId}`,
    );
    expect(result.type).toContain("VerifiableCredential");
    expect(result.type).toContain("OpenBadgeCredential");
    expect(result.proof).toBeDefined();
    expect(result.credentialSubject).toBeDefined();
    expect(result.credentialSubject.achievement).toBeDefined();

    // Verify the signature
    const isValid = await service.verifySignature(
      result as unknown as SignableCredential & { proof: CredentialProof },
    );
    expect(isValid).toBe(true);
  });

  it("should ensure issuer key exists", async () => {
    // Skip if issuer doesn't exist
    if (!testData || !testData.issuer) {
      console.log("Test issuer not found, skipping test");
      return;
    }

    // Test the key management function
    const key = await service.ensureIssuerKeyExists(testData.issuer.issuerId);

    // Verify key properties
    expect(key).toBeDefined();
    expect(key.privateKey).toBeDefined();
    expect(key.publicKey).toBeDefined();

    // Ensure the key matches our test key or is a valid new key
    const privateKeyExists = key.privateKey.length > 0;
    const publicKeyExists = key.publicKey.length > 0;

    expect(privateKeyExists).toBe(true);
    expect(publicKeyExists).toBe(true);

    // Validate key controller format
    expect(key.controller).toContain("did:key:");
  });
});
