import { mock } from "bun:test";

/**
 * Creates mock JWT functions for testing
 * This approach avoids directly modifying the module exports which can cause "readonly property" errors
 */
export function mockJwt() {
  // Create mock implementations
  const generateCode = mock(() => Promise.resolve("test-auth-code"));
  const generateToken = mock(() => Promise.resolve("test-token"));
  const verifyToken = mock(() => ({
    sub: "test-user-id",
    role: "user",
    clientId: "test-client-id",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  }));

  // Return the mocks for use in tests
  return {
    generateCode,
    generateToken,
    verifyToken,
  };
}

/**
 * Helper to mock the db service for OAuth tests
 */
export function mockOAuthDbService() {
  // In-memory storage for test data
  const authCodes: Record<string, any> = {};
  const clients: Record<string, any> = {};
  const revokedTokens: Set<string> = new Set();

  return {
    // OAuth client methods
    getOAuthClient: mock((clientId: string) => {
      // Return the client if it exists in our in-memory storage
      if (clients[clientId]) {
        return Promise.resolve(clients[clientId]);
      }

      // For testing, we'll return a mock client for specific test IDs
      if (clientId === "test-client-id" || clientId === "test-client-secret") {
        return Promise.resolve({
          id: "mock-client-uuid",
          clientId: "test-client-id",
          clientSecret: "test-client-secret",
          redirectUris: ["https://example.com/callback"],
          scope: "badge:read profile:read",
          clientName: "Test Client",
          grantTypes: ["authorization_code", "refresh_token"],
          tokenEndpointAuthMethod: "client_secret_basic",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          clientUri: "https://example.com",
        });
      }

      return Promise.resolve(null);
    }),

    // Authorization code methods
    saveAuthorizationCode: mock((code) => {
      authCodes[code.code] = code;
      return Promise.resolve(code);
    }),

    createAuthorizationCode: mock((codeData) => {
      const code = {
        id: "mock-auth-code-id",
        code: codeData.code || "test-auth-code",
        clientId: codeData.clientId,
        userId: "test-user-id", // Default test user ID
        redirectUri: codeData.redirectUri,
        scope: codeData.scope,
        expiresAt: codeData.expiresAt || new Date(Date.now() + 600000),
        isUsed: false,
        createdAt: new Date(),
      };

      // Store in our in-memory storage
      authCodes[code.code] = code;

      return Promise.resolve(code);
    }),

    getAuthorizationCode: mock((code) => {
      // Return from in-memory if available
      if (authCodes[code]) {
        return Promise.resolve(authCodes[code]);
      }

      // For testing purposes
      if (code === "test-auth-code") {
        return Promise.resolve({
          id: "mock-auth-code-id",
          code: "test-auth-code",
          clientId: "mock-client-uuid",
          userId: "test-user-id",
          redirectUri: "https://example.com/callback",
          scope: "badge:read profile:read",
          expiresAt: new Date(Date.now() + 600000),
          isUsed: false,
          createdAt: new Date(),
        });
      }

      return Promise.resolve(null);
    }),

    deleteAuthorizationCode: mock((code) => {
      if (authCodes[code]) {
        delete authCodes[code];
      }
      return Promise.resolve();
    }),

    // Token methods
    isTokenRevoked: mock((token) => {
      return Promise.resolve(revokedTokens.has(token));
    }),

    revokeToken: mock(({ token }) => {
      revokedTokens.add(token);
      return Promise.resolve();
    }),

    // Client registration
    createOAuthClient: mock((client) => {
      const newClient = {
        id: "mock-client-uuid",
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
        ...client,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      clients[newClient.clientId] = newClient;

      return Promise.resolve(newClient);
    }),
  };
}

/**
 * OAuth client authentication middleware mock
 * This can be used to bypass client authentication in tests
 * @returns A mock client authentication middleware
 */
export function mockClientAuthentication() {
  // Set up a mock for client authentication
  const authenticateClient = mock((req: Request) => {
    // Get the Authorization header
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      // Extract from body if using form parameters
      const body = req.json ? req.json() : null;
      if (
        body &&
        typeof body === "object" &&
        "client_id" in body &&
        "client_secret" in body
      ) {
        return Promise.resolve({
          clientId: body.client_id,
          authenticated: true,
        });
      }

      return Promise.resolve({
        clientId: null,
        authenticated: false,
        error: "Missing authorization header",
      });
    }

    // Handle Basic auth
    if (authHeader.startsWith("Basic ")) {
      const base64Credentials = authHeader.split(" ")[1];
      const credentials = atob(base64Credentials).split(":");
      const clientId = credentials[0];
      const clientSecret = credentials[1];

      // For testing, accept all test credentials
      if (
        clientId === "test-client-id" &&
        clientSecret === "test-client-secret"
      ) {
        return Promise.resolve({
          clientId,
          authenticated: true,
        });
      }
    }

    // For Bearer tokens in test contexts, simply return the token as client ID
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      return Promise.resolve({
        clientId: token,
        authenticated: true,
      });
    }

    return Promise.resolve({
      clientId: null,
      authenticated: false,
      error: "Invalid credentials",
    });
  });

  // Create a middleware function that uses the mock
  return {
    authenticateClient,
    middleware: async (ctx: any, next: () => Promise<void>) => {
      const result = await authenticateClient(ctx.req);
      if (result.authenticated) {
        ctx.client = { id: result.clientId };
        return next();
      }

      throw new Error("Client authentication failed");
    },
  };
}

/**
 * JWT test utilities
 *
 * This module provides mock JWT functions for testing authentication.
 */

/**
 * Mock token payload structure
 */
export interface MockTokenPayload {
  sub: string; // Subject (username)
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
  type: string; // Token type (access, refresh)
}

/**
 * Mock JWT verification for testing
 * Returns predefined results for test tokens
 */
export function mockVerifyToken(
  token: string,
  type: "access" | "refresh" = "access",
): MockTokenPayload {
  // Test cases for different tokens
  switch (token) {
    case "test-valid-token":
      return {
        sub: "test@example.com",
        exp: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
        iat: Math.floor(Date.now() / 1000) - 60, // Issued 1 minute ago
        type: "access",
      };

    case "test-refresh-token":
      return {
        sub: "test@example.com",
        exp: Math.floor(Date.now() / 1000) + 86400, // Valid for 24 hours
        iat: Math.floor(Date.now() / 1000) - 60, // Issued 1 minute ago
        type: "refresh",
      };

    case "test-admin-token":
      return {
        sub: "admin@example.com",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000) - 60,
        type: "access",
      };

    case "test-expired-token":
      throw new Error("Token expired");

    case "revoked-token":
      // This should be caught by the isTokenRevoked check before verification
      return {
        sub: "revoked@example.com",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000) - 3600,
        type: "access",
      };

    case "invalid-token":
    default:
      throw new Error("Invalid token");
  }
}
