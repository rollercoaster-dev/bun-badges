import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "bun:test";
import { TokensService, TokenStatus } from "@/services/tokens.service";
import { db } from "@/db/config";
import { tokens } from "@/db/schema/tokens.schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import "@/utils/test/integration-setup";

describe("TokensService Integration", () => {
  let tokensService: TokensService;
  let testTokenId: string;
  let testTokenHash: string;
  const testUserId = "test-user-id";
  const testClientId = "test-client-id";

  // Create the tokens table if it doesn't exist
  beforeAll(async () => {
    try {
      // Check if the tokens table exists
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM pg_tables
          WHERE schemaname = 'public'
          AND tablename = 'tokens'
        );
      `);

      const tableExists = result.rows[0]?.exists;
      if (!tableExists) {
        console.log("Creating tokens table for tests...");
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS tokens (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            token_hash TEXT NOT NULL,
            client_id TEXT,
            user_id TEXT,
            scope TEXT,
            jwt_id TEXT,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            revoked_at TIMESTAMP WITH TIME ZONE,
            revocation_reason TEXT,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          );
        `);
        console.log("✅ Tokens table created successfully");
      } else {
        console.log("Tokens table already exists");
      }
    } catch (error) {
      console.error("Error setting up tokens table:", error);
      throw error;
    }
  });

  beforeEach(async () => {
    tokensService = new TokensService();
    testTokenHash = tokensService.hashToken("test-token");

    // Clean up any existing test tokens
    try {
      await db.delete(tokens).where(eq(tokens.userId, testUserId));
    } catch (error) {
      console.error("Error cleaning up existing test tokens:", error);
    }

    // Create a test token for use in tests
    try {
      const [testToken] = await db
        .insert(tokens)
        .values({
          type: "access",
          tokenHash: testTokenHash,
          clientId: testClientId,
          userId: testUserId,
          scope: "read write",
          jwtId: "test-jwt-id",
          expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
          isActive: true,
        })
        .returning();

      testTokenId = testToken.id;
    } catch (error) {
      console.error("Error creating test token:", error);
      throw error;
    }
  });

  afterEach(async () => {
    // Clean up test tokens
    try {
      await db.delete(tokens).where(eq(tokens.userId, testUserId));
    } catch (error) {
      console.error("Error cleaning up test tokens:", error);
    }
  });

  // Clean up after all tests
  afterAll(async () => {
    try {
      // Delete all test data
      await db.delete(tokens).where(eq(tokens.userId, testUserId));
    } catch (error) {
      console.error("Error cleaning up after tests:", error);
    }
  });

  test("should create a new token", async () => {
    const tokenData = {
      type: "refresh",
      tokenHash: tokensService.hashToken("new-test-token"),
      clientId: testClientId,
      userId: testUserId,
      scope: "read",
      jwtId: "new-test-jwt-id",
      expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
    };

    const token = await tokensService.createToken(tokenData);

    expect(token).toBeDefined();
    expect(token.id).toBeDefined();
    expect(token.type).toBe("refresh");
    expect(token.tokenHash).toBe(tokenData.tokenHash);
    expect(token.clientId).toBe(testClientId);
    expect(token.userId).toBe(testUserId);
    expect(token.scope).toBe("read");
    expect(token.jwtId).toBe("new-test-jwt-id");
    expect(token.isActive).toBe(true);

    // Clean up the created token
    await db.delete(tokens).where(eq(tokens.id, token.id));
  });

  test("should get a token by ID", async () => {
    const token = await tokensService.getTokenById(testTokenId);

    expect(token).toBeDefined();
    expect(token?.id).toBe(testTokenId);
    expect(token?.type).toBe("access");
    expect(token?.tokenHash).toBe(testTokenHash);
    expect(token?.clientId).toBe(testClientId);
    expect(token?.userId).toBe(testUserId);
    expect(token?.scope).toBe("read write");
    expect(token?.jwtId).toBe("test-jwt-id");
    expect(token?.isActive).toBe(true);
  });

  test("should verify a token by hash", async () => {
    const token = await tokensService.verifyToken(testTokenHash);

    expect(token).toBeDefined();
    expect(token?.id).toBe(testTokenId);
    expect(token?.type).toBe("access");
    expect(token?.tokenHash).toBe(testTokenHash);
    expect(token?.clientId).toBe(testClientId);
    expect(token?.userId).toBe(testUserId);
    expect(token?.scope).toBe("read write");
    expect(token?.jwtId).toBe("test-jwt-id");
    expect(token?.isActive).toBe(true);
  });

  test("should revoke a token", async () => {
    await tokensService.revokeToken(testTokenId, "Test revocation");

    const token = await tokensService.getTokenById(testTokenId);
    expect(token).toBeDefined();
    expect(token?.isActive).toBe(false);
    expect(token?.revokedAt).toBeDefined();
    expect(token?.revocationReason).toBe("Test revocation");

    // Verify that the token can no longer be verified
    const verifiedToken = await tokensService.verifyToken(testTokenHash);
    expect(verifiedToken).toBeNull();
  });

  test("should get token status", async () => {
    // First check an active token
    let status = await tokensService.getTokenStatus(testTokenId);
    expect(status).toBe(TokenStatus.ACTIVE);

    // Now revoke the token and check again
    await tokensService.revokeToken(testTokenId, "Test revocation");
    status = await tokensService.getTokenStatus(testTokenId);
    expect(status).toBe(TokenStatus.REVOKED);
  });

  test("should list active tokens for a user", async () => {
    // Create a second token for the same user
    await tokensService.createToken({
      type: "refresh",
      tokenHash: tokensService.hashToken("second-test-token"),
      clientId: testClientId,
      userId: testUserId,
      scope: "read",
      jwtId: "second-test-jwt-id",
      expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
    });

    const tokens = await tokensService.listActiveTokens(testUserId);

    expect(tokens).toBeDefined();
    expect(tokens.length).toBeGreaterThanOrEqual(2);

    // Filter to only our test tokens
    const testTokens = tokens.filter((t) => t.clientId === testClientId);
    expect(testTokens.length).toBeGreaterThanOrEqual(2);

    // Check filtering by client ID
    const clientTokens = await tokensService.listActiveTokens(
      testUserId,
      testClientId,
    );
    expect(clientTokens.length).toBeGreaterThanOrEqual(2);
  });

  test("should clean up expired tokens", async () => {
    // Create an expired token
    await db.insert(tokens).values({
      type: "access",
      tokenHash: tokensService.hashToken("expired-test-token"),
      clientId: testClientId,
      userId: testUserId,
      scope: "read",
      jwtId: "expired-test-jwt-id",
      expiresAt: new Date(Date.now() - 3600000), // 1 hour in the past
      isActive: true,
    });

    // Create a revoked token
    await db
      .insert(tokens)
      .values({
        type: "access",
        tokenHash: tokensService.hashToken("revoked-test-token"),
        clientId: testClientId,
        userId: testUserId,
        scope: "read",
        jwtId: "revoked-test-jwt-id",
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        isActive: false,
        revokedAt: new Date(),
        revocationReason: "Test revocation",
      })
      .returning();

    // Run cleanup
    const count = await tokensService.cleanupExpiredTokens();

    // Should have removed at least the expired token
    expect(count).toBeGreaterThanOrEqual(1);

    // Verify the expired token is gone
    const expiredToken = await db
      .select()
      .from(tokens)
      .where(
        eq(tokens.tokenHash, tokensService.hashToken("expired-test-token")),
      );
    expect(expiredToken.length).toBe(0);
  });

  test("should hash a token", () => {
    const hash = tokensService.hashToken("test-token");

    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash.length).toBe(64); // SHA-256 hash is 64 characters in hex

    // Verify the hash is consistent
    const hash2 = tokensService.hashToken("test-token");
    expect(hash).toBe(hash2);

    // Verify different tokens produce different hashes
    const hash3 = tokensService.hashToken("different-token");
    expect(hash).not.toBe(hash3);
  });
});
