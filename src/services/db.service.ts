import { and, eq, gt, lt } from "drizzle-orm";
import { db, schema } from "@/db/config";
import { nanoid } from "nanoid";
import { JSONWebKeySet } from "jose";
import logger from "@/utils/logger";
import { type Logger as PinoLogger } from "pino";
import type { IDatabaseService } from "@/interfaces/db.interface";

const {
  verificationCodes,
  revokedTokens,
  oauthClients,
  authorizationCodes,
  tokenMappings,
  users,
  oauthAccessTokens,
  consentRecords,
  oauthRefreshTokens,
  issuerProfiles,
} = schema;

import type { NewRevokedToken } from "@/db/schema/auth";
import type { InferInsertModel } from "drizzle-orm";
import type { NewIssuer, Issuer } from "@/db/schema/issuers";

// Define generateRandomString inline
const generateRandomString = (length: number): string => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

type NewUser = Omit<InferInsertModel<typeof users>, "createdAt" | "updatedAt">;

export type NewOAuthClient = typeof oauthClients.$inferInsert & {
  jwks?: JSONWebKeySet;
};

export class DatabaseService implements IDatabaseService {
  private logger: PinoLogger;

  // Re-export the db instance for direct access when needed
  static db = db;

  constructor() {
    this.logger = logger.child({ context: "DatabaseService" });
  }

  // User Management Methods
  async createUser(data: NewUser) {
    try {
      const [user] = await db
        .insert(users)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return user;
    } catch (error) {
      this.logger.error(error, "Failed to create user:");
      throw error;
    }
  }

  async getUserByEmail(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user;
  }

  async deleteUserById(userId: string): Promise<void> {
    try {
      this.logger.info({ userId }, "Deleting user...");
      const result = await db.delete(users).where(eq(users.userId, userId));
      if (result.rowCount === 0) {
        this.logger.warn({ userId }, "Attempted to delete non-existent user.");
        // Decide if throwing an error is appropriate, or just logging.
        // For test cleanup, logging might be sufficient.
      }
      this.logger.info({ userId }, "User deleted successfully.");
    } catch (error) {
      this.logger.error({ userId, error }, "Failed to delete user:");
      // Re-throw the error to signal failure
      throw error;
    }
  }

  // Verification Code Methods
  async createVerificationCode(
    data: Omit<schema.NewVerificationCode, "id">,
  ): Promise<string> {
    const [result] = await db
      .insert(verificationCodes)
      .values(data)
      .returning({ id: verificationCodes.id });
    return result.id;
  }

  async getVerificationCode(username: string, code: string) {
    const [result] = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.username, username),
          eq(verificationCodes.code, code),
          gt(verificationCodes.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return result;
  }

  async markCodeAsUsed(id: string) {
    await db
      .update(verificationCodes)
      .set({ usedAt: new Date() })
      .where(eq(verificationCodes.id, id));
  }

  async recordVerificationAttempt(id: string, attempt: string) {
    const [code] = await db
      .select({ attempts: verificationCodes.attempts })
      .from(verificationCodes)
      .where(eq(verificationCodes.id, id));

    const attempts = code?.attempts || [];
    attempts.push(attempt);

    await db
      .update(verificationCodes)
      .set({ attempts })
      .where(eq(verificationCodes.id, id));
  }

