import type { NewRevokedToken } from "@/db/schema/auth";
import type { DatabaseService as RealDatabaseService } from "@services/db.service";

// In-memory token revocation store for testing
const revokedTokens = new Map<string, boolean>();
// In-memory user store for testing
const users = new Map<string, any>();

// Create a mock database service for testing
export class MockDatabaseService implements RealDatabaseService {
  // Static db property
  static db = {} as Record<string, unknown>;

  // User Methods
  async createUser(data: any) {
    const user = {
      userId: `user-${Date.now()}`,
      email: data.email,
      passwordHash: data.passwordHash,
      name: data.name || null,
      oauthProvider: data.oauthProvider || null,
      oauthSubject: data.oauthSubject || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.set(data.email, user);
    return user;
  }

  async getUserByEmail(email: string) {
    return users.get(email) || null;
  }

  // Verification Code Methods
  async createVerificationCode(
    _data: Record<string, unknown>,
  ): Promise<string> {
    return "mock-verification-code-id";
  }

  async getVerificationCode(username: string, code: string) {
    return {
      id: "mock-verification-code-id",
      username,
      code,
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
      usedAt: null,
      attempts: [],
    };
  }

  async markCodeAsUsed(_id: string): Promise<void> {
    // No-op for mock
  }

  async recordVerificationAttempt(
    _id: string,
    _attempt: string,
  ): Promise<void> {
    // No-op for mock
  }

  // Revoked Token Methods
  async revokeToken(data: Omit<NewRevokedToken, "id">): Promise<void> {
    revokedTokens.set(data.token, true);
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    return token === "revoked-token" || revokedTokens.has(token);
  }

  async cleanupExpiredTokens(): Promise<void> {
    // No-op for mock
  }

  // OAuth Client Methods
  async createOAuthClient(data: {
    name: string;
    redirectUris: string[];
    scopes: string[];
    grantTypes: string[];
    tokenEndpointAuthMethod: string;
    clientUri?: string;
    logoUri?: string;
    isHeadless?: boolean;
    jwks?: any;
    jwksUri?: string;
    requestObjectSigningAlg?: string;
  }): Promise<{ id: string; secret: string }> {
    const clientId = `mock-client-${Date.now()}`;
    const clientSecret = `mock-secret-${Date.now()}`;
    const newClient = {
      id: `mock-client-uuid-${Date.now()}`,
      clientId: clientId,
      clientSecret: clientSecret,
      name: data.name,
      clientUri: data.clientUri || `https://client.example.com/${clientId}`,
      redirectUris: data.redirectUris,
      scopes: data.scopes,
      grantTypes: data.grantTypes,
      responseTypes: ["code"],
      tokenEndpointAuthMethod: data.tokenEndpointAuthMethod,
      logoUri: data.logoUri || null,
      jwks: data.jwks || null,
      jwksUri: data.jwksUri || null,
      requestObjectSigningAlg: data.requestObjectSigningAlg || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      isHeadless: data.isHeadless || false,
    };
    console.log("Mock DB: Created client", newClient);
    return { id: newClient.id, secret: newClient.clientSecret };
  }

  async getOAuthClient(clientId: string): Promise<any | null> {
    if (clientId === "mock-client-id") {
      return {
        id: "mock-client-uuid-123",
        clientId: "mock-client-id",
        clientSecret: "mock-client-secret",
        clientName: "Mock Client",
        clientUri: "https://client.example.com/mock-client-id",
        logoUri: "https://client.example.com/logo.png",
        redirectUris: ["https://example.com/callback"],
        scope: "openid profile offline_access",
        grantTypes: ["authorization_code", "refresh_token"],
        responseTypes: ["code"],
        tokenEndpointAuthMethod: "client_secret_basic",
        jwks: null,
        jwksUri: null,
        requestObjectSigningAlg: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        isHeadless: false,
      };
    }
    return null;
  }

  // Authorization Code Methods
  async createAuthorizationCode(data: {
    code: string;
    clientId: string;
    userId: string;
    redirectUri: string;
    scope: string;
    expiresAt: Date;
    codeChallenge?: string;
    codeChallengeMethod?: string;
  }): Promise<void> {
    console.log("Mock DB: Storing auth code", data);
  }

  async getAuthorizationCode(code: string): Promise<any | null> {
    if (code === "mock-auth-code") {
      return {
        id: "mock-auth-code-id-123",
        code: code,
        clientId: "mock-client-uuid-123",
        userId: "mock-user-id-456",
        redirectUri: "https://example.com/callback",
        scope: "openid profile offline_access",
        expiresAt: new Date(Date.now() + 600000),
        isUsed: false,
        codeChallenge: "mock-challenge",
        codeChallengeMethod: "S256",
        createdAt: new Date(),
      };
    }
    return null;
  }

  async useAuthorizationCode(code: string): Promise<any | null> {
    console.log("Mock DB: Attempting to use auth code", code);
    if (code === "mock-auth-code") {
      return {
        id: "mock-auth-code-id-123",
        code: code,
        clientId: "mock-client-uuid-123",
        userId: "mock-user-id-456",
        redirectUri: "https://example.com/callback",
        scope: "openid profile offline_access",
        expiresAt: new Date(Date.now() + 600000),
        isUsed: false,
        codeChallenge: "mock-challenge",
        codeChallengeMethod: "S256",
        createdAt: new Date(),
      };
    }
    return null;
  }

  async deleteAuthorizationCode(_code: string): Promise<void> {
    console.log("Mock DB: Deleting auth code", _code);
  }

  async cleanupExpiredAuthCodes(): Promise<void> {
    console.log("Mock DB: Cleaning up expired auth codes");
  }

  // OAuth Access Token Methods
  async createAccessToken(data: {
    token: string;
    clientId: string;
    userId: string;
    scope: string;
    expiresAt: Date;
  }): Promise<void> {
    console.log("Mock DB: Creating access token", data);
    revokedTokens.set(data.token, false);
  }

  async storeAccessToken(data: {
    token: string;
    clientId: string;
    userId: string;
    scope: string;
    expiresAt: Date;
  }): Promise<{ success: boolean }> {
    console.log("Mock DB: Storing access token (storeAccessToken)", data);
    revokedTokens.set(data.token, false);
    return { success: true };
  }

  async getAccessToken(token: string) {
    console.log("Mock DB: Getting access token", token);
    const isRevoked = revokedTokens.get(token) || token === "revoked-token";
    return {
      id: "mock-token-id",
      token,
      clientId: "mock-client-uuid-123",
      userId: "mock-user-id-456",
      scope: "openid profile offline_access",
      expiresAt: new Date(Date.now() + 3600000),
      isRevoked: isRevoked,
      createdAt: new Date(),
    };
  }

  async revokeAccessToken(token: string) {
    revokedTokens.set(token, true);
    return { success: true };
  }

  // Token mapping methods
  async storeTokenMapping(_data: {
    oauthToken: string;
    jwtToken: string;
    expiresAt: Date;
  }) {
    return { success: true };
  }

  async getTokenMappingByOAuth(oauthToken: string) {
    return {
      id: "mock-token-mapping-id",
      oauthToken,
      jwtToken: "mock-jwt-token",
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
    };
  }

  async getTokenMappingByJWT(jwtToken: string) {
    return {
      id: "mock-token-mapping-id",
      oauthToken: "mock-oauth-token",
      jwtToken,
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
    };
  }

  async deleteTokenMappingByOAuth(_oauthToken: string): Promise<void> {
    // No-op for mock
  }

  async deleteTokenMappingByJWT(_jwtToken: string): Promise<void> {
    // No-op for mock
  }

  async cleanupExpiredTokenMappings(): Promise<void> {
    // No-op for mock
  }

  // Re-add getOAuthClientById (using the DB ID/UUID)
  async getOAuthClientById(id: string): Promise<any | null> {
    // Similar to getOAuthClient, but uses the database ID
    if (id === "mock-client-uuid-123") {
      // Return the same detailed mock client object
      return {
        id: "mock-client-uuid-123",
        clientId: "mock-client-id",
        clientSecret: "mock-client-secret",
        clientName: "Mock Client",
        clientUri: "https://client.example.com/mock-client-id",
        logoUri: "https://client.example.com/logo.png",
        redirectUris: ["https://example.com/callback"],
        scope: "openid profile offline_access",
        grantTypes: ["authorization_code", "refresh_token"],
        responseTypes: ["code"],
        tokenEndpointAuthMethod: "client_secret_basic",
        jwks: null,
        jwksUri: null,
        requestObjectSigningAlg: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        isHeadless: false,
      };
    }
    return null;
  }

  // --- Method Mocks (Corrected Signatures) ---

  async createConsentRecord(data: {
    userId: string;
    clientId: string;
    scope: string;
    expiresAt?: Date;
  }): Promise<{ id: string }> {
    console.log("Mock DB: Creating consent record", data);
    const mockConsentId = `mock-consent-id-${Date.now()}`;
    // In a real mock, store consent data keyed by mockConsentId or userId+clientId
    return { id: mockConsentId }; // Return the mock ID
  }

  async getConsentRecord(
    userId: string,
    clientId: string,
  ): Promise<any | null> {
    console.log("Mock DB: Getting consent record for", userId, clientId);
    if (userId === "mock-user-id-456" && clientId === "mock-client-uuid-123") {
      return {
        id: "mock-consent-id-123",
        userId: userId,
        clientId: clientId,
        scope: "openid profile offline_access",
        grantedAt: new Date(),
        expiresAt: null,
      };
    }
    return null;
  }

  async updateConsentRecord(
    userId: string,
    clientId: string,
    data: {
      scope: string;
      expiresAt?: Date;
    },
  ): Promise<void> {
    console.log(
      "Mock DB: Updating consent record for user/client",
      userId,
      clientId,
      data,
    );
    // No-op for mock - In real mock, find record by userId+clientId and update scope/expiresAt
  }

  async deleteConsentRecord(userId: string, clientId: string): Promise<void> {
    console.log("Mock DB: Deleting consent record for", userId, clientId);
  }

  async createRefreshToken(data: {
    token: string;
    clientId: string;
    userId: string;
    scope: string;
    expiresAt: Date;
  }): Promise<void> {
    console.log("Mock DB: Creating refresh token", data);
  }

  async getRefreshToken(token: string): Promise<any | null> {
    console.log("Mock DB: Getting refresh token", token);
    if (token === "mock-refresh-token") {
      return {
        id: "mock-refresh-token-id-123",
        token: token,
        clientId: "mock-client-uuid-123",
        userId: "mock-user-id-456",
        scope: "openid profile offline_access",
        expiresAt: new Date(Date.now() + 2592000000), // 30 days
        createdAt: new Date(),
        isRevoked: false,
      };
    }
    return null;
  }

  async deleteRefreshTokenByToken(token: string): Promise<void> {
    console.log("Mock DB: Deleting refresh token by token", token);
    // No-op for mock
  }

  async deleteRefreshTokenByUserClient(
    userId: string,
    clientId: string,
  ): Promise<void> {
    console.log(
      "Mock DB: Deleting refresh token by user/client",
      userId,
      clientId,
    );
    // No-op for mock
  }
}

// Create and export a mock database instance
export const mockDb = new MockDatabaseService();
