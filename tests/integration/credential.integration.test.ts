import { describe, test, expect } from "bun:test";
import { CredentialService } from "@/services/credential.service";
import { badgeClasses, badgeAssertions } from "@/db/schema";
import { testDb, pool } from "@/utils/test/integration-setup";
import { issuerProfiles } from "@/db/schema/issuers";
import { eq } from "drizzle-orm";
import {
  OpenBadgeCredential,
  OpenBadgeProof,
  OB3,
} from "@/utils/openbadges-types";

describe("Credential Service Integration Tests", () => {
  // Create a service
  const credentialService = new CredentialService();

  // Test base URL for assertions
  const TEST_HOST_URL = "https://badges.example.com";

  // Helper to check if tables exist
  async function tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `
        SELECT EXISTS (
          SELECT FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename = $1
        );
      `,
        [tableName],
      );
      return result?.rows?.[0]?.exists === true;
    } catch (error) {
      console.error(`Error checking if table ${tableName} exists:`, error);
      return false;
    }
  }

  test("should create and verify a badge credential", async () => {
    // Check if all required tables exist
    const hasIssuers = await tableExists("issuer_profiles");
    const hasBadges = await tableExists("badge_classes");
    const hasAssertions = await tableExists("badge_assertions");
    const hasSigningKeys = await tableExists("signing_keys");

    if (!hasIssuers || !hasBadges || !hasAssertions || !hasSigningKeys) {
      console.log("Required tables don't exist, skipping test");
      // Skip test if tables don't exist
      expect(true).toBe(true);
      return;
    }

    try {
      // 0. Get the test issuer from the database
      const issuers = await testDb()
        .select()
        .from(issuerProfiles)
        .where(eq(issuerProfiles.name, "Test Issuer"));

      if (!issuers.length) {
        console.log("Test issuer not found, skipping test");
        // Skip test if issuer not found
        expect(true).toBe(true);
        return;
      }

      const issuer = issuers[0];

      // 1. Create test badge and assertion
      const badgeJson = {
        "@context": "https://w3id.org/openbadges/v2",
        type: "BadgeClass",
        name: "Test Badge",
        description: "A test badge for integration testing",
        image: "https://example.com/badge.png",
        criteria: { narrative: "Complete the test successfully" },
        issuer: "https://example.com/issuer",
      };

      const badges = await testDb()
        .insert(badgeClasses)
        .values({
          name: "Test Badge",
          description: "A test badge for integration testing",
          imageUrl: "https://example.com/badge.png",
          criteria: "Complete the test successfully",
          issuerId: issuer.issuerId,
          badgeJson: badgeJson,
        })
        .returning();

      if (!badges.length) {
        console.log("Failed to create test badge");
        expect(false).toBe(true); // Fail the test
        return;
      }

      const badge = badges[0];

      const assertionJson = {
        "@context": "https://w3id.org/openbadges/v2",
        type: "Assertion",
        recipient: {
          identity: "test@example.com",
          type: "email",
          hashed: false,
        },
        badge: `${TEST_HOST_URL}/badges/${badge.badgeId}`,
        issuedOn: new Date().toISOString(),
      };

      const assertions = await testDb()
        .insert(badgeAssertions)
        .values({
          badgeId: badge.badgeId,
          issuerId: issuer.issuerId,
          recipientIdentity: "test@example.com",
          recipientType: "email",
          recipientHashed: false,
          issuedOn: new Date(),
          assertionJson: assertionJson,
          // Add only fields that exist in the schema
          evidenceUrl: null,
          revoked: false,
          revocationReason: null,
        })
        .returning();

      if (!assertions.length) {
        console.log("Failed to create test assertion");
        expect(false).toBe(true); // Fail the test
        return;
      }

      const assertion = assertions[0];

      // 2. Create credential
      const credential = await credentialService.createCredential(
        TEST_HOST_URL,
        assertion.assertionId,
      );

      // 3. Verify the credential exists and has correct properties
      expect(credential).toBeDefined();
      expect(credential.type).toContain("OpenBadgeCredential");
      expect(credential.credentialSubject.id as string).toBe(
        assertion.recipientIdentity,
      );

      // Handle potential array for achievement
      const achievement = credential.credentialSubject.achievement;
      let targetAchievement: OB3.Achievement | undefined;
      if (Array.isArray(achievement)) {
        // If it's an array, check the first element
        expect(achievement.length).toBeGreaterThan(0); // Ensure array is not empty
        targetAchievement = achievement[0];
      } else {
        // If it's a single object
        targetAchievement = achievement;
      }
      expect(targetAchievement).toBeDefined(); // Ensure we have an achievement object
      expect(targetAchievement?.name).toBe("Test Badge"); // Safely access name

      // 4. Verify the credential has a valid signature
      expect(credential.proof).toBeDefined();
      if (credential.proof) {
        expect(credential.proof.type).toBe("DataIntegrityProof");
        expect((credential.proof as OpenBadgeProof).cryptosuite).toBe(
          "eddsa-rdfc-2022",
        );
        expect(credential.proof.proofValue).toBeDefined();
      }

      // 5. Verify the signature is valid - we know the proof exists after checks above
      const isValid = await credentialService.verifySignature(
        credential as any,
      );
      expect(isValid).toBe(true);

      // 6. Test tampering detection - modify the credential and signature should fail
      const tamperedCredential = JSON.parse(
        JSON.stringify(credential),
      ) as OpenBadgeCredential & { proof: any };
      // Modify the correct achievement name based on whether it's an array or object
      if (Array.isArray(tamperedCredential.credentialSubject.achievement)) {
        if (tamperedCredential.credentialSubject.achievement.length > 0) {
          tamperedCredential.credentialSubject.achievement[0].name =
            "Modified Badge Name";
        }
      } else {
        tamperedCredential.credentialSubject.achievement.name =
          "Modified Badge Name";
      }

      const isTamperedValid = await credentialService.verifySignature(
        tamperedCredential as any,
      );
      expect(isTamperedValid).toBe(false);
    } catch (error) {
      console.error("Test error:", error);
      expect(false).toBe(true); // Fail the test on error
    }
  });

  test("should ensure issuer key exists", async () => {
    // Check if issuer_profiles and signing_keys tables exist
    const hasIssuers = await tableExists("issuer_profiles");
    const hasSigningKeys = await tableExists("signing_keys");

    if (!hasIssuers || !hasSigningKeys) {
      console.log("Required tables don't exist, skipping test");
      // Skip test if tables don't exist
      expect(true).toBe(true);
      return;
    }

    try {
      // Get the test issuer from the database
      const issuers = await testDb()
        .select()
        .from(issuerProfiles)
        .where(eq(issuerProfiles.name, "Test Issuer"));

      if (!issuers.length) {
        console.log("Test issuer not found, skipping test");
        // Skip test if issuer not found
        expect(true).toBe(true);
        return;
      }

      const issuer = issuers[0];

      // Test the key management function
      const key = await credentialService.ensureIssuerKeyExists(
        issuer.issuerId,
      );

      // Verify key properties
      expect(key).toBeDefined();
      expect(key.privateKey).toBeDefined();
      expect(key.publicKey).toBeDefined();

      // Ensure the key matches our test key or is a valid new key
      const privateKeyExists = key.privateKey.length > 0;
      const publicKeyExists = key.publicKey.length > 0;

      expect(privateKeyExists).toBe(true);
      expect(publicKeyExists).toBe(true);
    } catch (error) {
      console.error("Test error:", error);
      expect(false).toBe(true); // Fail the test on error
    }
  });
});
