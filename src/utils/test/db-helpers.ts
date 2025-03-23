import { db, dbPool } from "../../db/config";
import {
  users,
  issuerProfiles,
  badgeClasses,
  badgeAssertions,
  signingKeys,
  verificationCodes,
} from "../../db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { OB2BadgeAssertion } from "@/services/verification.service";
import { OpenBadgeCredential } from "@/models/credential.model";
import {
  getOB2AssertionJson,
  getOB3CredentialJson,
  updateOB2AssertionJson,
  updateOB3CredentialJson,
} from "../../../tests/helpers/test-utils";

// Flag to detect if we're in a test environment with mocks
const IS_TEST_ENV = process.env.NODE_ENV === "test" || !!process.env.BUN_TEST;

/**
 * Test data interface
 */
export interface TestData {
  user: any;
  issuer: any;
  badge: any;
  assertion: any;
  signingKey: any;
}

/**
 * Helper to generate test data for integration tests
 * Uses direct database operations to seed test data
 */
export async function seedTestData() {
  console.log("Seeding fresh test data...");

  try {
    // Clear existing data first
    await clearTestData();

    // Create a test user
    const userId = crypto.randomUUID();
    const user = await db
      .insert(users)
      .values({
        userId,
        email: `test-${nanoid(6)}@example.com`,
        name: `Test User ${nanoid(6)}`,
        passwordHash: "not-a-real-hash",
      })
      .returning();

    // Create a test issuer
    const issuerId = crypto.randomUUID();
    const issuer = await db
      .insert(issuerProfiles)
      .values({
        issuerId,
        name: "Test Issuer",
        url: "https://test-issuer.example.com",
        description: "A test issuer",
        email: "test-issuer@example.com",
        ownerUserId: userId,
        issuerJson: {
          "@context": "https://w3id.org/openbadges/v2",
          type: "Issuer",
          id: `https://test-issuer.example.com/issuers/${issuerId}`,
          name: "Test Issuer",
          url: "https://test-issuer.example.com",
          email: "test-issuer@example.com",
          description: "A test issuer for testing purposes",
        },
      })
      .returning();

    // Create a test signing key
    const signingKey = await createTestSigningKey(issuerId);

    // Create a test badge
    const badgeId = crypto.randomUUID();
    const badge = await db
      .insert(badgeClasses)
      .values({
        badgeId,
        issuerId,
        name: "Test Badge",
        description: "A test badge",
        imageUrl: "https://test-badge.example.com/image.png",
        criteria: "https://test-badge.example.com/criteria",
        badgeJson: {
          "@context": "https://w3id.org/openbadges/v2",
          type: "BadgeClass",
          id: `https://test-badge.example.com/badges/${badgeId}`,
          name: "Test Badge",
          description: "A test badge for testing purposes",
          image: "https://test-badge.example.com/image.png",
          criteria: {
            narrative: "Criteria for earning this badge",
          },
          issuer: `https://test-issuer.example.com/issuers/${issuerId}`,
        },
      })
      .returning();

    // Create a test assertion
    const assertionId = crypto.randomUUID();
    const assertion = await db
      .insert(badgeAssertions)
      .values({
        assertionId,
        badgeId,
        issuerId,
        recipientType: "email",
        recipientIdentity: "test-recipient@example.com",
        recipientHashed: false,
        issuedOn: new Date(),
        assertionJson: {
          "@context": "https://w3id.org/openbadges/v2",
          type: "Assertion",
          id: `https://test-badge.example.com/assertions/${assertionId}`,
          recipient: {
            type: "email",
            identity: "test-recipient@example.com",
            hashed: false,
          },
          issuedOn: new Date().toISOString(),
          badge: `https://test-badge.example.com/badges/${badgeId}`,
          verification: {
            type: "HostedBadge",
          },
        },
      })
      .returning();

    console.log("✅ Test data created successfully!");

    return {
      user: user[0],
      issuer: issuer[0],
      badge: badge[0],
      assertion: assertion[0],
      signingKey,
    };
  } catch (error) {
    console.error("Error seeding test data:", error);
    throw error;
  }
}

/**
 * Seed a verification code for testing
 */
export async function seedVerificationCode(
  username: string,
  code: string = "123456",
) {
  return await db
    .insert(verificationCodes)
    .values({
      username,
      code,
      expiresAt: new Date(Date.now() + 1000 * 60 * 10), // 10 minutes from now
    })
    .returning();
}

/**
 * Clear test data from the database
 * This directly uses SQL to delete data from all important tables
 */
