import { eq } from "drizzle-orm";
import { db } from "@/db/config";
import {
  badgeAssertions,
  badgeClasses,
  issuerProfiles,
  statusLists,
} from "@/db/schema";
import { getSigningKey } from "@/utils/signing/keys";
import * as ed from "@noble/ed25519";
import { base64url } from "@scure/base";
import { isValidUuid } from "@/utils/validation";
import {
  isCredentialRevoked,
} from "@/utils/signing/status-list";
import {
  OpenBadgeCredential,
  isOpenBadgeCredential,
  StatusList2021Entry,
  StatusList2021Credential,
  isStatusList2021Credential,
  DataIntegrityProof,
} from "@/models/credential.model";

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
 * Represents a possibly unstructured badge assertion from OB2.0
 */
export interface OB2BadgeAssertion {
  "@context": string;
  type: string;
  id: string;
  recipient: {
    type: string;
    identity: string;
    hashed: boolean;
    salt?: string;
  };
  badge: unknown;
  verification?: {
    type: string;
    verificationProperty?: string;
    url?: string;
  };
  issuedOn: string;
  [key: string]: unknown;
}

/**
 * Type guard for OB2 badge assertions
 */
export function isOB2BadgeAssertion(obj: unknown): obj is OB2BadgeAssertion {
  if (!obj || typeof obj !== "object") return false;

  const assertion = obj as Partial<OB2BadgeAssertion>;
  return (
    typeof assertion["@context"] === "string" &&
    assertion["@context"] === "https://w3id.org/openbadges/v2" &&
    assertion.type === "Assertion" &&
    typeof assertion.id === "string" &&
    typeof assertion.recipient === "object" &&
    assertion.recipient !== null &&
    typeof assertion.badge === "object" &&
    assertion.badge !== null
  );
}

/**
 * VerificationService
 *
 * Provides verification services for Open Badges assertions
 * Supports both OB2.0 (hosted verification) and OB3.0 (cryptographic verification)
 */
export class VerificationService {
  /**
   * Verify an Open Badges 2.0 assertion
   */
  async verifyOB2Assertion(assertionId: string): Promise<VerificationResult> {
    const result: VerificationResult = {
      valid: false,
      checks: {
        revocation: false,
        structure: false,
        // Note: OB2 doesn't use digital signatures, so signature check is omitted
      },
      errors: [],
    };

    // Validate UUID format before database queries
    if (!isValidUuid(assertionId)) {
      result.errors.push("Invalid assertion ID format");
      return result;
    }

    try {
      // Get the assertion
      const [assertion] = await db
        .select()
        .from(badgeAssertions)
        .where(eq(badgeAssertions.assertionId, assertionId));

      if (!assertion) {
        result.errors.push("Assertion not found");
        return result;
      }

      // Parse assertion JSON - handle string or object
      let assertionJson: unknown;
      if (typeof assertion.assertionJson === "string") {
        try {
          assertionJson = JSON.parse(assertion.assertionJson);
        } catch (_error) {
          result.errors.push("Invalid JSON format in credential");
          return result;
        }
      } else {
        assertionJson = assertion.assertionJson;
      }

      // Check for revocation
      result.checks.revocation = !assertion.revoked;
      if (assertion.revoked) {
        result.errors.push(
          `Badge has been revoked. Reason: ${assertion.revocationReason || "Not specified"}`,
        );
      }

      // Validate badge class exists
      const [badge] = await db
        .select()
        .from(badgeClasses)
        .where(eq(badgeClasses.badgeId, assertion.badgeId));

      if (!badge) {
        result.errors.push("Referenced BadgeClass not found");
      }

      // Validate issuer exists
      const [issuer] = await db
        .select()
        .from(issuerProfiles)
        .where(eq(issuerProfiles.issuerId, assertion.issuerId));

      if (!issuer) {
        result.errors.push("Referenced Issuer not found");
      }

      // Structure validation for OB2
      result.checks.structure = isOB2BadgeAssertion(assertionJson);
      if (!result.checks.structure) {
        result.errors.push("Invalid OB2 assertion structure");
      }

      // For OB2.0, hosted verification is considered valid if the badge exists and is not revoked
      result.valid = result.errors.length === 0;
    } catch (_error) {
      result.errors.push(
        `Verification error: ${
          _error instanceof Error ? _error.message : "Unknown error"
        }`,
      );
    }

    return result;
  }

