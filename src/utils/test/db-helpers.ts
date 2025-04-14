import { db, dbPool } from "../../db/config";
import {
  users,
  issuerProfiles,
  badgeClasses,
  badgeAssertions,
  signingKeys,
  verificationCodes,
} from "../../db/schema";
import { eq, type InferSelectModel } from "drizzle-orm";
import { nanoid } from "nanoid";
import { OB2BadgeAssertion } from "@/services/verification.service";
import { OpenBadgeCredential } from "@/utils/openbadges-types";
import {
  getOB2AssertionJson,
  getOB3CredentialJson,
  updateOB2AssertionJson,
  updateOB3CredentialJson,
} from "../../../tests/helpers/test-utils";

// Define types locally using InferSelectModel
type User = InferSelectModel<typeof users>;
type IssuerProfile = InferSelectModel<typeof issuerProfiles>;
type BadgeClass = InferSelectModel<typeof badgeClasses>;
type BadgeAssertion = InferSelectModel<typeof badgeAssertions>;
type SigningKey = InferSelectModel<typeof signingKeys>;

// Flag to detect if we're in a test environment with mocks
const IS_TEST_ENV = process.env.NODE_ENV === "test" || !!process.env.BUN_TEST;

/**
 * Test data interface using inferred types
 */
export interface TestData {
  user: User;
  issuer: IssuerProfile;
  badge: BadgeClass;
  assertion: BadgeAssertion;
  signingKey: SigningKey;
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
        // Delete signing_keys before issuer_profiles to avoid foreign key constraint violations
        await db.delete(signingKeys);
        await db.delete(issuerProfiles);
        await db.delete(verificationCodes);

        // Try to delete from oauth tables if they exist
        try {
          await db.execute("DELETE FROM oauth_access_tokens");
        } catch (_) {
          // Suppress error if table doesn't exist
          console.log("Note: oauth_access_tokens table might not exist yet");
        }

        try {
          await db.execute("DELETE FROM authorization_codes");
        } catch (_) {
          // Suppress error if table doesn't exist
          console.log("Note: authorization_codes table might not exist yet");
        }

        try {
          await db.execute("DELETE FROM oauth_clients");
        } catch (_) {
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

    // Check if dbPool is valid and not already ended
    if (!dbPool || typeof dbPool.query !== "function") {
      console.warn("⚠️ Pool not available or already ended, skipping cleanup");
      return;
    }

    // For CI environment, use a safer approach with a fresh client connection
    if (process.env.CI === "true") {
      try {
        const client = await dbPool.connect();
        try {
          await client.query("SET session_replication_role = 'replica'");

          // Delete data in a specific order to avoid constraint violations
          await client.query("DELETE FROM badge_assertions");
          await client.query("DELETE FROM badge_classes");
          await client.query("DELETE FROM signing_keys");
          await client.query("DELETE FROM issuer_profiles");
          await client.query("DELETE FROM verification_codes");
          await client.query("DELETE FROM revoked_tokens");

          // Try to delete from oauth tables if they exist
          try {
            await client.query("DELETE FROM oauth_access_tokens");
          } catch (_) {}
          try {
            await client.query("DELETE FROM authorization_codes");
          } catch (_) {}
          try {
            await client.query("DELETE FROM oauth_clients");
          } catch (_) {}

          await client.query("DELETE FROM users");
          await client.query("SET session_replication_role = 'origin'");

          console.log("✅ Test data cleared successfully in CI mode");
        } finally {
          client.release();
        }
        return;
      } catch (error) {
        console.error("❌ Error clearing test data in CI mode:", error);
        // Continue to try the normal approach as fallback
      }
    }

    // Otherwise use normal pool connection - this is the original approach
    try {
      // Disable foreign key checks (for PostgreSQL)
      await dbPool.query("SET session_replication_role = 'replica'");

      // Delete data from each table in reverse dependency order
      await dbPool.query("DELETE FROM badge_assertions");
      await dbPool.query("DELETE FROM badge_classes");
      // Delete signing_keys before issuer_profiles to avoid foreign key constraint violations
      await dbPool.query("DELETE FROM signing_keys");
      await dbPool.query("DELETE FROM issuer_profiles");
      await dbPool.query("DELETE FROM verification_codes");
      await dbPool.query("DELETE FROM revoked_tokens");

      // Try to delete from oauth tables if they exist
      try {
        await dbPool.query("DELETE FROM oauth_access_tokens");
      } catch (_) {
        // Suppress error if table doesn't exist
        console.log("Note: oauth_access_tokens table might not exist yet");
      }

      try {
        await dbPool.query("DELETE FROM authorization_codes");
      } catch (_) {
        // Suppress error if table doesn't exist
        console.log("Note: authorization_codes table might not exist yet");
      }

      try {
        await dbPool.query("DELETE FROM oauth_clients");
      } catch (_) {
        // Suppress error if table doesn't exist
        console.log("Note: oauth_clients table might not exist yet");
      }

      await dbPool.query("DELETE FROM users");

      // Re-enable foreign key checks
      await dbPool.query("SET session_replication_role = 'origin'");

      console.log("✅ Test data cleared successfully");
    } catch (error) {
      console.error("❌ Error clearing test data:", error);
      // We don't rethrow here to avoid crashing tests
      // Just log the error and continue
    }
  } catch (error) {
    console.error("❌ Error in clearTestData:", error);
    // Don't throw here to avoid breaking tests, just log
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
    } catch (_) {
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
    } catch (_) {
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

// Re-export createMockContext for backwards compatibility
import { createMockContext } from "./mock-context";
export { createMockContext };