export async function clearTestData() {
  console.log("🧹 Clearing test data from database...");
  try {
    // Check if we're in a test environment with mocks
    // In this case, use the db object from drizzle instead
    if (IS_TEST_ENV && (!dbPool || typeof dbPool.query !== "function")) {
      console.log("Using Drizzle ORM for test data cleanup in test mode");
      try {
        // Delete data using Drizzle ORM in reverse dependency order
        await db.delete(badgeAssertions);
        await db.delete(badgeClasses);
        await db.delete(signingKeys);
        await db.delete(issuerProfiles);
        await db.delete(verificationCodes);

        // Try to delete from oauth tables if they exist
        try {
          await db.execute("DELETE FROM oauth_access_tokens");
        } catch (e) {
          // Suppress error if table doesn't exist
          console.log("Note: oauth_access_tokens table might not exist yet");
        }

        try {
          await db.execute("DELETE FROM authorization_codes");
        } catch (e) {
          // Suppress error if table doesn't exist
          console.log("Note: authorization_codes table might not exist yet");
        }

        try {
          await db.execute("DELETE FROM oauth_clients");
        } catch (e) {
          // Suppress error if table doesn't exist
          console.log("Note: oauth_clients table might not exist yet");
        }

        await db.delete(users);

        console.log("✅ Test data cleared successfully");
        return;
      } catch (e) {
        console.error("❌ Error clearing test data with Drizzle:", e);
        throw e;
      }
    }

    // Otherwise use normal pool connection
    // Disable foreign key checks (for PostgreSQL)
    await dbPool.query("SET session_replication_role = 'replica'");

    try {
      // Delete data from each table in reverse dependency order
      await dbPool.query("DELETE FROM badge_assertions");
      await dbPool.query("DELETE FROM badge_classes");
      await dbPool.query("DELETE FROM signing_keys");
      await dbPool.query("DELETE FROM issuer_profiles");
      await dbPool.query("DELETE FROM verification_codes");
      await dbPool.query("DELETE FROM revoked_tokens");

      // Try to delete from oauth tables if they exist
      try {
        await dbPool.query("DELETE FROM oauth_access_tokens");
      } catch (e) {
        // Suppress error if table doesn't exist
        console.log("Note: oauth_access_tokens table might not exist yet");
      }

      try {
        await dbPool.query("DELETE FROM authorization_codes");
      } catch (e) {
        // Suppress error if table doesn't exist
        console.log("Note: authorization_codes table might not exist yet");
      }

      try {
        await dbPool.query("DELETE FROM oauth_clients");
      } catch (e) {
        // Suppress error if table doesn't exist
        console.log("Note: oauth_clients table might not exist yet");
      }

      await dbPool.query("DELETE FROM users");

      console.log("✅ Test data cleared successfully");
    } finally {
      // Re-enable foreign key checks
      await dbPool.query("SET session_replication_role = 'origin'");
    }
  } catch (error) {
    console.error("❌ Error clearing test data:", error);
    throw error;
  }
}

async function createTestSigningKey(issuerId: string) {
  // Create a signing key for the issuer
  const keyId = crypto.randomUUID();

  // Generate values for required fields
  const controller = `did:web:test-issuer.example.com`;

  const signingKey = await db
    .insert(signingKeys)
    .values({
      keyId,
      issuerId,
      type: "Ed25519VerificationKey2020",
      publicKeyMultibase: "z6MkrzXCdarP1kaZQXEX6CDRdcLYTk6bTEgGDgV5XQEyP4WB", // Test multibase public key
      privateKeyMultibase:
        "z3u2en7t8mxcz3s9wKaDTNWK1RA619VAXqLLGEY4ZD1vpCgPbR7yMkwk4Qj7TuuGJUTzpgvA", // Test multibase private key
      controller: controller,
      keyInfo: {
        id: `${controller}#key-1`,
        type: "Ed25519VerificationKey2020",
        controller: controller,
        publicKeyMultibase: "z6MkrzXCdarP1kaZQXEX6CDRdcLYTk6bTEgGDgV5XQEyP4WB",
      },
      revoked: false,
    })
    .returning();

  return signingKey[0];
}

/**
 * Get the JSON for an assertion
 */
export async function getAssertionJson(
  assertionId: string,
): Promise<OB2BadgeAssertion | OpenBadgeCredential> {
  // First check if this is a mocked environment
  if (IS_TEST_ENV) {
    try {
      // Check for OB2 format
      const ob2Json = await getOB2AssertionJson(assertionId);
      if (ob2Json) return ob2Json;

      // Check for OB3 format
      const ob3Json = await getOB3CredentialJson(assertionId);
      if (ob3Json) return ob3Json;
    } catch (e) {
      // Silently continue to DB query method if helper fails
    }
  }

  const assertion = await db
    .select()
    .from(badgeAssertions)
    .where(eq(badgeAssertions.assertionId, assertionId))
    .limit(1);

  if (!assertion || assertion.length === 0) {
    throw new Error(`Assertion not found: ${assertionId}`);
  }

  return assertion[0].assertionJson as OB2BadgeAssertion | OpenBadgeCredential;
}

/**
 * Update the JSON for an assertion
 */
export async function updateAssertionJson(
  assertionId: string,
  updates: Partial<OB2BadgeAssertion | OpenBadgeCredential>,
): Promise<void> {
  // First check if this is a mocked environment
  if (IS_TEST_ENV) {
    try {
      // Try the OB2 update helper - use type assertion for TypeScript
      const result = await updateOB2AssertionJson(
        assertionId,
        updates as Partial<OB2BadgeAssertion>,
      );
      if (result) return;

      // Try the OB3 update helper - use type assertion for TypeScript
      const result2 = await updateOB3CredentialJson(
        assertionId,
        updates as Partial<OpenBadgeCredential>,
      );
      if (result2) return;
    } catch (e) {
      // Silently continue to DB update method if helper fails
    }
  }

  // Get the existing assertion
  const assertion = await db
    .select()
    .from(badgeAssertions)
    .where(eq(badgeAssertions.assertionId, assertionId))
    .limit(1);

  if (!assertion || assertion.length === 0) {
    throw new Error(`Assertion not found: ${assertionId}`);
  }

  // Update the assertionJson with the updates
  const assertionJson = assertion[0].assertionJson as
    | OB2BadgeAssertion
    | OpenBadgeCredential;
  const updatedJson = { ...assertionJson, ...updates };

  // Save the updated assertionJson
  await db
    .update(badgeAssertions)
    .set({ assertionJson: updatedJson })
    .where(eq(badgeAssertions.assertionId, assertionId));
}
