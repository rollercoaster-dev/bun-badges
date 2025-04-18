import type { NewRevokedToken } from "@/db/schema/auth";
import type { IDatabaseService } from "@/interfaces/db.interface";

// In-memory token revocation store for testing
const revokedTokens = new Map<string, boolean>();
// In-memory user store for testing
const users = new Map<string, any>();

// Create a mock database service for testing
export class MockDatabaseService implements IDatabaseService {
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

  async getUserByEmail(email: string): Promise<any> {
    return users.get(email) || null;
  }

  // Add missing Issuer Profile methods
  async createIssuerProfile(data: any): Promise<any> {
    console.log("Mock DB: Creating issuer profile", data);
    // Simulate creation and return data, including an ID
    const issuerId = data.issuerId ?? `mock-issuer-${Date.now()}`;
    const createdData = {
      ...data,
      issuerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    // Optionally store in an in-memory map if needed for getIssuerProfileById
    // issuersMap.set(issuerId, createdData);
    return createdData;
  }

  async getIssuerProfileById(issuerId: string): Promise<any | null> {
    console.log("Mock DB: Getting issuer profile by ID", issuerId);
    // Simulate finding an issuer - return a mock object or null
    // Replace with logic to retrieve from an in-memory map if createIssuerProfile stores it
    if (issuerId.startsWith("mock-issuer-")) {
      return {
        issuerId: issuerId,
        name: "Mock Issuer Profile",
        url: "https://mock.example.com",
        email: "mock@example.com",
        ownerUserId: "mock-owner-id",
        issuerJson: { name: "Mock Issuer Profile" },
        signingPublicKey: "mock-pub-key",
        encryptedPrivateKey: "mock-enc-key",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return null;
  }

  async deleteIssuerProfileById(issuerId: string): Promise<void> {
    console.log("Mock DB: Deleting issuer profile by ID", issuerId);
    // Simulate deletion
    // Optionally remove from an in-memory map if stored
    // issuersMap.delete(issuerId);
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
    console.log("Mock DB: Cleaning up expired tokens");
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
    jwks?: unknown;
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
    console.log("Mock DB: Creating access token (placeholder)", data);
  }

  async storeAccessToken(data: {
    token: string;
    clientId: string;
    userId: string;
    scope: string;
    expiresAt: Date;
  }): Promise<{ success: boolean }> {
    console.log("Mock DB: Storing access token", data);
    revokedTokens.set(data.token, false);
    return { success: true };
  }

  async getAccessToken(token: string): Promise<unknown | undefined | null> {
    console.log("Mock DB: Getting access token", token);
    const isRevoked = revokedTokens.get(token) || token === "revoked-token";
    if (token.startsWith("valid")) {
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
    return null;
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

  // Add missing method to satisfy interface
  async deleteOAuthClientById(id: string): Promise<void> {
    console.log("Mock DB: Deleting OAuth client by ID", id);
    // No-op for mock
  }

  // Credential Methods
  async createCredential(data: any): Promise<any> {
    console.log("Mock DB: Creating credential", data);
    return { id: "mock-credential-id", ...data };
  }

  async getCredentialById(credentialId: string): Promise<any> {
    console.log("Mock DB: Getting credential by ID", credentialId);
    return { id: credentialId, status: "active", isActive: true };
  }

  async getCredentialsByIssuerId(issuerId: string): Promise<any[]> {
    console.log("Mock DB: Getting credentials by issuer ID", issuerId);
    return [{ id: "mock-credential-id", issuerId }];
  }

  async getCredentialsByRecipientId(recipientId: string): Promise<any[]> {
    console.log("Mock DB: Getting credentials by recipient ID", recipientId);
    return [{ id: "mock-credential-id", recipientId }];
  }

  async updateCredentialStatus(
    credentialId: string,
    status: string,
    reason?: string,
  ): Promise<boolean> {
    console.log(
      "Mock DB: Updating credential status",
      credentialId,
      status,
      reason,
    );
    return true;
  }

  async revokeCredential(
    credentialId: string,
    reason?: string,
  ): Promise<boolean> {
    console.log("Mock DB: Revoking credential", credentialId, reason);
    return true;
  }

  async verifyCredential(credentialId: string): Promise<any> {
    console.log("Mock DB: Verifying credential", credentialId);
    return { valid: true, checks: {}, errors: [] };
  }

  async isCredentialRevoked(credentialId: string): Promise<boolean> {
    console.log("Mock DB: Checking if credential is revoked", credentialId);
    return false;
  }
}

// Create and export a mock database instance
export const mockDb = new MockDatabaseService();
