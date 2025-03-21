import { db } from "@/db/config";
import {
  issuerProfiles,
  badgeClasses,
  badgeAssertions,
  signingKeys,
  verificationCodes,
  revokedTokens,
} from "@/db/schema";
import { users } from "@/db/schema/index";
import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";

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
 * Seed test data for integration tests
 * This creates a user, issuer, badge, and assertion in the test database
 */
export async function seedTestData(): Promise<TestData> {
  console.log("Seeding fresh test data...");

  try {
    // Check that required tables exist before proceeding
    const tablesResult = await db.execute(sql`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('users', 'issuer_profiles', 'badge_classes', 'badge_assertions', 'signing_keys')
    `);

    const existingTables = tablesResult.rows.map((row) => row.tablename);
    const requiredTables = [
      "users",
      "issuer_profiles",
      "badge_classes",
      "badge_assertions",
      "signing_keys",
    ];
    const missingTables = requiredTables.filter(
      (table) => !existingTables.includes(table),
    );

    if (missingTables.length > 0) {
      console.error(
        `❌ Cannot seed test data. Missing tables: ${missingTables.join(", ")}`,
      );
      throw new Error(`Missing required tables: ${missingTables.join(", ")}`);
    }

    // First clear any existing test data to ensure a clean state
    await clearTestData();

    // Create test user
    console.log("Creating test user...");
    const [user] = await db
      .insert(users)
      .values({
        email: "test@example.com",
        name: "Test User",
      })
      .returning();

    // Create test issuer
    console.log("Creating test issuer...");

    // Create the issuer without the publicKey field - it doesn't exist in the actual DB table
    const [issuer] = await db
      .insert(issuerProfiles)
      .values({
        name: "Test Issuer",
        url: "https://test-issuer.example.com",
        description: "A test issuer for integration tests",
        email: "test@example.com",
        ownerUserId: user.userId,
        issuerJson: {
          "@context": "https://w3id.org/openbadges/v2",
          id: "https://test-issuer.example.com",
          type: "Issuer",
          name: "Test Issuer",
          url: "https://test-issuer.example.com",
          email: "test@example.com",
        },
        // NOTE: publicKey is in the schema definition but doesn't exist in the DB table
        // This is the source of the test failures
      })
      .returning();

    // Create test badge
    console.log("Creating test badge...");
    const [badge] = await db
      .insert(badgeClasses)
      .values({
        name: "Test Badge",
        description: "A test badge for integration tests",
        imageUrl: "https://example.com/badge.png",
        issuerId: issuer.issuerId,
        criteria: "Test criteria for earning this badge",
        badgeJson: {
          "@context": "https://w3id.org/openbadges/v2",
          id: "https://example.com/badges/test-badge",
          type: "BadgeClass",
          name: "Test Badge",
          description: "A test badge for integration tests",
          image: "https://example.com/badge.png",
          criteria: {
            narrative: "Test criteria for earning this badge",
          },
          issuer: "https://test-issuer.example.com",
        },
      })
      .returning();

    // Create test signing key
    console.log("Creating test signing key...");
    const signingKey = await createTestSigningKey(issuer.issuerId);

    // Create test assertion
    console.log("Creating test assertion...");
    const [assertion] = await db
      .insert(badgeAssertions)
      .values({
        badgeId: badge.badgeId,
        issuerId: issuer.issuerId,
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
          id: "https://example.com/assertions/test-assertion",
          recipient: {
            type: "email",
            identity: "recipient@example.com",
            hashed: false,
          },
          badge: "https://example.com/badges/test-badge",
          issuedOn: new Date().toISOString(),
          verification: {
            type: "HostedBadge",
          },
          evidence: "https://example.com/evidence",
        },
      })
      .returning();

    console.log("✅ Fresh test data created successfully");
    return {
      user,
      issuer,
      badge,
      assertion,
      signingKey,
    };
  } catch (error) {
    console.error("❌ Error seeding test data:", error);
    throw error;
  }
}

/**
 * Seed test verification code
 */
