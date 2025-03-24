import { describe, test, expect, beforeEach, mock } from "bun:test";
import { OAuthController } from "@/controllers/oauth.controller";
import { DatabaseService } from "@/services/db.service";
import { createMockContext } from "@/utils/test/mock-context";
import { BadRequestError, UnauthorizedError } from "@/utils/errors";
import { nanoid } from "nanoid";
import { OAUTH_SCOPES } from "@/routes/oauth.routes";

// Mock the JWT module
mock.module("@/utils/auth/jwt", () => ({
  verifyToken: async () =>
    Promise.resolve({
      sub: "test-client",
      type: "access",
      scope: `${OAUTH_SCOPES.BADGE_READ} ${OAUTH_SCOPES.PROFILE_READ}`,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      jti: "test-token-id",
    }),
  generateToken: async () => "test-token",
  generateCode: async () => "test-auth-code",
}));

describe("OAuthController", () => {
  let controller: OAuthController;
  let dbService: DatabaseService;

  beforeEach(() => {
    dbService = {
      createOAuthClient: mock(() =>
        Promise.resolve({
          id: "test-client",
          secret: "test-secret",
          name: "Test Client",
          redirectUris: ["https://example.com/callback"],
          scope: `${OAUTH_SCOPES.BADGE_READ} ${OAUTH_SCOPES.PROFILE_READ}`,
          grantTypes: ["authorization_code"],
          tokenEndpointAuthMethod: "client_secret_basic",
        }),
      ),
      getOAuthClient: mock((clientId: string) =>
        clientId === "test-client"
          ? Promise.resolve({
              id: "test-client",
              clientId: "test-client",
              clientSecret: "test-secret",
              clientName: "Test Client",
              clientUri: "https://example.com",
              redirectUris: ["https://example.com/callback"],
              scope: `${OAUTH_SCOPES.BADGE_READ} ${OAUTH_SCOPES.PROFILE_READ}`,
              grantTypes: ["authorization_code"],
              responseTypes: ["code"],
              tokenEndpointAuthMethod: "client_secret_basic",
            })
          : Promise.resolve(null),
      ),
      createAuthorizationCode: mock(() =>
        Promise.resolve({
          code: "test-auth-code",
          clientId: "test-client",
          userId: "test-user",
          redirectUri: "https://example.com/callback",
          expiresAt: new Date(Date.now() + 300000),
          scope: `${OAUTH_SCOPES.BADGE_READ} ${OAUTH_SCOPES.PROFILE_READ}`,
        }),
      ),
      getAuthorizationCode: mock((code: string) =>
        code === "test-auth-code"
          ? Promise.resolve({
              code: "test-auth-code",
              clientId: "test-client",
              userId: "test-user",
              redirectUri: "https://example.com/callback",
              expiresAt: new Date(Date.now() + 300000),
              scope: `${OAUTH_SCOPES.BADGE_READ} ${OAUTH_SCOPES.PROFILE_READ}`,
              isUsed: false,
            })
          : Promise.resolve(null),
      ),
      deleteAuthorizationCode: mock(() => Promise.resolve()),
      isTokenRevoked: mock((_token: string) => Promise.resolve(false)),
      revokeToken: mock(() => Promise.resolve()),
    } as any;

    controller = new OAuthController(dbService);
  });

  describe("registerClient", () => {
    test("should register a new client", async () => {
      const ctx = createMockContext({
        method: "POST",
        body: {
          client_name: "Test Client",
          redirect_uris: ["https://example.com/callback"],
          scope: `${OAUTH_SCOPES.BADGE_READ} ${OAUTH_SCOPES.PROFILE_READ}`,
        },
      });

      const result = await controller.registerClient(ctx);
      expect(result.status).toBe(201);
    });

    test("should handle missing required fields", async () => {
      const ctx = createMockContext({
        method: "POST",
        body: {
          client_name: "Test Client",
        },
      });

      await expect(controller.registerClient(ctx)).rejects.toThrow(
        BadRequestError,
      );
    });
  });

  describe("authorize", () => {
    test("should render consent page for GET request", async () => {
      const ctx = createMockContext({
        method: "GET",
        query: {
          response_type: "code",
          client_id: "test-client",
          redirect_uri: "https://example.com/callback",
          scope: `${OAUTH_SCOPES.BADGE_READ} ${OAUTH_SCOPES.PROFILE_READ}`,
          state: nanoid(),
        },
      });

      const result = (await controller.authorize(ctx)) as any;

      // Check response format from mock context
      expect(result.status).toBe(200);
      expect(result.headers).toEqual({ "Content-Type": "text/html" });
      expect(typeof result.body).toBe("string");
      expect(result.body).toContain("Authorization Request");
      expect(result.body).toContain("Test Client");
      expect(result.body).toContain("https://example.com");
    });

    test("should handle POST request with user approval", async () => {
      const state = nanoid();
      const ctx = createMockContext({
        method: "POST",
        body: {
          client_id: "test-client",
          redirect_uri: "https://example.com/callback",
          scope: `${OAUTH_SCOPES.BADGE_READ} ${OAUTH_SCOPES.PROFILE_READ}`,
          state,
          response_type: "code",
          user_decision: "approve",
        },
      });

      const result = (await controller.authorize(ctx)) as any;

      // Check redirect response
      expect(result.status).toBe(302);
      expect(result.headers).toHaveProperty("Location");
      expect(result.redirect).toContain("https://example.com/callback?code=");
      expect(result.redirect).toContain(`state=${state}`);
    });

    test("should handle invalid client", async () => {
      const ctx = createMockContext({
        method: "GET",
        query: {
          response_type: "code",
          client_id: "invalid-client",
          redirect_uri: "https://example.com/callback",
          scope: `${OAUTH_SCOPES.BADGE_READ} ${OAUTH_SCOPES.PROFILE_READ}`,
          state: nanoid(),
        },
      });

      await expect(controller.authorize(ctx)).rejects.toThrow(
        UnauthorizedError,
      );
    });

    test("should handle invalid redirect URI", async () => {
      const ctx = createMockContext({
        method: "GET",
        query: {
          response_type: "code",
          client_id: "test-client",
          redirect_uri: "https://malicious.com/callback",
          scope: `${OAUTH_SCOPES.BADGE_READ} ${OAUTH_SCOPES.PROFILE_READ}`,
          state: nanoid(),
        },
      });

      await expect(controller.authorize(ctx)).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe("token", () => {
    test("should exchange authorization code for tokens", async () => {
      const ctx = createMockContext({
        method: "POST",
        body: {
          grant_type: "authorization_code",
          code: "test-auth-code",
          redirect_uri: "https://example.com/callback",
          client_id: "test-client",
          client_secret: "test-secret",
        },
      });

      const result = await controller.token(ctx);
      const resultData = await result.json();

      expect(result.status).toBe(200);
      expect(resultData).toHaveProperty("access_token");
      expect(resultData).toHaveProperty("refresh_token");
      expect(resultData).toHaveProperty("token_type", "Bearer");
      expect(resultData).toHaveProperty("expires_in");
    });

    test("should handle invalid authorization code", async () => {
      const ctx = createMockContext({
        method: "POST",
        body: {
          grant_type: "authorization_code",
          code: "invalid-code",
          redirect_uri: "https://example.com/callback",
          client_id: "test-client",
          client_secret: "test-secret",
        },
      });

      await expect(controller.token(ctx)).rejects.toThrow(UnauthorizedError);
    });

    test("should handle invalid client credentials", async () => {
      const ctx = createMockContext({
        method: "POST",
        body: {
          grant_type: "authorization_code",
          code: "test-auth-code",
          redirect_uri: "https://example.com/callback",
          client_id: "test-client",
          client_secret: "wrong-secret",
        },
      });

      await expect(controller.token(ctx)).rejects.toThrow(UnauthorizedError);
    });

    test("should handle invalid grant type", async () => {
      const ctx = createMockContext({
        method: "POST",
        body: {
          grant_type: "invalid_grant",
          code: "test-auth-code",
          redirect_uri: "https://example.com/callback",
          client_id: "test-client",
          client_secret: "test-secret",
        },
      });

      await expect(controller.token(ctx)).rejects.toThrow(BadRequestError);
    });
  });

  describe("introspect", () => {
    test("should return active status for valid token", async () => {
      const ctx = createMockContext({
        method: "POST",
        body: {
          token: "test-token",
        },
        headers: {
          Authorization: "Bearer test-client",
        },
      });

      const result = await controller.introspect(ctx);
      const resultData = await result.json();

      expect(resultData).toHaveProperty("active", true);
      expect(resultData).toHaveProperty("client_id", "test-client");
      expect(resultData).toHaveProperty(
        "scope",
        `${OAUTH_SCOPES.BADGE_READ} ${OAUTH_SCOPES.PROFILE_READ}`,
      );
    });

    test("should return inactive status for revoked token", async () => {
      const ctx = createMockContext({
        method: "POST",
        body: {
          token: "revoked-token",
        },
        headers: {
          Authorization: "Bearer test-client",
        },
      });

      // Mock the token as revoked
      dbService.isTokenRevoked = mock(() => Promise.resolve(true));

      const result = await controller.introspect(ctx);
      const resultData = await result.json();

      expect(resultData).toHaveProperty("active", false);
    });
  });

  describe("revoke", () => {
    test("should revoke a valid token", async () => {
      const ctx = createMockContext({
        method: "POST",
        body: {
          token: "test-token",
        },
        headers: {
          Authorization: "Bearer test-client",
        },
      });

      const result = await controller.revoke(ctx);
      expect(result.status).toBe(200);
      expect(dbService.revokeToken).toHaveBeenCalledWith(
        expect.objectContaining({
          token: "test-token",
          type: "access",
          username: "test-client",
        }),
      );
    });

    test("should handle already revoked token", async () => {
      const ctx = createMockContext({
        method: "POST",
        body: {
          token: "revoked-token",
        },
        headers: {
          Authorization: "Bearer test-client",
        },
      });

      // Mock the token as already revoked
      dbService.isTokenRevoked = mock(() => Promise.resolve(true));

      const result = await controller.revoke(ctx);
      expect(result.status).toBe(200);
    });
  });
});
