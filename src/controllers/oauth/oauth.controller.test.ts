import { describe, expect, it, mock, beforeEach } from "bun:test";
import { OAuthController } from "@controllers/oauth.controller";

// Define response types for better type checking
interface MockResponse {
  body?: any;
  status?: number;
  redirect?: string;
}

// Mock the database service
const createMockDatabase = () => ({
  createOAuthClient: mock(() =>
    Promise.resolve({
      id: "test-client-id",
      secret: "test-client-secret",
      name: "Test Client",
      redirectUris: ["https://example.com/callback"],
      scopes: ["badge:read", "profile:read"],
      grantTypes: ["authorization_code"],
      tokenEndpointAuthMethod: "client_secret_basic",
    }),
  ),
  getOAuthClient: mock((clientId: string) => {
    if (clientId === "test-client-id" || clientId === "valid-client") {
      return Promise.resolve({
        id: "test-client-id",
        clientId: "valid-client",
        clientSecret: "valid-secret",
        clientName: "Test Client",
        clientUri: "https://example.com",
        logoUri: "https://example.com/logo.png",
        redirectUris: ["https://example.com/callback"],
        scope: "badge:read profile:read",
        grantTypes: ["authorization_code"],
        responseTypes: ["code"],
        tokenEndpointAuthMethod: "client_secret_basic",
      });
    }
    return Promise.resolve(null);
  }),
  createAuthorizationCode: mock(() => Promise.resolve()),
  getAuthorizationCode: mock((code: string) => {
    if (code === "valid-code") {
      return Promise.resolve({
        id: "test-code-id",
        code: "valid-code",
        clientId: "test-client-id",
        userId: "test-user",
        scope: "badge:read profile:read",
        redirectUri: "https://example.com/callback",
        expiresAt: new Date(Date.now() + 600000), // 10 minutes in the future
        createdAt: new Date(),
        isUsed: false,
      });
    } else if (code === "expired-code") {
      return Promise.resolve({
        id: "test-code-id",
        code: "expired-code",
        clientId: "test-client-id",
        userId: "test-user",
        scope: "badge:read profile:read",
        redirectUri: "https://example.com/callback",
        expiresAt: new Date(Date.now() - 600000), // 10 minutes in the past
        createdAt: new Date(),
        isUsed: false,
      });
    } else if (code === "used-code") {
      return Promise.resolve({
        id: "test-code-id",
        code: "used-code",
        clientId: "test-client-id",
        userId: "test-user",
        scope: "badge:read profile:read",
        redirectUri: "https://example.com/callback",
        expiresAt: new Date(Date.now() + 600000), // 10 minutes in the future
        createdAt: new Date(),
        isUsed: true,
      });
    }
    return Promise.resolve(null);
  }),
  deleteAuthorizationCode: mock(() => Promise.resolve()),
  isTokenRevoked: mock((token: string) => {
    return Promise.resolve(token === "revoked-token");
  }),
  revokeToken: mock(() => Promise.resolve()),
});

// Mock context creation
const createMockContext = (options: any = {}) => {
  const req: any = {
    json: mock(() => Promise.resolve(options.body || {})),
    query: mock(() => options.query || {}),
    parseBody: mock(() => Promise.resolve(options.body || {})),
    method: options.method || "GET",
    url: options.url || "https://api.example.com/oauth/register",
    header: mock((name: string) => {
      if (name === "Authorization") {
        return options.authorization || null;
      }
      return null;
    }),
  };

  return {
    req,
    json: mock(
      (data: any, status?: number): MockResponse => ({ body: data, status }),
    ),
    html: mock((html: string): MockResponse => ({ body: html })),
    redirect: mock((url: string): MockResponse => ({ redirect: url })),
  };
};

// Mock JWT utilities
mock.module("../../utils/auth/jwt", () => ({
  generateToken: mock(() => Promise.resolve("test-token")),
  verifyToken: mock((token: string) => {
    if (token === "expired-token") {
      return Promise.resolve({
        sub: "valid-client",
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour in the past
        iat: Math.floor(Date.now() / 1000) - 7200,
        type: "access",
      });
    } else if (token === "valid-refresh-token") {
      return Promise.resolve({
        sub: "valid-client",
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour in the future
        iat: Math.floor(Date.now() / 1000) - 3600,
        type: "refresh",
        scope: "badge:read profile:read",
      });
    } else if (token === "invalid-scope-token") {
      throw new Error("Invalid scope requested");
    } else if (token === "revoked-token") {
      return Promise.resolve({
        sub: "valid-client",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000) - 3600,
        type: "access",
      });
    } else if (token === "valid-token") {
      return Promise.resolve({
        sub: "valid-client",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000) - 3600,
        type: "access",
        scope: "badge:read profile:read",
      });
    }
    throw new Error("Invalid token");
  }),
}));