  /**
   * Verify an Open Badges 3.0 assertion with cryptographic proof
   * Includes verification of signature, status list, and structure
   */
  async verifyOB3Assertion(assertionId: string): Promise<VerificationResult> {
    const result: VerificationResult = {
      valid: false,
      checks: {
        signature: false,
        revocation: false,
        structure: false,
        statusList: false,
        proof: false,
      },
      errors: [],
      warnings: [],
      details: {
        credentialId: assertionId,
      },
    };

    // Validate UUID format before database queries
    if (!isValidUuid(assertionId)) {
      result.errors.push("Invalid assertion ID format");
      return result;
    }

    try {
      // Get the assertion
      const [assertion] = await db
        .select()
        .from(badgeAssertions)
        .where(eq(badgeAssertions.assertionId, assertionId));

      if (!assertion) {
        result.errors.push("Assertion not found");
        return result;
      }

      result.details!.issuerId = assertion.issuerId;

      // Parse assertion JSON - handle string or object
      let assertionJson: unknown;
      if (typeof assertion.assertionJson === "string") {
        try {
          assertionJson = JSON.parse(assertion.assertionJson);
        } catch (_error) {
          result.errors.push("Invalid JSON format in credential");
          return result;
        }
      } else {
        assertionJson = assertion.assertionJson;
      }

      // Validate it's an OB3 credential
      if (!isOpenBadgeCredential(assertionJson)) {
        result.errors.push("Not an OB3.0 credential - invalid format");
        return result;
      }

      const credential = assertionJson as OpenBadgeCredential;

      // Structure validation - already done via type guard
      result.checks.structure = true;

      // Check for expiration
      if (credential.expirationDate) {
        const expirationDate = new Date(credential.expirationDate);
        const now = new Date();
        result.checks.expiration = now <= expirationDate;

        if (!result.checks.expiration) {
          result.errors.push(
            `Credential expired on ${expirationDate.toISOString()}`,
          );
        }
      } else {
        // No expiration date means it doesn't expire
        result.checks.expiration = true;
      }

      // Verify the proof
      if (!credential.proof) {
        result.errors.push("Not an OB3.0 credential - no proof found");
        result.checks.proof = false;
        return result;
      }

      // Validate proof format
      const proof = credential.proof;
      if (
        !proof.type ||
        !(proof.proofValue || proof.jws) ||
        !proof.verificationMethod
      ) {
        result.errors.push(
          "Invalid proof format - missing required properties",
        );
        result.checks.proof = false;
        return result;
      }

      // Store proof details
      result.details!.proofType = proof.type;
      result.details!.verificationMethod = proof.verificationMethod;
      result.checks.proof = true;

      // Validate proof type
      const supportedProofTypes = [
        "Ed25519Signature2020",
        "JsonWebSignature2020",
        "DataIntegrityProof"
      ];
      if (!supportedProofTypes.includes(proof.type)) {
        result.errors.push(
          `Unsupported proof type: ${proof.type}. Supported types: ${supportedProofTypes.join(", ")}`,
        );
        return result;
      }

      // For DataIntegrityProof, validate the cryptosuite
      if (proof.type === "DataIntegrityProof") {
        const dataIntegrityProof = proof as DataIntegrityProof;
        if (!dataIntegrityProof.cryptosuite) {
          result.errors.push("DataIntegrityProof missing required cryptosuite property");
          return result;
        }

        const supportedCryptosuites = ["eddsa-rdfc-2022"];
        if (!supportedCryptosuites.includes(dataIntegrityProof.cryptosuite)) {
          result.errors.push(
            `Unsupported cryptosuite: ${dataIntegrityProof.cryptosuite}. Supported cryptosuites: ${supportedCryptosuites.join(", ")}`,
          );
          return result;
        }
        
        result.details!.cryptosuite = dataIntegrityProof.cryptosuite;
      }

      // Get issuer info for key verification
      const [issuer] = await db
        .select()
        .from(issuerProfiles)
        .where(eq(issuerProfiles.issuerId, assertion.issuerId));

      if (!issuer) {
        result.errors.push("Referenced Issuer not found");
        return result;
      }

      if (!issuer.publicKey) {
        result.errors.push("Issuer has no public key");
        return result;
      }

      // Check status list if present
      if (credential.credentialStatus) {
        const status = credential.credentialStatus as StatusList2021Entry;

        // Store status list details
        result.details!.statusListCredential = status.statusListCredential;
        result.details!.statusListIndex = status.statusListIndex;

        if (status.type === "StatusList2021Entry") {
          // Get the referenced status list credential
          const issuerId = assertion.issuerId;
          const [statusList] = await db
            .select()
            .from(statusLists)
            .where(eq(statusLists.issuerId, issuerId))
            .limit(1);

          if (statusList) {
            // Verify against status list
            let statusListCredential: StatusList2021Credential;

            if (typeof statusList.statusListJson === "string") {
              try {
                statusListCredential = JSON.parse(statusList.statusListJson);
              } catch (_error) {
                result.errors.push("Invalid status list JSON format");
                result.checks.statusList = false;
                return result;
              }
            } else {
              statusListCredential =
                statusList.statusListJson as StatusList2021Credential;
            }

            if (isStatusList2021Credential(statusListCredential)) {
              // Get the index from the credential status
              const index = parseInt(status.statusListIndex);
              const encodedList =
                statusListCredential.credentialSubject.encodedList;

              // Check if the credential is revoked
              const isRevoked = isCredentialRevoked(encodedList, index);
              result.checks.revocation = !isRevoked;

              if (isRevoked) {
                result.errors.push("Credential has been revoked");
              }
            } else {
              result.errors.push("Status list credential is invalid");
              result.checks.statusList = false;
              return result;
            }

            // Set status list check to true if we get here
            result.checks.statusList = true;
          } else {
            result.warnings?.push("Status list not found");
            result.checks.statusList = false;
          }
        } else {
          result.warnings?.push(
            `Unsupported status type: ${status.type}. Expected StatusList2021Entry.`,
          );
          result.checks.statusList = false;
        }
      } else {
        // If no credential status, mark as not applicable
        result.checks.revocation = true; // Not revoked
        result.checks.statusList = true; // No status list to check
      }

      // Verify signature
      const signingKey = await getSigningKey(assertion.issuerId);
      if (!signingKey || !signingKey.publicKey) {
        result.errors.push("Issuer signing key not found");
        return result;
      }

      try {
        // Create a copy without the proof to get same canonical form
        const documentToVerify = { ...credential };
        if ("proof" in documentToVerify) {
          delete (documentToVerify as any).proof;
        }

        const canonicalData = JSON.stringify(documentToVerify);
        const dataToVerify = new TextEncoder().encode(canonicalData);

        // Decode the proof value
        let signature: Uint8Array;
        
        if (proof.type === "DataIntegrityProof" || proof.type === "Ed25519Signature2020") {
          if (!proof.proofValue) {
            result.errors.push("Missing proofValue in Ed25519/DataIntegrity proof");
            return result;
          }
          signature = base64url.decode(proof.proofValue);
        } else if (proof.type === "JsonWebSignature2020") {
          if (!proof.jws) {
            result.errors.push("Missing jws in JsonWebSignature2020 proof");
            return result;
          }
          // Extract signature from JWS
          const jwsParts = proof.jws.split(".");
          if (jwsParts.length !== 3) {
            result.errors.push("Invalid JWS format");
            return result;
          }
          signature = base64url.decode(jwsParts[2]);
        } else {
          result.errors.push(`Unsupported proof type for verification: ${proof.type}`);
          return result;
        }

        // Verify the signature
        const signatureValid = await ed.verify(
          signature,
          dataToVerify,
          signingKey.publicKey,
        );
        // Verify the signature
        result.checks.signature = signatureValid;
        if (!signatureValid) {
          result.errors.push("Invalid signature");
        }
      } catch (_error) {
        console.error("Signature verification error:", _error);
        result.errors.push(`Signature verification error: ${_error}`);
        result.checks.signature = false;
      }

      // Valid if all critical checks pass
      // A credential is valid if:
      // 1. It has a valid structure
      // 2. It has a valid signature
      // 3. It is not revoked
      // 4. It is not expired (if expiration date is present)
      result.valid =
        result.checks.structure === true &&
        result.checks.signature === true &&
        result.checks.revocation !== false &&
        result.checks.expiration !== false;
    } catch (_error) {
      result.errors.push(
        `Verification error: ${
          _error instanceof Error ? _error.message : "Unknown error"
        }`,
      );
    }

    return result;
  }