export async function seedVerificationCode(
  username: string,
  code: string = "123456",
) {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5);

  const [verificationCode] = await db
    .insert(verificationCodes)
    .values({
      id: nanoid(),
      username,
      code,
      expiresAt,
      attempts: [],
    })
    .returning();

  return verificationCode;
}

/**
 * Clear test data from the database
 * This deletes all test data in the correct order to avoid foreign key constraints
 */
export async function clearTestData() {
  console.log("🧹 Clearing test data from database...");
  try {
    // Disable foreign key checks (for PostgreSQL)
    await db.execute(sql`SET session_replication_role = 'replica'`);

    try {
      // Get a list of existing tables
      const tablesResult = await db.execute(sql`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('badge_assertions', 'badge_classes', 'signing_keys', 
                         'issuer_profiles', 'verification_codes', 'revoked_tokens', 'users')
      `);

      const existingTables = tablesResult.rows.map((row) => row.tablename);
      console.log(`Existing tables: ${existingTables.join(", ") || "none"}`);

      // If we have any tables, delete data from them
      if (existingTables.length > 0) {
        // Clear data individually from each table to handle tables that might not exist
        if (existingTables.includes("badge_assertions")) {
          await db.delete(badgeAssertions);
        }

        if (existingTables.includes("badge_classes")) {
          await db.delete(badgeClasses);
        }

        if (existingTables.includes("signing_keys")) {
          await db.delete(signingKeys);
        }

        if (existingTables.includes("issuer_profiles")) {
          await db.delete(issuerProfiles);
        }

        if (existingTables.includes("verification_codes")) {
          await db.delete(verificationCodes);
        }

        if (existingTables.includes("revoked_tokens")) {
          await db.delete(revokedTokens);
        }

        if (existingTables.includes("users")) {
          await db.delete(users);
        }

        console.log("✅ Test data cleared successfully");
      } else {
        console.log("⚠️ No tables found to clear");
      }
    } finally {
      // Re-enable foreign key checks
      await db.execute(sql`SET session_replication_role = 'origin'`);
    }
  } catch (error) {
    console.error("❌ Error clearing test data:", error);
    throw error;
  }
}

/**
 * Create mock context for route testing
 */
export function createMockContext(options: any = {}) {
  const {
    params = {},
    query = {},
    body = {},
    headers = {},
    url = "https://example.com/api/assertions",
    ip = "127.0.0.1",
  } = options;

  return {
    req: {
      param: (name: string) => params[name],
      query: (name: string) => query[name],
      url,
      json: () => Promise.resolve(body),
      header: (name: string) =>
        headers[name] || (name === "x-forwarded-for" ? ip : undefined),
    },
    json: (responseBody: any, status = 200) => {
      return new Response(JSON.stringify(responseBody), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    },
  } as any;
}

/**
 * Creates a consistent test signing key for use across tests
 * @param issuerId - The issuer ID to associate with the key
 * @returns The created signing key
 */
export async function createTestSigningKey(issuerId: string) {
  // Use predictable test keys for signing
  const publicKeyMultibase = "z6MksSBa6fJgGBw4m3WxoLLHJ4mji9iodcYQXJmF7xT9wFQZ";
  const privateKeyMultibase =
    "z3u2en7t32RYgLVdTt7GHwcgmJn3nXFPS4SadJvNnXBihgxV2vGWTn9WuJmJfMK1o3UXe7m8TqdqeH7DuHNLmDBLm";

  // Create consistent key ID with did:key format
  const controller = `did:key:${publicKeyMultibase}`;

  // Insert the test signing key
  const [key] = await db
    .insert(signingKeys)
    .values({
      keyId: crypto.randomUUID(),
      issuerId: issuerId,
      publicKeyMultibase: publicKeyMultibase,
      privateKeyMultibase: privateKeyMultibase,
      controller: controller, // Use consistent controller with did:key format
      type: "Ed25519VerificationKey2020",
      keyInfo: {
        id: `${controller}#z6Mk`,
        type: "Ed25519VerificationKey2020",
        controller: controller,
      },
      revoked: false,
      updatedAt: new Date(),
    })
    .returning();

  console.log("Creating test signing key...");
  return key;
}
