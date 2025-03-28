import type { NewRevokedToken } from "@/db/schema/auth";
import { schema } from "@/db/config";
import type { InferInsertModel } from "drizzle-orm";
import type { JSONWebKeySet } from "jose";
// Omit db import for interface file - static props don't belong in instance interface

// Define types used in DatabaseService public methods
type NewUser = Omit<
  InferInsertModel<typeof schema.users>,
  "createdAt" | "updatedAt"
>;
type NewVerificationCode = typeof schema.verificationCodes.$inferInsert;
type OAuthClientData = {
  name: string;
  redirectUris: string[];
  scopes: string[];
  grantTypes: string[];
  tokenEndpointAuthMethod: string;
  clientUri?: string;
  logoUri?: string;
  isHeadless?: boolean;
  jwks?: JSONWebKeySet;
  jwksUri?: string;
  requestObjectSigningAlg?: string;
};
type AuthCodeData = {
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  expiresAt: Date;
  codeChallenge?: string;
  codeChallengeMethod?: string;
};
type AccessTokenData = {
  token: string;
  clientId: string;
  userId: string;
  scope: string;
  expiresAt: Date;
};
type TokenMappingData = {
  oauthToken: string;
  jwtToken: string;
  expiresAt: Date;
};
type ConsentRecordData = {
  userId: string;
  clientId: string;
  scope: string;
  expiresAt?: Date;
};
type ConsentUpdateData = {
  scope: string;
  expiresAt?: Date;
};
type RefreshTokenData = {
  token: string;
  clientId: string;
  userId: string;
  scope: string;
  expiresAt: Date;
};

// Define the interface based on DatabaseService public members
export interface IDatabaseService {
  // User Management Methods
  createUser(data: NewUser): Promise<typeof schema.users.$inferSelect>;
  getUserByEmail(
    email: string,
  ): Promise<typeof schema.users.$inferSelect | undefined>;

  // Verification Code Methods
  createVerificationCode(
    data: Omit<NewVerificationCode, "id">,
  ): Promise<string>;
  getVerificationCode(
    username: string,
    code: string,
  ): Promise<typeof schema.verificationCodes.$inferSelect | undefined>;
  markCodeAsUsed(id: string): Promise<void>;
  recordVerificationAttempt(id: string, attempt: string): Promise<void>;

  // Revoked Token Methods
  revokeToken(data: Omit<NewRevokedToken, "id">): Promise<void>;
  isTokenRevoked(token: string): Promise<boolean>;
  cleanupExpiredTokens(): Promise<void>;

  // OAuth Client Methods
  createOAuthClient(
    data: OAuthClientData,
  ): Promise<{ id: string; secret: string }>;
  getOAuthClient(
    clientId: string,
  ): Promise<typeof schema.oauthClients.$inferSelect | null>;
  getOAuthClientById(
    id: string,
  ): Promise<typeof schema.oauthClients.$inferSelect | null>;
  deleteOAuthClientById(id: string): Promise<void>;

  // Authorization Code Methods
  createAuthorizationCode(data: AuthCodeData): Promise<void>;
  getAuthorizationCode(
    code: string,
  ): Promise<typeof schema.authorizationCodes.$inferSelect | null>;
  deleteAuthorizationCode(code: string): Promise<void>;
  cleanupExpiredAuthCodes(): Promise<void>;

  // OAuth Access Token Methods
  createAccessToken(data: AccessTokenData): Promise<void>;
  storeAccessToken(data: AccessTokenData): Promise<{ success: boolean }>;
  getAccessToken(token: string): Promise<unknown | undefined | null>;
  revokeAccessToken(token: string): Promise<{ success: boolean }>;

  // Token mapping methods
  storeTokenMapping(data: TokenMappingData): Promise<{ success: boolean }>;
  getTokenMappingByOAuth(
    oauthToken: string,
  ): Promise<typeof schema.tokenMappings.$inferSelect | undefined | null>;
  getTokenMappingByJWT(
    jwtToken: string,
  ): Promise<typeof schema.tokenMappings.$inferSelect | undefined | null>;
  deleteTokenMappingByOAuth(oauthToken: string): Promise<void>;
  deleteTokenMappingByJWT(jwtToken: string): Promise<void>;
  cleanupExpiredTokenMappings(): Promise<void>;

  // Consent Methods
  createConsentRecord(data: ConsentRecordData): Promise<{ id: string }>;
  getConsentRecord(
    userId: string,
    clientId: string,
  ): Promise<typeof schema.consentRecords.$inferSelect | null>;
  updateConsentRecord(
    userId: string,
    clientId: string,
    data: ConsentUpdateData,
  ): Promise<void>;
  deleteConsentRecord(userId: string, clientId: string): Promise<void>;

  // Refresh Token Methods
  createRefreshToken(data: RefreshTokenData): Promise<void>;
  getRefreshToken(token: string): Promise<unknown | null>;
  deleteRefreshTokenByToken(token: string): Promise<void>;
  deleteRefreshTokenByUserClient(
    userId: string,
    clientId: string,
  ): Promise<void>;
}