  /**
   * Auto-detect and verify an assertion as either OB2 or OB3
   */
  async verifyAssertion(assertionId: string): Promise<VerificationResult> {
    // Validate UUID format before any database operations
    if (!isValidUuid(assertionId)) {
      return {
        valid: false,
        checks: {
          signature: false,
          revocation: false,
          structure: false,
        },
        errors: ["Invalid assertion ID format"],
      };
    }

    // Get the assertion to determine format
    const [assertion] = await db
      .select()
      .from(badgeAssertions)
      .where(eq(badgeAssertions.assertionId, assertionId));

    if (!assertion) {
      return {
        valid: false,
        checks: {
          signature: false,
          revocation: false,
          structure: false,
        },
        errors: ["Assertion not found"],
      };
    }

    // Parse assertion JSON - handle string or object
    let assertionJson: unknown;
    if (typeof assertion.assertionJson === "string") {
      try {
        assertionJson = JSON.parse(assertion.assertionJson);
      } catch (error) {
        return {
          valid: false,
          checks: {
            signature: false,
            revocation: false,
            structure: false,
          },
          errors: ["Invalid JSON format in credential"],
        };
      }
    } else {
      assertionJson = assertion.assertionJson;
    }

    // Determine the badge format and verification method
    if (isOpenBadgeCredential(assertionJson)) {
      return this.verifyOB3Assertion(assertionId);
    } else if (isOB2BadgeAssertion(assertionJson)) {
      return this.verifyOB2Assertion(assertionId);
    } else {
      // Check for OB3 format indicators even if it's not a perfect match
      const maybeOB3 = assertionJson as Record<string, unknown>;

      const hasOB3Context =
        Array.isArray(maybeOB3["@context"]) &&
        maybeOB3["@context"].some(
          (ctx: unknown) =>
            typeof ctx === "string" &&
            (ctx.includes("credentials/v1") || ctx.includes("badges/v3")),
        );

      const hasOB3Type =
        Array.isArray(maybeOB3.type) &&
        maybeOB3.type.some(
          (type: unknown) =>
            typeof type === "string" &&
            (type === "VerifiableCredential" || type === "OpenBadgeCredential"),
        );

      if (hasOB3Context || hasOB3Type || maybeOB3.proof) {
        return this.verifyOB3Assertion(assertionId);
      }

      // Default to OB2 verification for legacy support
      return this.verifyOB2Assertion(assertionId);
    }
  }
}
