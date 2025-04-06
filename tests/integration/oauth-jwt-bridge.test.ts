import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "bun:test";
import logger from "@/utils/logger";
import { OAuthJWTBridge } from "@/utils/auth/oauth-jwt-bridge";
import { DatabaseService } from "@/services/db.service";
import { mock } from "bun:test";

// Mock functions
const mockGenerateToken = mock((payload: any) => {
  // Generate a mock JWT with the payload embedded
  return Promise.resolve(`mock-jwt-${JSON.stringify(payload)}`);
});

const mockVerifyToken = mock((token: string) => {
  // Extract the payload from our mock token format
  if (token.startsWith("mock-jwt-")) {
    try {
      const payloadStr = token.substring("mock-jwt-".length);
      return Promise.resolve(JSON.parse(payloadStr));
    } catch (e) {
      return Promise.reject(new Error("Invalid token format"));
    }
  }
  return Promise.reject(new Error("Invalid token"));
});

// Mock database service for testing
class MockDbService {
  private tokenMappings: Map<string, any> = new Map();
  private oauthTokens: Map<string, any> = new Map();

  async storeTokenMapping(data: {
    oauthToken: string;
    jwtToken: string;
    expiresAt: Date;
  }) {
    this.tokenMappings.set(data.oauthToken, {
      oauthToken: data.oauthToken,
      jwtToken: data.jwtToken,
      expiresAt: data.expiresAt,
      createdAt: new Date(),
    });
    return { success: true };
  }

  async getTokenMappingByOAuth(oauthToken: string) {
    return this.tokenMappings.get(oauthToken);
  }

  async getTokenMappingByJWT(jwtToken: string) {
    // Find the mapping where jwtToken matches
    for (const [_, mapping] of this.tokenMappings.entries()) {
      if (mapping.jwtToken === jwtToken) {
        return mapping;
      }
    }
    return undefined;
  }

  async deleteTokenMappingByOAuth(oauthToken: string) {
    this.tokenMappings.delete(oauthToken);
    return { success: true };
  }

  async deleteTokenMappingByJWT(jwtToken: string) {
    // Find and delete the mapping where jwtToken matches
    for (const [oauthToken, mapping] of this.tokenMappings.entries()) {
      if (mapping.jwtToken === jwtToken) {
        this.tokenMappings.delete(oauthToken);
        return { success: true };
      }
    }
    return { success: false };
  }

  async getAccessToken(token: string) {
    return this.oauthTokens.get(token);
  }

  async revokeAccessToken(token: string) {
    const accessToken = this.oauthTokens.get(token);
    if (accessToken) {
      accessToken.isRevoked = true;
      this.oauthTokens.set(token, accessToken);
    }
    return { success: true };
  }

  async revokeToken(_: {
    token: string;
    expiresAt: Date;
    type: string;
    username: string;
  }) {
    // In a real implementation, this would add to the revoked_tokens table
    return { success: true };
  }

  // Helper method for tests to add a mock OAuth token
  addMockOAuthToken(token: string, data: any) {
    this.oauthTokens.set(token, {
      token,
      clientId: data.clientId,
      userId: data.userId,
      scope: data.scope,
      expiresAt: data.expiresAt,
      isRevoked: false,
      createdAt: new Date(),
    });
  }
}

