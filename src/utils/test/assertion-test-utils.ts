import { mock } from "bun:test";
import { db } from "@/db/config";
import {
  badgeAssertions,
  badgeClasses,
  issuerProfiles,
  users,
  signingKeys,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { nanoid } from "nanoid";

/**
 * Creates test assertion data and stores it in the database
 * @returns The created assertion data
 */
export async function createTestAssertionData() {
  const assertionId = crypto.randomUUID();
  const badgeId = crypto.randomUUID();
  const issuerId = crypto.randomUUID();
  const userId = crypto.randomUUID();

  // First create a test user
  await db.insert(users).values({
    userId,
    email: `test-${nanoid(6)}@example.com`,
    name: `Test User ${nanoid(6)}`,
    passwordHash: "not-a-real-hash",
    role: "admin",
  });

  // Then create a test issuer
  await db.insert(issuerProfiles).values({
    issuerId,
    name: "Test Issuer",
    url: "https://example.org",
    description: "A test issuer",
    email: "test-issuer@example.org",
    ownerUserId: userId,
    issuerJson: {
      "@context": "https://w3id.org/openbadges/v2",
      type: "Issuer",
      id: `https://example.org/issuers/${issuerId}`,
      name: "Test Issuer",
      url: "https://example.org",
      email: "test-issuer@example.org",
      description: "A test issuer for testing purposes",
    },
  });

  // Create a test badge class
  await db.insert(badgeClasses).values({
    badgeId,
    issuerId,
    name: "Test Badge",
    description: "A test badge",
    imageUrl: "https://example.org/badge.png",
    criteria: "Test criteria",
    badgeJson: {
      "@context": "https://w3id.org/openbadges/v2",
      type: "BadgeClass",
      id: `https://example.org/badges/${badgeId}`,
      name: "Test Badge",
      description: "A test badge",
      image: "https://example.org/badge.png",
      criteria: {
        narrative: "Test criteria",
      },
      issuer: `https://example.org/issuers/${issuerId}`,
    },
  });

  // Create a test signing key
  const keyId = crypto.randomUUID();
  const controller = `did:web:example.org`;

  await db.insert(signingKeys).values({
    keyId,
    issuerId,
    type: "Ed25519VerificationKey2020",
    publicKeyMultibase: "z6MkrzXCdarP1kaZQXEX6CDRdcLYTk6bTEgGDgV5XQEyP4WB", // Test key
    privateKeyMultibase:
      "z3u2en7t8mxcz3s9wKaDTNWK1RA619VAXqLLGEY4ZD1vpCgPbR7yMkwk4Qj7TuuGJUTzpgvA", // Test key
    controller: controller,
    keyInfo: {
      id: `${controller}#key-1`,
      type: "Ed25519VerificationKey2020",
      controller: controller,
      publicKeyMultibase: "z6MkrzXCdarP1kaZQXEX6CDRdcLYTk6bTEgGDgV5XQEyP4WB",
    },
    revoked: false,
  });

  // Create a test assertion
  const testAssertion = {
    assertionId,
    badgeId,
    issuerId,
    recipientType: "email",
    recipientIdentity: "test@example.com",
    recipientHashed: false,
    issuedOn: new Date(),
    evidenceUrl: "https://example.org/evidence",
    revoked: false,
    revocationReason: null,
    assertionJson: {
      "@context": "https://w3id.org/openbadges/v2",
      type: "Assertion",
      id: `https://example.org/assertions/${assertionId}`,
      recipient: {
        type: "email",
        identity: "test@example.com",
        hashed: false,
      },
      badge: {
        "@context": "https://w3id.org/openbadges/v2",
        type: "BadgeClass",
        id: `https://example.org/badges/${badgeId}`,
        name: "Test Badge",
        description: "A test badge",
        image: "https://example.org/badge.png",
        criteria: {
          narrative: "Test criteria",
        },
        issuer: `https://example.org/issuers/${issuerId}`,
      },
      issuedOn: new Date().toISOString(),
      verification: {
        type: "HostedBadge",
      },
    },
  };

  // Store the assertion in the database
  await db.insert(badgeAssertions).values(testAssertion);

  return {
    assertionId,
    badgeId,
    issuerId,
    userId,
    keyId,
    assertion: testAssertion,
  };
}

/**
 * Set up the basic crypto mocks needed for testing credential verification
 * This only mocks the cryptographic operations, not the database
 */
export function mockCryptoForTests() {
  // Mock the noble-ed25519 module that's causing issues
  mock.module("@noble/ed25519", () => {
    return {
      // Export all the functions that might be used by the credential service
      getPublicKey: () => new Uint8Array(32).fill(1),
      getPublicKeyAsync: async () => new Uint8Array(32).fill(1),
      sign: () => new Uint8Array(64).fill(2),
      signAsync: async () => new Uint8Array(64).fill(2),
      verify: () => true,
      verifyAsync: async () => true,
      getSharedSecret: () => new Uint8Array(32).fill(3),
      getSharedSecretAsync: async () => new Uint8Array(32).fill(3),
      utils: {
        randomPrivateKey: () => new Uint8Array(32).fill(4),
        getExtendedPublicKey: () => ({
          head: new Uint8Array(32).fill(5),
          prefix: new Uint8Array(32).fill(6),
          scalar: 42n,
          point: { toRawBytes: () => new Uint8Array(32).fill(7) },
          pointBytes: new Uint8Array(32).fill(8),
        }),
        getExtendedPublicKeyAsync: async () => ({
          head: new Uint8Array(32).fill(5),
          prefix: new Uint8Array(32).fill(6),
          scalar: 42n,
          point: { toRawBytes: () => new Uint8Array(32).fill(7) },
          pointBytes: new Uint8Array(32).fill(8),
        }),
      },
      // Mock any other exported values from the library
      CURVE: { p: 0n, n: 0n },
      etc: {
        bytesToHex: (bytes: Uint8Array) =>
          Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(""),
        hexToBytes: (hex: string) => new Uint8Array(hex.length / 2),
        sha512Sync: (...messages: Uint8Array[]) => new Uint8Array(64).fill(9),
        sha512Async: async (...messages: Uint8Array[]) =>
          new Uint8Array(64).fill(9),
        randomBytes: (len = 32) => new Uint8Array(len).fill(10),
      },
    };
  });
}

/**
 * Provides utility functions for working with assertions in tests
 * This replaces the old database mocking approach with real database operations
 */
export async function setupAssertionTestUtils() {
  // Mock crypto operations (only the ones we need to mock)
  mockCryptoForTests();

  // Create a test assertion in the database
  const testData = await createTestAssertionData();

  return {
    assertionId: testData.assertionId,
    badgeId: testData.badgeId,
    issuerId: testData.issuerId,
    userId: testData.userId,
    keyId: testData.keyId,

    // Helper to get assertion from DB
    getAssertion: async (id: string) => {
      const result = await db
        .select()
        .from(badgeAssertions)
        .where(eq(badgeAssertions.assertionId, id))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    },

    // Helper to revoke an assertion
    revokeAssertion: async (id: string, reason: string = "Test revocation") => {
      return await db
        .update(badgeAssertions)
        .set({
          revoked: true,
          revocationReason: reason,
        })
        .where(eq(badgeAssertions.assertionId, id))
        .returning();
    },

    // Helper to check if assertion is revoked
    isRevoked: async (id: string) => {
      const result = await db
        .select({ revoked: badgeAssertions.revoked })
        .from(badgeAssertions)
        .where(eq(badgeAssertions.assertionId, id))
        .limit(1);

      return result.length > 0 ? result[0].revoked : false;
    },
  };
}

/**
 * Creates mock assertion controller setup
 * Use this for integration tests that need to test the controller
 */
export function mockAssertionController() {
  // Mock the crypto operations
  mockCryptoForTests();

  // Create a test assertion data object - no database interaction
  const assertionId = crypto.randomUUID();
  const badgeId = crypto.randomUUID();
  const issuerId = crypto.randomUUID();

  // Mock the database responses
  const mockAssertion = {
    assertionId,
    badgeId,
    issuerId,
    recipientType: "email",
    recipientIdentity: "test@example.com",
    recipientHashed: false,
    issuedOn: new Date(),
    evidenceUrl: "https://example.org/evidence",
    revoked: false,
    revocationReason: null,
    assertionJson: {
      "@context": "https://w3id.org/openbadges/v2",
      type: "Assertion",
      id: `https://example.org/assertions/${assertionId}`,
      recipient: {
        type: "email",
        identity: "test@example.com",
        hashed: false,
      },
      badge: {
        "@context": "https://w3id.org/openbadges/v2",
        type: "BadgeClass",
        id: `https://example.org/badges/${badgeId}`,
        name: "Test Badge",
        description: "A test badge",
        image: "https://example.org/badge.png",
        criteria: {
          narrative: "Test criteria",
        },
        issuer: `https://example.org/issuers/${issuerId}`,
      },
      issuedOn: new Date().toISOString(),
      verification: {
        type: "HostedBadge",
      },
    },
  };

  // Intercept database queries for badge assertions
  mock.module("drizzle-orm", () => {
    // Import the original module without using mock.original
    // since it's not supported in Bun
    return {
      eq: (column: any, value: any) => ({ column, value, operator: "eq" }),
    };
  });

  // Mock the database
  mock.module("@/db/config", () => {
    return {
      db: {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([mockAssertion]),
            }),
          }),
        }),
        insert: () => ({
          values: () => ({
            returning: () =>
              Promise.resolve([{ assertionId: crypto.randomUUID() }]),
            execute: () => Promise.resolve(),
          }),
        }),
        update: () => ({
          set: () => ({
            where: () => ({
              returning: () => Promise.resolve([mockAssertion]),
            }),
          }),
        }),
      },
    };
  });

  // Mock the verification service
  mock.module("@/services/verification.service", () => {
    return {
      VerificationService: class MockVerificationService {
        async verifyAssertion() {
          return {
            valid: true,
            errors: [],
            checks: {
              structure: { valid: true, errors: [] },
              signature: { valid: true, errors: [] },
              revocation: { valid: true, errors: [] },
              expiration: { valid: true, errors: [] },
            },
          };
        }

        async verifyIssuer() {
          return {
            valid: true,
            errors: [],
          };
        }
      },
    };
  });

  return {
    assertionId,
    badgeId,
    issuerId,
    mockAssertion,
  };
}

/**
 * Creates mock assertion data for tests
 * This uses the same approach as mockAssertionController but returns just the data
 */
export function createMockAssertionData() {
  const { assertionId, badgeId, issuerId, mockAssertion } =
    mockAssertionController();
  return {
    assertionId,
    badgeId,
    issuerId,
    assertion: mockAssertion,
  };
}
