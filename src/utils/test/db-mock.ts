import type { NewRevokedToken } from "@/db/schema/auth";
import type { DatabaseService as RealDatabaseService } from "@services/db.service";

// In-memory token revocation store for testing
const revokedTokens = new Map<string, boolean>();

// Create a mock database service for testing
export class MockDatabaseService implements RealDatabaseService {
  // Static db property
  static db = {} as Record<string, unknown>;

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
  }) {
    return {
      id: "mock-client-id",
      secret: "mock-client-secret",
      name: data.name,
      redirectUris: data.redirectUris,
      scopes: data.scopes,
      grantTypes: data.grantTypes,
      tokenEndpointAuthMethod: data.tokenEndpointAuthMethod,
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
}

// Create and export a mock database instance
export const mockDb = new MockDatabaseService();
