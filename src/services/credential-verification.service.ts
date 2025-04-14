/**
 * Credential Verification Service with Database Integration
 *
 * This service handles verification of Open Badges credentials with database integration,
 * supporting both JWT and Linked Data Signature formats, credential status checking,
 * revocation, and recipient validation.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/config";
import { credentials } from "@/db/schema/credentials.schema";
import { isValidUuid } from "@/utils/validation";
import { isOpenBadgeCredential } from "@/models/credential.model";
import { OpenBadgeCredential, OB3 } from "@/utils/openbadges-types";
import * as jose from "jose";
import logger from "@/utils/logger";
import { type Logger as PinoLogger } from "pino";

/**
 * Result of credential verification
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
    recipient?: boolean;
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
    recipientId?: string;
  };
}

/**
 * Credential Verification Service with Database Integration
 */
export class CredentialVerificationService {
  private logger: PinoLogger;

  constructor() {
    this.logger = logger.child({ context: "CredentialVerificationService" });
  }

  /**
   * Verify a credential by ID
   *
   * @param credentialId The ID of the credential to verify
   * @returns Verification result
   */
  async verifyCredential(credentialId: string): Promise<VerificationResult> {
    const result: VerificationResult = {
      valid: false,
      checks: {
        structure: false,
        signature: false,
        revocation: false,
        expiration: false,
        recipient: false,
      },
      errors: [],
    };

    try {
      // Validate UUID format before any database operations
      if (!isValidUuid(credentialId)) {
        result.errors.push("Invalid credential ID format");
        return result;
      }

      // Get the credential from the database
      const [credential] = await db
        .select()
        .from(credentials)
        .where(eq(credentials.id, credentialId))
        .limit(1);

      if (!credential) {
        result.errors.push("Credential not found in database");
        return result;
      }

      // Add credential ID to details
      result.details = {
        credentialId: credential.id,
        issuerId: credential.issuerId,
      };

      // Check credential status (active, revoked, suspended)
      result.checks.revocation =
        credential.status === "active" && credential.isActive;
      if (!result.checks.revocation) {
        result.errors.push(`Credential has been ${credential.status}`);
      }

      // Check for expiration
      if (credential.expiresAt) {
        const expirationDate = new Date(credential.expiresAt);
        const now = new Date();
        result.checks.expiration = expirationDate > now;
        if (!result.checks.expiration) {
          result.errors.push(
            `Credential expired on ${expirationDate.toISOString()}`,
          );
        }
      } else {
        // No expiration date means it doesn't expire
        result.checks.expiration = true;
      }

      // Parse the credential data
      const credentialData = credential.data as unknown as OpenBadgeCredential;

      // Validate credential structure
      result.checks.structure = isOpenBadgeCredential(credentialData);
      if (!result.checks.structure) {
        result.errors.push("Invalid credential structure");
        return result;
      }

      // Verify credential signature/proof
      if (credential.proof) {
        const proofData = credential.proof as Record<string, unknown>;

        if (
          proofData.type === "DataIntegrityProof" ||
          proofData.type === "Ed25519Signature2020"
        ) {
          // For Linked Data Signatures
          result.details.proofType = proofData.type as string;
          result.details.verificationMethod =
            proofData.verificationMethod as string;

          if (proofData.cryptosuite) {
            result.details.cryptosuite = proofData.cryptosuite as string;
          }

          // Verify the signature (implementation depends on your key management)
          // This is a placeholder - you'll need to implement actual verification
          result.checks.signature = true; // Replace with actual verification
        } else if (proofData.type === "JsonWebSignature2020") {
          // For JWT signatures
          result.details.proofType = "JsonWebSignature2020";
          result.details.verificationMethod =
            proofData.verificationMethod as string;

          // Verify the JWT signature (implementation depends on your key management)
          // This is a placeholder - you'll need to implement actual verification
          result.checks.signature = true; // Replace with actual verification
        } else {
          result.errors.push(`Unsupported proof type: ${proofData.type}`);
          result.checks.signature = false;
        }
      } else {
        result.errors.push("No proof found in credential");
        result.checks.signature = false;
      }

      // Check credential status list if available
      if (credentialData.credentialStatus) {
        const statusEntry =
          credentialData.credentialStatus as OB3.CredentialStatus;
        if (statusEntry.type === "StatusList2021Entry") {
          result.details.statusListCredential =
            statusEntry.statusListCredential;
          result.details.statusListIndex = statusEntry.statusListIndex;

          // Verify status list (implementation depends on your status list verification)
          // This is a placeholder - you'll need to implement actual verification
          result.checks.statusList = true; // Replace with actual verification
        } else {
          result.warnings = result.warnings || [];
          result.warnings.push(
            `Unsupported status list type: ${statusEntry.type}`,
          );
        }
      }

      // Verify recipient identifier
      if (
        credentialData.credentialSubject &&
        credentialData.credentialSubject.id
      ) {
        result.details.recipientId = credentialData.credentialSubject.id;

        // Verify recipient identifier against database
        result.checks.recipient = await this.verifyRecipientIdentifier(
          credentialData.credentialSubject.id,
          credential.recipientId,
        );

        if (!result.checks.recipient) {
          result.errors.push("Recipient identifier verification failed");
        }
      } else {
        result.warnings = result.warnings || [];
        result.warnings.push(
          "Credential does not contain a recipient identifier",
        );
      }

      // Determine if the credential is valid overall
      result.valid = Object.values(result.checks).every(
        (check) => check !== false,
      );
    } catch (error) {
      this.logger.error(error, "Credential verification error:");
      result.errors.push(
        `Verification error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }

    return result;
  }

  /**
   * Verify a credential by its JWT
   *
   * @param jwt The JWT to verify
   * @returns Verification result
   */
  async verifyCredentialJwt(jwt: string): Promise<VerificationResult> {
    const result: VerificationResult = {
      valid: false,
      checks: {},
      errors: [],
    };

    try {
      // Decode the JWT to get the credential ID
      const decoded = jose.decodeJwt(jwt);

      if (!decoded.jti) {
        result.errors.push("JWT does not contain a credential ID (jti)");
        return result;
      }

      // Verify the credential using the ID
      return this.verifyCredential(decoded.jti as string);
    } catch (error) {
      this.logger.error(error, "JWT verification error:");
      result.errors.push(
        `JWT verification error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      return result;
    }
  }

  /**
   * Verify a credential with Linked Data Signatures
   *
   * @param credentialData The credential data to verify
   * @returns Verification result
   */
  async verifyCredentialLd(
    credentialData: Record<string, unknown>,
  ): Promise<VerificationResult> {
    const result: VerificationResult = {
      valid: false,
      checks: {},
      errors: [],
    };

    try {
      // Check if the credential has an ID
      if (!credentialData.id || typeof credentialData.id !== "string") {
        result.errors.push("Credential does not contain an ID");
        return result;
      }

      // Extract the credential ID from the full URI if needed
      const idParts = (credentialData.id as string).split("/");
      const credentialId = idParts[idParts.length - 1];

      // Verify the credential using the ID
      return this.verifyCredential(credentialId);
    } catch (error) {
      this.logger.error(error, "Linked Data Signature verification error:");
      result.errors.push(
        `Linked Data Signature verification error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      return result;
    }
  }

  /**
   * Verify a recipient identifier against the database
   *
   * @param subjectId The subject ID from the credential
   * @param storedRecipientId The recipient ID stored in the database
   * @returns Whether the recipient identifier is valid
   */
  private async verifyRecipientIdentifier(
    subjectId: string,
    storedRecipientId: string,
  ): Promise<boolean> {
    // Simple case: direct match
    if (subjectId === storedRecipientId) {
      return true;
    }

    // Handle different identifier formats (email, URL, DID)
    if (subjectId.startsWith("did:")) {
      // DID verification logic
      // This is a placeholder - you'll need to implement actual DID verification
      return subjectId === storedRecipientId;
    } else if (subjectId.includes("@")) {
      // Email verification logic
      // This is a placeholder - you'll need to implement actual email verification
      return subjectId.toLowerCase() === storedRecipientId.toLowerCase();
    } else if (subjectId.startsWith("http")) {
      // URL verification logic
      // This is a placeholder - you'll need to implement actual URL verification
      return subjectId === storedRecipientId;
    }

    // Default: no match
    return false;
  }

  /**
   * Check if a credential is revoked
   *
   * @param credentialId The ID of the credential to check
   * @returns Whether the credential is revoked
   */
  async isCredentialRevoked(credentialId: string): Promise<boolean> {
    try {
      // Validate UUID format before any database operations
      if (!isValidUuid(credentialId)) {
        return true; // Consider invalid IDs as "revoked" for security
      }

      // Get the credential from the database
      const [credential] = await db
        .select({
          status: credentials.status,
          isActive: credentials.isActive,
        })
        .from(credentials)
        .where(eq(credentials.id, credentialId))
        .limit(1);

      if (!credential) {
        return true; // Consider non-existent credentials as "revoked" for security
      }

      // Check if the credential is revoked or suspended
      return credential.status !== "active" || !credential.isActive;
    } catch (error) {
      this.logger.error(error, "Error checking credential revocation status:");
      return true; // Consider errors as "revoked" for security
    }
  }

  /**
   * Revoke a credential
   *
   * @param credentialId The ID of the credential to revoke
   * @param reason The reason for revocation
   * @returns Whether the revocation was successful
   */
  async revokeCredential(
    credentialId: string,
    reason?: string,
  ): Promise<boolean> {
    try {
      // Validate UUID format before any database operations
      if (!isValidUuid(credentialId)) {
        return false;
      }

      // Update the credential in the database
      const result = await db
        .update(credentials)
        .set({
          status: "revoked",
          isActive: false,
          revokedAt: new Date(),
          revocationReason: reason || "Revoked by issuer",
        })
        .where(eq(credentials.id, credentialId));

      return result && typeof result.rowCount === "number"
        ? result.rowCount > 0
        : false;
    } catch (error) {
      this.logger.error(error, "Error revoking credential:");
      return false;
    }
  }
}

// Export a singleton instance
export const credentialVerificationService =
  new CredentialVerificationService();