  // Revoked Token Methods
  async revokeToken(data: Omit<NewRevokedToken, "id">): Promise<void> {
    await db.insert(revokedTokens).values(data);
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(revokedTokens)
      .where(
        and(
          eq(revokedTokens.token, token),
          gt(revokedTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return !!result;
  }

  async cleanupExpiredTokens(): Promise<void> {
    await db
      .delete(revokedTokens)
      .where(lt(revokedTokens.expiresAt, new Date()));
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
    // JAR fields
    jwks?: JSONWebKeySet;
    jwksUri?: string;
    requestObjectSigningAlg?: string;
  }): Promise<{ id: string; secret: string }> {
    const clientId = nanoid(16);
    const clientSecret = generateRandomString(32);

    await db.insert(oauthClients).values({
      clientId,
      clientSecret,
      clientName: data.name,
      clientUri: data.clientUri || null,
      logoUri: data.logoUri || null,
      redirectUris: data.redirectUris,
      scope: data.scopes.join(" "),
      grantTypes: data.grantTypes,
      responseTypes: ["code"],
      tokenEndpointAuthMethod: data.tokenEndpointAuthMethod,
      isHeadless: data.isHeadless || false,
      // Add JAR fields
      jwks: data.jwks || null,
      jwksUri: data.jwksUri || null,
      requestObjectSigningAlg: data.requestObjectSigningAlg || null,
    });

    return {
      id: clientId,
      secret: clientSecret,
    };
  }

  async getOAuthClient(clientId: string) {
    const clients = await db
      .select()
      .from(oauthClients)
      .where(eq(oauthClients.clientId, clientId));
    return clients.length > 0 ? clients[0] : null;
  }

  async getOAuthClientById(id: string) {
    const clients = await db
      .select()
      .from(oauthClients)
      .where(eq(oauthClients.id, id));
    return clients.length > 0 ? clients[0] : null;
  }

  async deleteOAuthClientById(id: string) {
    await db.delete(oauthClients).where(eq(oauthClients.id, id));
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
  }) {
    try {
      await db.insert(schema.authorizationCodes).values({
        code: data.code,
        clientId: data.clientId,
        userId: data.userId,
        redirectUri: data.redirectUri,
        scope: data.scope,
        expiresAt: data.expiresAt,
        codeChallenge: data.codeChallenge,
        codeChallengeMethod: data.codeChallengeMethod,
      });
    } catch (error) {
      this.logger.error(error, "Failed to create authorization code:");
      throw new Error("Failed to create authorization code");
    }
  }

  async getAuthorizationCode(code: string) {
    const codes = await db
      .select()
      .from(authorizationCodes)
      .where(eq(authorizationCodes.code, code));
    return codes.length > 0 ? codes[0] : null;
  }

  async deleteAuthorizationCode(code: string) {
    await db
      .delete(authorizationCodes)
      .where(eq(authorizationCodes.code, code));
  }

  async cleanupExpiredAuthCodes() {
    await db
      .delete(authorizationCodes)
      .where(lt(authorizationCodes.expiresAt, new Date()));
  }

  // OAuth Access Token Methods
  async storeAccessToken(data: {
    token: string;
    clientId: string;
    userId: string;
    scope: string;
    expiresAt: Date;
  }): Promise<{ success: boolean }> {
    try {
      await db.insert(oauthAccessTokens).values(data);
      return { success: true };
    } catch (error) {
      this.logger.error(error, "Failed to store access token:");
      return { success: false };
    }
  }

  async getAccessToken(
    token: string,
  ): Promise<typeof oauthAccessTokens.$inferSelect | null> {
    try {
      const [result] = await db
        .select()
        .from(oauthAccessTokens)
        .where(
          and(
            eq(oauthAccessTokens.token, token),
            gt(oauthAccessTokens.expiresAt, new Date()),
          ),
        )
        .limit(1);
      return result || null;
    } catch (error) {
      this.logger.error(error, "Failed to retrieve access token:");
      throw new Error("Failed to retrieve access token");
    }
  }

  async revokeAccessToken(token: string): Promise<{ success: boolean }> {
    try {
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      await this.revokeToken({
        token,
        expiresAt,
        username: "unknown_oauth_user",
        type: "oauth_access",
      });
      return { success: true };
    } catch (error) {
      this.logger.error(error, "Failed to explicitly revoke access token:");
      return { success: false };
    }
  }

  // Token mapping methods

  /**
   * Store a mapping between OAuth token and JWT token
   */
  async storeTokenMapping(data: {
    oauthToken: string;
    jwtToken: string;
    expiresAt: Date;
  }) {
    await db.insert(tokenMappings).values({
      oauthToken: data.oauthToken,
      jwtToken: data.jwtToken,
      expiresAt: data.expiresAt,
      createdAt: new Date(),
    });

    return { success: true };
  }

  /**
   * Get a token mapping by OAuth token
   */
  async getTokenMappingByOAuth(oauthToken: string) {
    const [result] = await db
      .select()
      .from(tokenMappings)
      .where(
        and(
          eq(tokenMappings.oauthToken, oauthToken),
          gt(tokenMappings.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return result;
  }

  /**
   * Get a token mapping by JWT token
   */
  async getTokenMappingByJWT(jwtToken: string) {
    const [result] = await db
      .select()
      .from(tokenMappings)
      .where(
        and(
          eq(tokenMappings.jwtToken, jwtToken),
          gt(tokenMappings.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return result;
  }

  /**
   * Delete a token mapping by OAuth token
   */
  async deleteTokenMappingByOAuth(oauthToken: string) {
    await db
      .delete(tokenMappings)
      .where(eq(tokenMappings.oauthToken, oauthToken));
  }

  /**
   * Delete a token mapping by JWT token
   */
  async deleteTokenMappingByJWT(jwtToken: string) {
    await db.delete(tokenMappings).where(eq(tokenMappings.jwtToken, jwtToken));
  }

  /**
   * Clean up expired token mappings
   */
  async cleanupExpiredTokenMappings() {
    await db
      .delete(tokenMappings)
      .where(lt(tokenMappings.expiresAt, new Date()));
  }

  // OAuth Consent Record Methods

  /**
   * Creates a new consent record for a user and client
   */
  async createConsentRecord(data: {
    userId: string;
    clientId: string;
    scope: string;
    expiresAt?: Date;
  }): Promise<{ id: string }> {
    try {
      const [result] = await db
        .insert(consentRecords)
        .values(data)
        .returning({ id: consentRecords.id });
      return result;
    } catch (error) {
      this.logger.error(error, "Failed to create consent record:");
      throw new Error("Failed to create consent record");
    }
  }

  /**
   * Gets a consent record for a user and client
   */
  async getConsentRecord(
    userId: string,
    clientId: string,
  ): Promise<typeof consentRecords.$inferSelect | null> {
    try {
      const [result] = await db
        .select()
        .from(consentRecords)
        .where(
          and(
            eq(consentRecords.userId, userId),
            eq(consentRecords.clientId, clientId),
          ),
        )
        .limit(1);
      return result || null;
    } catch (error) {
      this.logger.error(error, "Failed to retrieve consent record:");
      throw new Error("Failed to retrieve consent record");
    }
  }

  /**
   * Updates a consent record
   */
  async updateConsentRecord(
    userId: string,
    clientId: string,
    data: {
      scope: string;
      expiresAt?: Date;
    },
  ) {
    try {
      await db
        .update(consentRecords)
        .set(data)
        .where(
          and(
            eq(consentRecords.userId, userId),
            eq(consentRecords.clientId, clientId),
          ),
        );
    } catch (error) {
      this.logger.error(error, "Failed to update consent record:");
      throw new Error("Failed to update consent record");
    }
  }

  /**
   * Deletes a consent record
   */
  async deleteConsentRecord(userId: string, clientId: string) {
    try {
      await db
        .delete(consentRecords)
        .where(
          and(
            eq(consentRecords.userId, userId),
            eq(consentRecords.clientId, clientId),
          ),
        );
    } catch (error) {
      this.logger.error(error, "Failed to delete consent record:");
      throw new Error("Failed to delete consent record");
    }
  }

  /**
   * Mark an authorization code as used
   */
  async useAuthorizationCode(code: string) {
    try {
      await db
        .update(schema.authorizationCodes)
        .set({ isUsed: true })
        .where(eq(schema.authorizationCodes.code, code));
    } catch (error) {
      this.logger.error(error, "Failed to mark authorization code as used:");
      throw new Error("Failed to update authorization code");
    }
  }

  /**
   * Create an access token
   */
  async createAccessToken(data: {
    token: string;
    clientId: string;
    userId: string;
    scope: string;
    expiresAt: Date;
  }) {
    try {
      await db.insert(oauthAccessTokens).values(data);
    } catch (error) {
      this.logger.error(error, "Failed to create access token:");
      throw new Error("Failed to create access token");
    }
  }

  // Refresh Token Methods (Adding missing methods)
  async createRefreshToken(data: {
    token: string;
    clientId: string;
    userId: string;
    scope: string;
    expiresAt: Date;
  }) {
    try {
      await db.insert(oauthRefreshTokens).values(data);
    } catch (error) {
      this.logger.error(error, "Failed to create refresh token:");
      throw new Error("Failed to create refresh token");
    }
  }

  async getRefreshToken(
    token: string,
  ): Promise<typeof oauthRefreshTokens.$inferSelect | null> {
    try {
      const [result] = await db
        .select()
        .from(oauthRefreshTokens)
        .where(
          and(
            eq(oauthRefreshTokens.token, token),
            gt(oauthRefreshTokens.expiresAt, new Date()),
          ),
        )
        .limit(1);
      return result || null;
    } catch (error) {
      this.logger.error(error, "Failed to retrieve refresh token:");
      throw new Error("Failed to retrieve refresh token");
    }
  }

  async deleteRefreshTokenByToken(token: string) {
    try {
      await db
        .delete(oauthRefreshTokens)
        .where(eq(oauthRefreshTokens.token, token));
    } catch (error) {
      this.logger.error(error, "Failed to delete refresh token by token:");
      throw new Error("Failed to delete refresh token by token");
    }
  }

  async deleteRefreshTokenByUserClient(userId: string, clientId: string) {
    try {
      await db
        .delete(oauthRefreshTokens)
        .where(
          and(
            eq(oauthRefreshTokens.userId, userId),
            eq(oauthRefreshTokens.clientId, clientId),
          ),
        );
    } catch (error) {
      this.logger.error(
        error,
        "Failed to delete refresh token by user/client:",
      );
      throw new Error("Failed to delete refresh token by user/client");
    }
  }

  // --- Issuer Profile Methods ---

  async createIssuerProfile(
    data: Omit<NewIssuer, "createdAt" | "updatedAt">,
  ): Promise<Issuer> {
    this.logger.info({ name: data.name }, "Creating issuer profile...");
    try {
      const [issuer] = await db
        .insert(issuerProfiles)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      this.logger.info(
        { issuerId: issuer.issuerId },
        "Issuer profile created successfully.",
      );
      return issuer;
    } catch (error) {
      this.logger.error(
        { err: error, data },
        "Failed to create issuer profile",
      );
      // Consider more specific error handling (e.g., unique constraint violation)
      // Add type check for error message access
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create issuer profile: ${message}`);
    }
  }

  async getIssuerProfileById(issuerId: string): Promise<Issuer | undefined> {
    this.logger.debug({ issuerId }, "Fetching issuer profile by ID...");
    try {
      const [issuer] = await db
        .select()
        .from(issuerProfiles)
        .where(eq(issuerProfiles.issuerId, issuerId))
        .limit(1);
      this.logger.debug(
        { issuerId, found: !!issuer },
        "Issuer profile fetch result.",
      );
      return issuer;
    } catch (error) {
      this.logger.error(
        { err: error, issuerId },
        "Failed to fetch issuer profile by ID",
      );
      throw error; // Re-throw original error
    }
  }

  async deleteIssuerProfileById(issuerId: string): Promise<void> {
    this.logger.info({ issuerId }, "Deleting issuer profile by ID...");
    try {
      const result = await db
        .delete(issuerProfiles)
        .where(eq(issuerProfiles.issuerId, issuerId))
        .returning({ id: issuerProfiles.issuerId });

      if (result.length === 0) {
        this.logger.warn(
          { issuerId },
          "Attempted to delete non-existent issuer profile.",
        );
        // Optionally throw an error or just return if deletion of non-existent is okay
        // throw new NotFoundError("Issuer profile not found for deletion");
      } else {
        this.logger.info({ issuerId }, "Issuer profile deleted successfully.");
      }
    } catch (error) {
      this.logger.error(
        { err: error, issuerId },
        "Failed to delete issuer profile by ID",
      );
      throw error; // Re-throw original error
    }
  }
}
