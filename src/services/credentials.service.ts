/**
 * Credentials Service
 *
 * This service provides methods for managing Open Badges credentials used in the application.
 * It handles credential storage, verification, and status management.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/config";
import { credentials } from "@/db/schema/credentials.schema";
import logger from "@/utils/logger";
import { type Logger as PinoLogger } from "pino";
import { createHash } from "crypto";

/**
 * Type definitions for the credentials service
 */
export type Credential = typeof credentials.$inferSelect;
export type NewCredential = Omit<
  typeof credentials.$inferInsert,
  "id" | "createdAt" | "issuedAt" | "isActive"
>;
export type CredentialUpdate = Partial<
  Omit<typeof credentials.$inferInsert, "id" | "createdAt" | "issuedAt">
>;

/**
 * Credential status enum
 */
export enum CredentialStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  REVOKED = "revoked",
  SUSPENDED = "suspended",
}

/**
 * Verification result interface
 */
export interface VerificationResult {
  valid: boolean;
  checks: {
    signature?: boolean;
    revocation?: boolean;
    expiration?: boolean;
    structure?: boolean;
    statusList?: boolean;
    proof?: boolean;
  };
  errors: string[];
  warnings?: string[];
  details?: {
    credentialId?: string;
    issuerId?: string;
    verificationMethod?: string;
    proofType?: string;
    statusListCredential?: string;
    statusListIndex?: string;
    cryptosuite?: string;
  };
}

/**
 * Credentials Service
 */
export class CredentialsService {
  private logger: PinoLogger;

  constructor() {
    this.logger = logger.child({ context: "CredentialsService" });
  }

  /**
   * Store a new credential
   * @param data Credential data
   * @returns Stored credential
   */
  async storeCredential(data: NewCredential): Promise<Credential> {
    try {
      this.logger.info({ type: data.type }, "Storing new credential");

      const [credential] = await db
        .insert(credentials)
        .values({
          ...data,
          issuedAt: new Date(),
          isActive: true,
        })
        .returning();

      this.logger.info(
        { credentialId: credential.id },
        "Credential stored successfully",
      );
      return credential;
    } catch (error) {
      this.logger.error({ error, data }, "Failed to store credential");
      throw new Error(
        `Failed to store credential: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get a credential by ID
   * @param id Credential ID
   * @returns Credential or null if not found
   */
  async getCredentialById(id: string): Promise<Credential | null> {
    try {
      const [credential] = await db
        .select()
        .from(credentials)
        .where(eq(credentials.id, id))
        .limit(1);

      return credential || null;
    } catch (error) {
      this.logger.error({ error, id }, "Failed to get credential by ID");
      throw new Error(
        `Failed to get credential by ID: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Verify a credential
   * @param id Credential ID
   * @returns Verification result
   */
  async verifyCredential(id: string): Promise<VerificationResult> {
    try {
      this.logger.info({ credentialId: id }, "Verifying credential");

      const credential = await this.getCredentialById(id);
      if (!credential) {
        return {
          valid: false,
          checks: {},
          errors: [`Credential with ID ${id} not found`],
        };
      }

      // Initialize verification result
      const result: VerificationResult = {
        valid: false,
        checks: {
          structure: true,
          revocation: true,
          expiration: true,
          proof: true, // Initialize proof check to true
        },
        errors: [],
        details: {
          credentialId: credential.id,
          issuerId: credential.issuerId,
        },
      };

      // Check if the credential is revoked
      if (credential.revokedAt) {
        result.checks.revocation = false;
        result.errors.push(
          `Credential was revoked on ${credential.revokedAt.toISOString()}`,
        );
      }

      // Check if the credential is expired
      if (credential.expiresAt && credential.expiresAt < new Date()) {
        result.checks.expiration = false;
        result.errors.push(
          `Credential expired on ${credential.expiresAt.toISOString()}`,
        );
      }

      // Check if the credential has a proof
      if (!credential.proof) {
        result.checks.proof = false;
        result.errors.push("Credential does not have a proof");
      }

      // Determine if the credential is valid overall
      result.valid = Object.values(result.checks).every(
        (check) => check !== false,
      );

      return result;
    } catch (error) {
      this.logger.error({ error, id }, "Failed to verify credential");
      return {
        valid: false,
        checks: {},
        errors: [
          `Verification error: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
  }

  /**
   * Update credential status
   * @param id Credential ID
   * @param status New status
   * @param reason Optional reason for status change
   * @returns Updated credential
   */
  async updateCredentialStatus(
    id: string,
    status: string,
    reason?: string,
  ): Promise<Credential> {
    try {
      this.logger.info(
        { credentialId: id, status, reason },
        "Updating credential status",
      );

      let updateData: CredentialUpdate = {
        status,
      };

      // Handle specific status changes
      if (status === CredentialStatus.REVOKED) {
        updateData.isActive = false;
        updateData.revokedAt = new Date();
        updateData.revocationReason = reason;
      } else if (status === CredentialStatus.SUSPENDED) {
        updateData.isActive = false;
      } else if (status === CredentialStatus.ACTIVE) {
        updateData.isActive = true;
      }

      const [credential] = await db
        .update(credentials)
        .set(updateData)
        .where(eq(credentials.id, id))
        .returning();

      if (!credential) {
        throw new Error(`Credential with ID ${id} not found`);
      }

      this.logger.info(
        { credentialId: id, status },
        "Credential status updated successfully",
      );
      return credential;
    } catch (error) {
      this.logger.error(
        { error, id, status },
        "Failed to update credential status",
      );
      throw new Error(
        `Failed to update credential status: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * List credentials by issuer
   * @param issuerId Issuer ID
   * @returns Array of credentials
   */
  async listCredentialsByIssuer(issuerId: string): Promise<Credential[]> {
    try {
      return await db
        .select()
        .from(credentials)
        .where(eq(credentials.issuerId, issuerId));
    } catch (error) {
      this.logger.error(
        { error, issuerId },
        "Failed to list credentials by issuer",
      );
      throw new Error(
        `Failed to list credentials by issuer: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * List credentials by recipient
   * @param recipientId Recipient ID
   * @returns Array of credentials
   */
  async listCredentialsByRecipient(recipientId: string): Promise<Credential[]> {
    try {
      return await db
        .select()
        .from(credentials)
        .where(eq(credentials.recipientId, recipientId));
    } catch (error) {
      this.logger.error(
        { error, recipientId },
        "Failed to list credentials by recipient",
      );
      throw new Error(
        `Failed to list credentials by recipient: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Check if a credential is revoked
   * @param id Credential ID
   * @returns Boolean indicating if the credential is revoked
   */
  async isCredentialRevoked(id: string): Promise<boolean> {
    try {
      const credential = await this.getCredentialById(id);
      if (!credential) {
        throw new Error(`Credential with ID ${id} not found`);
      }

      return (
        !!credential.revokedAt || credential.status === CredentialStatus.REVOKED
      );
    } catch (error) {
      this.logger.error(
        { error, id },
        "Failed to check if credential is revoked",
      );
      throw new Error(
        `Failed to check if credential is revoked: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Hash a credential for verification
   * @param credentialData Credential data as JSON string
   * @returns Credential hash
   */
  hashCredential(credentialData: string): string {
    return createHash("sha256").update(credentialData).digest("hex");
  }
}
