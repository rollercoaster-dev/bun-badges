/**
 * Tokens Service
 *
 * This service provides methods for managing OAuth tokens used in the application.
 * It handles token creation, verification, revocation, and status checking.
 */

import { eq, and, gt, lt, isNull, or, not } from "drizzle-orm";
import { db } from "@/db/config";
import { tokens } from "@/db/schema/tokens.schema";
import logger from "@/utils/logger";
import { type Logger as PinoLogger } from "pino";
import { createHash } from "crypto";

/**
 * Type definitions for the tokens service
 */
export type Token = typeof tokens.$inferSelect;
export type NewToken = Omit<
  typeof tokens.$inferInsert,
  "id" | "createdAt" | "isActive"
>;
export type TokenUpdate = Partial<
  Omit<typeof tokens.$inferInsert, "id" | "createdAt">
>;

/**
 * Token status enum
 */
export enum TokenStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  REVOKED = "revoked",
}

/**
 * Tokens Service
 */
export class TokensService {
  private logger: PinoLogger;

  constructor() {
    this.logger = logger.child({ context: "TokensService" });
  }

  /**
   * Create a new token
   * @param data Token data
   * @returns Created token
   */
  async createToken(data: NewToken): Promise<Token> {
    try {
      this.logger.info({ type: data.type }, "Creating new token");

      const [token] = await db
        .insert(tokens)
        .values({
          ...data,
          isActive: true,
        })
        .returning();

      this.logger.info({ tokenId: token.id }, "Token created successfully");
      return token;
    } catch (error) {
      this.logger.error({ error, data }, "Failed to create token");
      throw new Error(
        `Failed to create token: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get a token by ID
   * @param id Token ID
   * @returns Token or null if not found
   */
  async getTokenById(id: string): Promise<Token | null> {
    try {
      const [token] = await db
        .select()
        .from(tokens)
        .where(eq(tokens.id, id))
        .limit(1);

      return token || null;
    } catch (error) {
      this.logger.error({ error, id }, "Failed to get token by ID");
      throw new Error(
        `Failed to get token by ID: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Verify a token by its hash
   * @param tokenHash Token hash
   * @returns Token or null if not found or invalid
   */
  async verifyToken(tokenHash: string): Promise<Token | null> {
    try {
      const [token] = await db
        .select()
        .from(tokens)
        .where(
          and(
            eq(tokens.tokenHash, tokenHash),
            eq(tokens.isActive, true),
            gt(tokens.expiresAt, new Date()),
            isNull(tokens.revokedAt),
          ),
        )
        .limit(1);

      return token || null;
    } catch (error) {
      this.logger.error({ error }, "Failed to verify token");
      throw new Error(
        `Failed to verify token: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Revoke a token
   * @param id Token ID
   * @param reason Revocation reason
   * @returns Void
   */
  async revokeToken(id: string, reason?: string): Promise<void> {
    try {
      this.logger.info({ tokenId: id, reason }, "Revoking token");

      const [token] = await db
        .update(tokens)
        .set({
          isActive: false,
          revokedAt: new Date(),
          revocationReason: reason,
        })
        .where(eq(tokens.id, id))
        .returning();

      if (!token) {
        throw new Error(`Token with ID ${id} not found`);
      }

      this.logger.info({ tokenId: id }, "Token revoked successfully");
    } catch (error) {
      this.logger.error({ error, id }, "Failed to revoke token");
      throw new Error(
        `Failed to revoke token: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get token status
   * @param id Token ID
   * @returns Token status
   */
  async getTokenStatus(id: string): Promise<TokenStatus> {
    try {
      const token = await this.getTokenById(id);
      if (!token) {
        throw new Error(`Token with ID ${id} not found`);
      }

      // Check if the token is revoked
      if (token.revokedAt) {
        return TokenStatus.REVOKED;
      }

      // Check if the token is expired
      if (token.expiresAt < new Date()) {
        return TokenStatus.EXPIRED;
      }

      // Check if the token is active
      if (!token.isActive) {
        return TokenStatus.REVOKED;
      }

      return TokenStatus.ACTIVE;
    } catch (error) {
      this.logger.error({ error, id }, "Failed to get token status");
      throw new Error(
        `Failed to get token status: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * List active tokens for a user
   * @param userId User ID
   * @param clientId Optional client ID to filter by
   * @returns Array of active tokens
   */
  async listActiveTokens(userId: string, clientId?: string): Promise<Token[]> {
    try {
      let query = db
        .select()
        .from(tokens)
        .where(
          and(
            eq(tokens.userId, userId),
            eq(tokens.isActive, true),
            gt(tokens.expiresAt, new Date()),
            isNull(tokens.revokedAt),
          ),
        );

      if (clientId) {
        return await db
          .select()
          .from(tokens)
          .where(
            and(
              eq(tokens.userId, userId),
              eq(tokens.isActive, true),
              gt(tokens.expiresAt, new Date()),
              isNull(tokens.revokedAt),
              eq(tokens.clientId, clientId),
            ),
          );
      }

      return await query;
    } catch (error) {
      this.logger.error(
        { error, userId, clientId },
        "Failed to list active tokens",
      );
      throw new Error(
        `Failed to list active tokens: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Clean up expired tokens
   * @returns Number of tokens removed
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      this.logger.info("Cleaning up expired tokens");

      const result = await db
        .delete(tokens)
        .where(
          or(
            lt(tokens.expiresAt, new Date()),
            and(eq(tokens.isActive, false), not(isNull(tokens.revokedAt))),
          ),
        );

      const count = result.rowCount || 0;
      this.logger.info({ count }, "Expired tokens cleaned up successfully");
      return count;
    } catch (error) {
      this.logger.error({ error }, "Failed to clean up expired tokens");
      throw new Error(
        `Failed to clean up expired tokens: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Hash a token for secure storage
   * @param token Raw token string
   * @returns Hashed token
   */
  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
