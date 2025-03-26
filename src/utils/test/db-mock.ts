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
    isHeadless?: boolean;
  }) {
    return {
      id: "mock-client-id",
      secret: "mock-client-secret",
      name: data.name,
      redirectUris: data.redirectUris,
      scopes: data.scopes,
      grantTypes: data.grantTypes,
      tokenEndpointAuthMethod: data.tokenEndpointAuthMethod,
      isHeadless: data.isHeadless || false,
    };
  }

  async getOAuthClient(clientId: string) {
    return {
      id: "mock-client-uuid",
      clientId,
      clientSecret: "mock-client-secret",
      clientName: "Mock Client",
      clientUri: "https://example.com",
      redirectUris: ["https://example.com/callback"],
      scope: "openid profile",
      grantTypes: ["authorization_code"],
      responseTypes: ["code"],
      tokenEndpointAuthMethod: "client_secret_basic",
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      isHeadless: false,
    };
  }

  // Authorization Code Methods
  async createAuthorizationCode(data: {
    code: string;
    clientId: string;
    redirectUri: string;
    scope: string;
    expiresAt: Date;
  }) {
    return data;
  }

  async getAuthorizationCode(_code: string) {
    return {
      id: "mock-auth-code-id",
      code: _code,
      clientId: "mock-client-uuid",
      userId: "anonymous",
      redirectUri: "https://example.com/callback",
      scope: "openid profile",
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
      isUsed: false,
    };
  }

  async deleteAuthorizationCode(_code: string): Promise<void> {
    // No-op for mock
  }

  async cleanupExpiredAuthCodes(): Promise<void> {
    // No-op for mock
  }

  async getOAuthClientById(id: string) {
    return {
      id,
      clientId: "mock-client-id",
      clientSecret: "mock-client-secret",
      clientName: "Mock Client",
      clientUri: "https://example.com",
      redirectUris: ["https://example.com/callback"],
      scope: "openid profile",
      grantTypes: ["authorization_code"],
      responseTypes: ["code"],
      tokenEndpointAuthMethod: "client_secret_basic",
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      isHeadless: false,
    };
  }

  // OAuth Access Token Methods
  async storeAccessToken(data: {
    token: string;
    clientId: string;
    userId: string;
    scope: string;
    expiresAt: Date;
  }) {
    // Store token in revokedTokens map with false (not revoked)
    revokedTokens.set(data.token, false);
    return { success: true };
  }

  async getAccessToken(token: string) {
    return {
      id: "mock-token-id",
      token,
      clientId: "mock-client-id",
      userId: "mock-user-id",
      scope: "openid profile",
      expiresAt: new Date(Date.now() + 3600000),
      isRevoked: token === "revoked-token",
      createdAt: new Date(),
    };
  }

  async revokeAccessToken(token: string) {
    revokedTokens.set(token, true);
    return { success: true };
  }
}

// Create and export a mock database instance
export const mockDb = new MockDatabaseService();