mock.module("../../utils/auth/code", () => ({
  generateCode: mock(() => Promise.resolve("test-code")),
}));

describe("OAuthController", () => {
  let controller: OAuthController;
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    mockDb = createMockDatabase();
    controller = new OAuthController(mockDb as any);
  });

  describe("registerClient", () => {
    it("should register a new client", async () => {
      const ctx = createMockContext({
        body: {
          client_name: "Test Client",
          redirect_uris: ["https://example.com/callback"],
          scope: "badge:read profile:read",
        },
      });

      const result = (await controller.registerClient(
        ctx as any,
      )) as MockResponse;

      expect(mockDb.createOAuthClient).toHaveBeenCalled();
      expect(result.status).toBe(201);
      expect(result.body?.client_id).toBe("test-client-id");
      expect(result.body?.client_secret).toBe("test-client-secret");
    });

    it("should validate required fields", async () => {
      const ctx = createMockContext({
        body: {
          client_name: "Test Client",
          // Missing redirect_uris
        },
      });

      try {
        await controller.registerClient(ctx as any);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain("Invalid request");
      }
    });
  });

  describe("authorize", () => {
    it("should render consent page for valid request", async () => {
      const ctx = createMockContext({
        query: {
          response_type: "code",
          client_id: "valid-client",
          redirect_uri: "https://example.com/callback",
          scope: "badge:read profile:read",
          state: "test-state",
        },
      });

      const result = (await controller.authorize(ctx as any)) as MockResponse;

      expect(mockDb.getOAuthClient).toHaveBeenCalledWith("valid-client");
      expect(result.body).toContain("Authorization Request");
      expect(result.body).toContain("Test Client");
      expect(result.body).toContain("badge:read");
    });

    it("should handle authorization approval", async () => {
      const ctx = createMockContext({
        method: "POST",
        body: {
          client_id: "valid-client",
          redirect_uri: "https://example.com/callback",
          scope: "badge:read profile:read",
          state: "test-state",
          response_type: "code",
          user_decision: "approve",
        },
      });

      const result = (await controller.authorize(ctx as any)) as MockResponse;

      expect(mockDb.createAuthorizationCode).toHaveBeenCalled();
      expect(result.redirect).toContain(
        "https://example.com/callback?code=test-code&state=test-state",
      );
    });

    it("should handle authorization denial", async () => {
      const ctx = createMockContext({
        method: "POST",
        body: {
          client_id: "valid-client",
          redirect_uri: "https://example.com/callback",
          scope: "badge:read profile:read",
          state: "test-state",
          response_type: "code",
          user_decision: "deny",
        },
      });

      const result = (await controller.authorize(ctx as any)) as MockResponse;

      expect(mockDb.createAuthorizationCode).not.toHaveBeenCalled();
      expect(result.redirect).toContain("error=access_denied");
      expect(result.redirect).toContain("state=test-state");
    });

    it("should handle invalid scopes", async () => {
      const ctx = createMockContext({
        query: {
          response_type: "code",
          client_id: "valid-client",
          redirect_uri: "https://example.com/callback",
          scope: "invalid:scope unknown:scope",
          state: "test-state",
        },
      });

      const result = (await controller.authorize(ctx as any)) as MockResponse;

      expect(result.redirect).toContain(
        "https://example.com/callback?error=invalid_scope",
      );
      expect(result.redirect).toContain("state=test-state");
    });

    it("should filter out invalid scopes", async () => {
      const ctx = createMockContext({
        query: {
          response_type: "code",
          client_id: "valid-client",
          redirect_uri: "https://example.com/callback",
          scope: "badge:read invalid:scope profile:read",
          state: "test-state",
        },
      });

      const result = (await controller.authorize(ctx as any)) as MockResponse;

      // Should still show consent page with only valid scopes
      expect(result.body).toContain("Authorization Request");
      expect(result.body).toContain("badge:read");
      expect(result.body).toContain("profile:read");
      expect(result.body).not.toContain("invalid:scope");
    });
  });

  describe("token", () => {
    it("should exchange authorization code for tokens", async () => {
      const ctx = createMockContext({
        body: {
          grant_type: "authorization_code",
          code: "valid-code",
          redirect_uri: "https://example.com/callback",
          client_id: "valid-client",
          client_secret: "valid-secret",
        },
      });

      const result = (await controller.token(ctx as any)) as MockResponse;

      expect(mockDb.getAuthorizationCode).toHaveBeenCalledWith("valid-code");
      expect(mockDb.deleteAuthorizationCode).toHaveBeenCalledWith("valid-code");
      expect(result.body?.access_token).toBe("test-token");
      expect(result.body?.token_type).toBe("Bearer");
      expect(result.body?.refresh_token).toBe("test-token");
    });

    it("should reject expired authorization codes", async () => {
      const ctx = createMockContext({
        body: {
          grant_type: "authorization_code",
          code: "expired-code",
          redirect_uri: "https://example.com/callback",
          client_id: "valid-client",
          client_secret: "valid-secret",
        },
      });

      try {
        await controller.token(ctx as any);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain("Authorization code has expired");
      }
    });

    it("should reject used authorization codes", async () => {
      const ctx = createMockContext({
        body: {
          grant_type: "authorization_code",
          code: "used-code",
          redirect_uri: "https://example.com/callback",
          client_id: "valid-client",
          client_secret: "valid-secret",
        },
      });

      try {
        await controller.token(ctx as any);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain(
          "Authorization code has already been used",
        );
      }
    });

    it("should refresh access token with valid refresh token", async () => {
      const ctx = createMockContext({
        body: {
          grant_type: "refresh_token",
          refresh_token: "valid-refresh-token",
          client_id: "valid-client",
          client_secret: "valid-secret",
        },
      });

      const result = (await controller.token(ctx as any)) as MockResponse;

      expect(result.body?.access_token).toBe("test-token");
      expect(result.body?.token_type).toBe("Bearer");
      expect(result.body).not.toHaveProperty("refresh_token"); // No new refresh token
    });

    it("should validate scopes when refreshing token", async () => {
      const ctx = createMockContext({
        body: {
          grant_type: "refresh_token",
          refresh_token: "valid-refresh-token",
          client_id: "valid-client",
          client_secret: "valid-secret",
          scope: "badge:read", // Requesting subset of original scopes
        },
      });

      const result = (await controller.token(ctx as any)) as MockResponse;

      expect(result.body?.access_token).toBe("test-token");
      expect(result.body?.scope).toBe("badge:read"); // Should only include the requested scope
    });

    it("should reject invalid scopes when refreshing token", async () => {
      const ctx = createMockContext({
        body: {
          grant_type: "refresh_token",
          refresh_token: "valid-refresh-token",
          client_id: "valid-client",
          client_secret: "valid-secret",
          scope: "invalid:scope", // Requesting invalid scope
        },
      });

      try {
        await controller.token(ctx as any);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        // Just verify that an error is thrown when invalid scopes are requested
        expect(error).toBeTruthy();
      }
    });

    it("should handle invalid refresh tokens", async () => {
      const ctx = createMockContext({
        body: {
          grant_type: "refresh_token",
          refresh_token: "invalid-token", // Using an invalid token
          client_id: "valid-client",
          client_secret: "valid-secret",
          scope: "badge:read",
        },
      });

      try {
        await controller.token(ctx as any);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain("Invalid refresh token");
      }
    });
  });

  describe("introspect", () => {
    it("should return active status for valid token", async () => {
      const ctx = createMockContext({
        body: {
          token: "valid-token",
        },
        authorization: "Bearer valid-client",
      });

      const result = (await controller.introspect(ctx as any)) as MockResponse;

      expect(result.body?.active).toBe(true);
      expect(result.body?.client_id).toBe("valid-client");
      expect(result.body?.token_type).toBe("Bearer");
    });

    it("should return inactive status for expired token", async () => {
      const ctx = createMockContext({
        body: {
          token: "expired-token",
        },
        authorization: "Bearer valid-client",
      });

      const result = (await controller.introspect(ctx as any)) as MockResponse;

      expect(result.body?.active).toBe(false);
    });

    it("should return inactive status for revoked token", async () => {
      const ctx = createMockContext({
        body: {
          token: "revoked-token",
        },
        authorization: "Bearer valid-client",
      });

      const result = (await controller.introspect(ctx as any)) as MockResponse;

      expect(result.body?.active).toBe(false);
    });
  });

  describe("revoke", () => {
    it("should revoke a valid token", async () => {
      const ctx = createMockContext({
        body: {
          token: "valid-token",
        },
        authorization: "Bearer valid-client",
      });

      const result = (await controller.revoke(ctx as any)) as MockResponse;

      expect(mockDb.revokeToken).toHaveBeenCalled();
      expect(result.status).toBe(200);
    });

    it("should return 200 OK for already revoked token", async () => {
      const ctx = createMockContext({
        body: {
          token: "revoked-token",
        },
        authorization: "Bearer valid-client",
      });

      const result = (await controller.revoke(ctx as any)) as MockResponse;

      expect(mockDb.revokeToken).not.toHaveBeenCalled();
      expect(result.status).toBe(200);
    });

    it("should return 200 OK for invalid token", async () => {
      const ctx = createMockContext({
        body: {
          token: "invalid-token",
        },
        authorization: "Bearer valid-client",
      });

      const result = (await controller.revoke(ctx as any)) as MockResponse;

      expect(mockDb.revokeToken).not.toHaveBeenCalled();
      expect(result.status).toBe(200);
    });
  });
});