describe("OAuthJWTBridge Integration Tests", () => {
  let bridge: OAuthJWTBridge;
  let mockDb: MockDbService;

  // Set up before all tests
  beforeAll(() => {
    logger.info("Starting OAuth JWT Bridge integration tests");

    // Mock the JWT module
    mock.module("@/utils/auth/jwt", () => ({
      generateToken: mockGenerateToken,
      verifyToken: mockVerifyToken,
      // Add any other functions from the module that might be needed
    }));
  });

  // Set up before each test
  beforeEach(() => {
    // Create a fresh mock DB for each test
    mockDb = new MockDbService();

    // Create a bridge instance with our mock DB
    bridge = new OAuthJWTBridge(mockDb as unknown as DatabaseService);
  });

  // Clean up after each test
  afterEach(() => {
    // Reset mocks
    mockGenerateToken.mockClear();
    mockVerifyToken.mockClear();
  });

  // Clean up after all tests
  afterAll(() => {
    logger.info("Completed OAuth JWT Bridge integration tests");
    mock.restore();
  });

  test("should convert OAuth token to JWT token", async () => {
    // Test data
    const oauthToken = "test-oauth-token";
    const clientId = "test-client-id";
    const userId = "test-user-id";
    const scope = "badge:read badge:create";

    // Call the method under test
    const jwtToken = await bridge.convertOAuthToJWT(
      oauthToken,
      clientId,
      userId,
      scope,
    );

    // Verify the JWT was generated with the right payload
    expect(mockGenerateToken).toHaveBeenCalledTimes(1);
    expect(mockGenerateToken.mock.calls[0][0]).toEqual({
      sub: userId,
      type: "access",
      scope,
      client_id: clientId,
      oauth_token: oauthToken,
    });

    // Verify the token mapping was stored
    const mapping = await mockDb.getTokenMappingByOAuth(oauthToken);
    expect(mapping).toBeDefined();
    expect(mapping.oauthToken).toBe(oauthToken);
    expect(mapping.jwtToken).toBe(jwtToken);
  });

  test("should validate OAuth scopes correctly", async () => {
    // Set up test data
    const oauthToken = "test-valid-oauth-token";
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour in the future

    // Add a mock OAuth token to our database
    mockDb.addMockOAuthToken(oauthToken, {
      clientId: "test-client",
      userId: "test-user",
      scope: "badge:read badge:create profile:read",
      expiresAt,
    });

    // Test with valid scopes
    const resultValid = await bridge.validateOAuthScopes(oauthToken, [
      "badge:read",
      "profile:read",
    ]);
    expect(resultValid).toBe(true);

    // Test with invalid scopes
    const resultInvalid = await bridge.validateOAuthScopes(oauthToken, [
      "badge:read",
      "admin:access",
    ]);
    expect(resultInvalid).toBe(false);

    // Test with non-existent token
    const resultNonexistent = await bridge.validateOAuthScopes(
      "non-existent-token",
      ["badge:read"],
    );
    expect(resultNonexistent).toBe(false);

    // Test with expired token
    const expiredToken = "test-expired-oauth-token";
    const expiredDate = new Date(Date.now() - 1000); // 1 second in the past
    mockDb.addMockOAuthToken(expiredToken, {
      clientId: "test-client",
      userId: "test-user",
      scope: "badge:read badge:create profile:read",
      expiresAt: expiredDate,
    });

    const resultExpired = await bridge.validateOAuthScopes(expiredToken, [
      "badge:read",
    ]);
    expect(resultExpired).toBe(false);
  });

  test("should get JWT payload from OAuth token", async () => {
    // Set up test data
    const oauthToken = "test-oauth-for-jwt";
    const jwtToken =
      'mock-jwt-{"sub":"test-user","type":"access","scope":"badge:read"}';
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    // Store a token mapping
    await mockDb.storeTokenMapping({
      oauthToken,
      jwtToken,
      expiresAt,
    });

    // Get the JWT payload
    const payload = await bridge.getJWTFromOAuthToken(oauthToken);

    // Verify the payload
    expect(payload).toBeDefined();
    expect(payload?.sub).toBe("test-user");
    expect(payload?.type).toBe("access");
    expect(payload?.scope).toBe("badge:read");

    // Test with non-existent token
    const nonExistentPayload =
      await bridge.getJWTFromOAuthToken("non-existent-token");
    expect(nonExistentPayload).toBeNull();
  });

  test("should revoke both OAuth and JWT tokens", async () => {
    // Set up test data
    const oauthToken = "test-oauth-to-revoke";
    const jwtToken = "mock-jwt-token-to-revoke";
    const userId = "test-user-id";
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    // Add a mock OAuth token
    mockDb.addMockOAuthToken(oauthToken, {
      clientId: "test-client",
      userId,
      scope: "badge:read",
      expiresAt,
    });

    // Store a token mapping
    await mockDb.storeTokenMapping({
      oauthToken,
      jwtToken,
      expiresAt,
    });

    // Revoke the tokens
    await bridge.revokeOAuthAndJWT(oauthToken);

    // Verify the OAuth token was revoked
    const accessToken = await mockDb.getAccessToken(oauthToken);
    expect(accessToken.isRevoked).toBe(true);

    // Verify the mapping was deleted
    const mapping = await mockDb.getTokenMappingByOAuth(oauthToken);
    expect(mapping).toBeUndefined();
  });

  test("should create JWT for client credentials grant", async () => {
    // Test data
    const clientId = "test-client-id";
    const scopes = ["badge:read", "profile:read"];

    // Call the method under test
    const jwtToken = await bridge.createClientCredentialsJWT(clientId, scopes);

    // Verify the JWT was generated with the right payload
    expect(mockGenerateToken).toHaveBeenCalledTimes(1);
    expect(mockGenerateToken.mock.calls[0][0]).toEqual({
      sub: clientId,
      type: "access",
      scope: scopes.join(" "),
      is_client_credentials: true,
    });

    // Verify the JWT token was returned
    expect(jwtToken).toBeDefined();
  });
});
