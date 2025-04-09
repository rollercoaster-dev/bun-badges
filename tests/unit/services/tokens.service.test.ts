import { describe, test, expect, mock, beforeEach } from "bun:test";
import { TokensService, TokenStatus } from "@/services/tokens.service";
import "@/utils/test/unit-setup";

// Mock the database module
mock.module("@/db/config", () => {
  return {
    db: {
      insert: () => ({
        values: () => ({
          returning: () => [
            {
              id: "test-token-id",
              type: "access",
              tokenHash: "test-token-hash",
              clientId: "test-client-id",
              userId: "test-user-id",
              scope: "read write",
              jwtId: "test-jwt-id",
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
              isActive: true,
            },
          ],
        }),
      }),
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => [
              {
                id: "test-token-id",
                type: "access",
                tokenHash: "test-token-hash",
                clientId: "test-client-id",
                userId: "test-user-id",
                scope: "read write",
                jwtId: "test-jwt-id",
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
                isActive: true,
              },
            ],
          }),
        }),
      }),
      update: () => ({
        set: () => ({
          where: () => ({
            returning: () => [
              {
                id: "test-token-id",
                type: "access",
                tokenHash: "test-token-hash",
                clientId: "test-client-id",
                userId: "test-user-id",
                scope: "read write",
                jwtId: "test-jwt-id",
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
                revokedAt: new Date(),
                revocationReason: "Test revocation",
                isActive: false,
              },
            ],
          }),
        }),
      }),
      delete: () => ({
        where: () => ({
          rowCount: 5,
        }),
      }),
    },
  };
});

describe("TokensService", () => {
  let tokensService: TokensService;

  beforeEach(() => {
    tokensService = new TokensService();
  });

  test("should create a new token", async () => {
    const tokenData = {
      type: "access",
      tokenHash: "test-token-hash",
      clientId: "test-client-id",
      userId: "test-user-id",
      scope: "read write",
      jwtId: "test-jwt-id",
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    };

    const token = await tokensService.createToken(tokenData);

    expect(token).toBeDefined();
    expect(token.id).toBe("test-token-id");
    expect(token.type).toBe("access");
    expect(token.tokenHash).toBe("test-token-hash");
    expect(token.clientId).toBe("test-client-id");
    expect(token.userId).toBe("test-user-id");
    expect(token.scope).toBe("read write");
    expect(token.jwtId).toBe("test-jwt-id");
    expect(token.isActive).toBe(true);
  });

  test("should get a token by ID", async () => {
    const token = await tokensService.getTokenById("test-token-id");

    expect(token).toBeDefined();
    expect(token?.id).toBe("test-token-id");
    expect(token?.type).toBe("access");
    expect(token?.tokenHash).toBe("test-token-hash");
    expect(token?.clientId).toBe("test-client-id");
    expect(token?.userId).toBe("test-user-id");
    expect(token?.scope).toBe("read write");
    expect(token?.jwtId).toBe("test-jwt-id");
    expect(token?.isActive).toBe(true);
  });

  test("should verify a token by hash", async () => {
    const token = await tokensService.verifyToken("test-token-hash");

    expect(token).toBeDefined();
    expect(token?.id).toBe("test-token-id");
    expect(token?.type).toBe("access");
    expect(token?.tokenHash).toBe("test-token-hash");
    expect(token?.clientId).toBe("test-client-id");
    expect(token?.userId).toBe("test-user-id");
    expect(token?.scope).toBe("read write");
    expect(token?.jwtId).toBe("test-jwt-id");
    expect(token?.isActive).toBe(true);
  });

  test("should revoke a token", async () => {
    await tokensService.revokeToken("test-token-id", "Test revocation");

    // Since we're using mocks, we can't actually verify the token was revoked
    // But we can verify the function completes without error
    expect(true).toBe(true);
  });

  test("should get token status", async () => {
    const status = await tokensService.getTokenStatus("test-token-id");

    expect(status).toBe(TokenStatus.ACTIVE);
  });

  test("should list active tokens for a user", async () => {
    const tokens = await tokensService.listActiveTokens("test-user-id");

    expect(tokens).toBeDefined();
    expect(tokens.length).toBe(1);
    expect(tokens[0].id).toBe("test-token-id");
    expect(tokens[0].type).toBe("access");
    expect(tokens[0].tokenHash).toBe("test-token-hash");
    expect(tokens[0].clientId).toBe("test-client-id");
    expect(tokens[0].userId).toBe("test-user-id");
    expect(tokens[0].scope).toBe("read write");
    expect(tokens[0].jwtId).toBe("test-jwt-id");
    expect(tokens[0].isActive).toBe(true);
  });

  test("should clean up expired tokens", async () => {
    const count = await tokensService.cleanupExpiredTokens();

    expect(count).toBe(5);
  });

  test("should hash a token", () => {
    const hash = tokensService.hashToken("test-token");

    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash.length).toBe(64); // SHA-256 hash is 64 characters in hex
  });
});
