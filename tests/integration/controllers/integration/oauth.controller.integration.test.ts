import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test";
import { OAuthController } from "@controllers/oauth.controller";
import { seedTestData, clearTestData } from "@/utils/test/db-helpers";
import { createMockContext } from "@/utils/test/mock-context";
import {
  mockJwt,
  mockOAuthDbService,
  mockClientAuthentication,
} from "@/utils/test/jwt-test-utils";

// Define response types for better type checking
interface MockResponse {
  status?: number;
  data?: any;
  body?: any; // Keep for backwards compatibility
  headers?: Record<string, string>;
  redirect?: string;
  json?: () => Promise<any>;
}

describe("OAuthController Integration Tests", () => {
  let controller: OAuthController;
  let testData: any;
  let mockDb: any;
  let mockAuth: any;
  let mockJwtUtils: any;

  beforeEach(async () => {
    // Create test data (but we'll use mocks for most interactions)
    testData = await seedTestData();

    // Setup mock DB service
    mockDb = mockOAuthDbService();

    // Setup mock JWT utilities
    mockJwtUtils = mockJwt();

    // Setup mock client auth
    mockAuth = mockClientAuthentication();

    // Create a new controller with our mock DB
    controller = new OAuthController(mockDb);

    // Replace the internal DB with our mock one
    controller["db"] = mockDb;

    // Use mock.module to intercept the JWT functions
    mock.module("@utils/auth/jwt", () => ({
      generateToken: mockJwtUtils.generateToken,
      verifyToken: mockJwtUtils.verifyToken,
    }));

    // Mock the auth code generator
    mock.module("@utils/auth/code", () => ({
      generateCode: mockJwtUtils.generateCode,
    }));
  });

  afterEach(async () => {
    // Clean up any real data that might have been created
    await clearTestData();
    mock.restore();
  });

  describe("registerClient", () => {
    it("should register a new client", async () => {
      const ctx = createMockContext({
        body: {
          client_name: "Test Integration Client",
          redirect_uris: ["https://example.com/callback"],
          scope: "badge:read profile:read",
        },
      });

      const result = (await controller.registerClient(
        ctx as any,
      )) as unknown as MockResponse;

      expect(result.status).toBe(201);
      expect(result.data?.client_id).toBeDefined();
      expect(result.data?.client_name).toBe("Test Integration Client");
      expect(mockDb.createOAuthClient.mock.calls.length).toBe(1);
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
      // Override the getOAuthClient to match expected client_id
      mockDb.getOAuthClient = mock(() =>
        Promise.resolve({
          id: "mock-client-uuid",
          clientId: "test-client-id",
          clientSecret: "test-client-secret",
          redirectUris: ["https://example.com/callback"],
          scope: "badge:read profile:read",
          clientName: "Test Integration Client",
          grantTypes: ["authorization_code", "refresh_token"],
          tokenEndpointAuthMethod: "client_secret_basic",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          clientUri: "https://example.com",
        }),
      );

      const ctx = createMockContext({
        query: {
          response_type: "code",
          client_id: "test-client-id",
          redirect_uri: "https://example.com/callback",
          scope: "badge:read profile:read",
          state: "test-state",
        },
      });

      const result = (await controller.authorize(
        ctx as any,
      )) as unknown as MockResponse;

      expect(result.body || result.data).toContain("Authorization Request");
      expect(result.body || result.data).toContain("Test Integration Client");
      expect(result.body || result.data).toContain("badge:read");
    });

    it("should handle authorization approval", async () => {
      // Setup mock DB methods to match client ID
      mockDb.getOAuthClient = mock(() =>
        Promise.resolve({
          id: "mock-client-uuid",
          clientId: "test-client-id",
          clientSecret: "test-client-secret",
          redirectUris: ["https://example.com/callback"],
          scope: "badge:read profile:read",
          clientName: "Test Integration Client",
          grantTypes: ["authorization_code"],
          tokenEndpointAuthMethod: "client_secret_basic",
          isActive: true,
        }),
      );

      // Set the return value for generateCode mock
      mockJwtUtils.generateCode.mock.returnValue =
        Promise.resolve("test-auth-code");

      const ctx = createMockContext({
        method: "POST",
        body: {
          client_id: "test-client-id",
          redirect_uri: "https://example.com/callback",
          scope: "badge:read profile:read",
          state: "test-state",
          response_type: "code",
          user_decision: "approve",
          user_id: testData.userId,
        },
      });

      const response = await controller.authorize(ctx as any);

      // Cast to MockResponse to access redirect property
      const mockResponse = response as any;
      expect(mockResponse.redirect).toBeDefined();
      expect(mockResponse.redirect).toContain("https://example.com/callback");
      expect(mockResponse.redirect).toContain("code=test-auth-code");
      expect(mockResponse.redirect).toContain("state=test-state");
    });

    it("should handle authorization denial", async () => {
      // Setup mock DB methods to match client ID
      mockDb.getOAuthClient = mock(() =>
        Promise.resolve({
          id: "mock-client-uuid",
          clientId: "test-client-id",
          clientSecret: "test-client-secret",
          redirectUris: ["https://example.com/callback"],
          scope: "badge:read profile:read",
          clientName: "Test Integration Client",
          grantTypes: ["authorization_code"],
          tokenEndpointAuthMethod: "client_secret_basic",
          isActive: true,
        }),
      );

      const ctx = createMockContext({
        method: "POST",
        body: {
          client_id: "test-client-id",
          redirect_uri: "https://example.com/callback",
          scope: "badge:read profile:read",
          state: "test-state",
          response_type: "code",
          user_decision: "deny",
          user_id: testData.userId,
        },
      });

      const result = (await controller.authorize(
        ctx as any,
      )) as unknown as MockResponse;

      expect(result.redirect).toContain("error=access_denied");
      expect(result.redirect).toContain("state=test-state");
    });
  });

  describe("token", () => {
    it("should exchange authorization code for tokens", async () => {
      const tokenCtx = createMockContext({
        method: "POST",
        body: {
          grant_type: "authorization_code",
          code: "test-auth-code",
          redirect_uri: "https://example.com/callback",
          client_id: "test-client-id",
          client_secret: "test-client-secret",
        },
      });

      // Make sure our mock DB returns the right auth code
      mockDb.getAuthorizationCode = mock(() => {
        return Promise.resolve({
          id: "mock-auth-code-id",
          code: "test-auth-code",
          clientId: "mock-client-uuid",
          userId: testData.userId,
          redirectUri: "https://example.com/callback",
          scope: "badge:read profile:read",
          expiresAt: new Date(Date.now() + 600000),
          isUsed: false,
          createdAt: new Date(),
        });
      });

      // Make sure our mock verifies the right client
      mockDb.getOAuthClient = mock(() => {
        return Promise.resolve({
          id: "mock-client-uuid",
          clientId: "test-client-id",
          clientSecret: "test-client-secret",
          redirectUris: ["https://example.com/callback"],
          scope: "badge:read profile:read",
          clientName: "Test Client",
          grantTypes: ["authorization_code"],
          tokenEndpointAuthMethod: "client_secret_basic",
          isActive: true,
        });
      });

      // Set the expected return value for generateToken
      mockJwtUtils.generateToken.mock.returnValue =
        Promise.resolve("test-token");

      const response = await controller.token(tokenCtx as any);
      const responseData = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(responseData.access_token).toBe("test-token");
      expect(responseData.token_type).toBe("Bearer");
      expect(responseData.scope).toBe("badge:read profile:read");
    });
  });

  describe("introspect", () => {
    it("should return active status for valid token", async () => {
      // Set the expected return value for verifyToken
      mockJwtUtils.verifyToken.mock.returnValue = Promise.resolve({
        sub: "test-user-id",
        scope: "badge:read profile:read",
        client_id: "test-client-id",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      // Make sure our mock verifies the right client
      mockDb.getOAuthClient = mock(() => {
        return Promise.resolve({
          id: "mock-client-uuid",
          clientId: "test-client-id",
          clientSecret: "test-client-secret",
          redirectUris: ["https://example.com/callback"],
          scope: "badge:read profile:read",
          clientName: "Test Client",
          grantTypes: ["authorization_code"],
          tokenEndpointAuthMethod: "client_secret_basic",
          isActive: true,
        });
      });

      const introspectCtx = createMockContext({
        method: "POST",
        body: {
          token: "test-token",
          client_id: "test-client-id",
          client_secret: "test-client-secret",
        },
        headers: {
          Authorization: "Bearer test-client-id", // Add authorization header
        },
      });

      const response = await controller.introspect(introspectCtx as any);
      const introspectData = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(introspectData.active).toBe(true);
    });
  });

  describe("revoke", () => {
    it("should revoke a valid token", async () => {
      // Set the expected return value for verifyToken
      mockJwtUtils.verifyToken.mock.returnValue = Promise.resolve({
        sub: "test-client-id", // Match client ID expected
        scope: "badge:read profile:read",
        client_id: "test-client-id",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      // Make sure our mock verifies the right client
      mockDb.getOAuthClient = mock(() => {
        return Promise.resolve({
          id: "mock-client-uuid",
          clientId: "test-client-id",
          clientSecret: "test-client-secret",
          redirectUris: ["https://example.com/callback"],
          scope: "badge:read profile:read",
          clientName: "Test Client",
          grantTypes: ["authorization_code"],
          tokenEndpointAuthMethod: "client_secret_basic",
          isActive: true,
        });
      });

      const revokeCtx = createMockContext({
        method: "POST",
        body: {
          token: "test-token",
          client_id: "test-client-id",
          client_secret: "test-client-secret",
          token_type_hint: "access_token",
        },
        headers: {
          Authorization: "Bearer test-client-id", // Add authorization header
        },
      });

      const response = await controller.revoke(revokeCtx as any);

      expect(response.status).toBe(200);
    });
  });
});
