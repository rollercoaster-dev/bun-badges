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
import { TEST_KEYS } from "./integration-setup";
import { base58 } from "@scure/base";
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
  // Create test user
  const [user] = await db
    .insert(users)
    .values({
      email: "test@example.com",
      name: "Test User",
    })
    .returning();

  // Create test issuer
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
    })
    .returning();

  // Create test badge
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
  const [signingKey] = await db
    .insert(signingKeys)
    .values({
      issuerId: issuer.issuerId,
      publicKeyMultibase: base58.encode(TEST_KEYS.publicKey),
      privateKeyMultibase: base58.encode(TEST_KEYS.privateKey),
      controller: "did:key:test",
      keyInfo: {
        "@context": ["https://w3id.org/security/v2"],
        id: "did:key:test#key-1",
        type: "Ed25519VerificationKey2020",
        controller: "did:key:test",
      },
      revoked: false,
    })
    .returning();

  // Create test assertion
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

  return {
    user,
    issuer,
    badge,
    assertion,
    signingKey,
  };
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
  // Disable foreign key checks (for PostgreSQL)
  await db.execute(sql`SET session_replication_role = 'replica'`);

  try {
    // Clear tables in order
    await db.delete(badgeAssertions);
    await db.delete(badgeClasses);
    await db.delete(signingKeys);
    await db.delete(issuerProfiles);
    await db.delete(verificationCodes);
    await db.delete(revokedTokens);
    await db.delete(users);
  } finally {
    // Re-enable foreign key checks
    await db.execute(sql`SET session_replication_role = 'origin'`);
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
