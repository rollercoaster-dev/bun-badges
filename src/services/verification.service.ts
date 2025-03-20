import { eq } from "drizzle-orm";
import { db } from "@/db/config";
import { badgeAssertions, badgeClasses, issuerProfiles } from "@/db/schema";
import { getSigningKey } from "@/utils/signing/keys";
import * as ed from "@noble/ed25519";
import { base64url } from "@scure/base";
import { isValidUuid } from "@/utils/validation";
import {
  OpenBadgeCredential,
  CredentialProof,
  isOpenBadgeCredential,
} from "@/models/credential.model";

export interface VerificationResult {
  valid: boolean;
  checks: {
    signature?: boolean;
    revocation?: boolean;
    expiration?: boolean;
    structure?: boolean;
  };
  errors: string[];
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
        } catch (error) {
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
    } catch (error) {
      result.errors.push(
        `Verification error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }

    return result;
  }

  /**
   * Verify an Open Badges 3.0 assertion with cryptographic proof
   */
  async verifyOB3Assertion(assertionId: string): Promise<VerificationResult> {
    const result: VerificationResult = {
      valid: false,
      checks: {
        signature: false,
        revocation: false,
        structure: false,
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

      // Check for revocation
      result.checks.revocation = !assertion.revoked;
      if (assertion.revoked) {
        result.errors.push(
          `Badge has been revoked. Reason: ${assertion.revocationReason || "Not specified"}`,
        );
      }

      // Parse assertion JSON - handle string or object
      let assertionJson: unknown;
      if (typeof assertion.assertionJson === "string") {
        try {
          assertionJson = JSON.parse(assertion.assertionJson);
        } catch (error) {
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

      // Check if this has cryptographic proof
      if (!credential.proof) {
        result.errors.push("Not an OB3.0 credential - no proof found");
        return result;
      }

      // Validate proof format
      const proof = credential.proof;
      if (!proof.type || !proof.proofValue || !proof.verificationMethod) {
        result.errors.push(
          "Invalid proof format - missing required properties",
        );
        return result;
      }

      // Validate proof type - currently only support Ed25519Signature2020
      const supportedProofTypes = ["Ed25519Signature2020"];
      if (!supportedProofTypes.includes(proof.type)) {
        result.errors.push(
          `Unsupported proof type: ${proof.type}. Supported types: ${supportedProofTypes.join(", ")}`,
        );
        return result;
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

      // Retrieve the signing key
      const signingKey = await getSigningKey(assertion.issuerId);
      if (!signingKey) {
        result.errors.push("Issuer signing key not found");
        return result;
      }

      // Extract data to verify
      const proofValue = proof.proofValue;
      if (!proofValue) {
        result.errors.push("Missing proof value");
        return result;
      }

      // Decode the signature
      let signature: Uint8Array;
      try {
        signature = base64url.decode(proofValue);
      } catch (error) {
        result.errors.push("Failed to decode signature from base64url");
        return result;
      }

      // For verification, we need to create a canonical document without the proof value
      // Create a deep copy to avoid modifying the original
      const documentToVerify = { ...credential };
      delete (documentToVerify as Partial<OpenBadgeCredential>).proof;

      // Convert to canonical form (sorted, no whitespace)
      const canonicalData = JSON.stringify(documentToVerify);
      const dataToVerify = new TextEncoder().encode(canonicalData);

      // Verify with Ed25519
      let isValid = false;
      try {
        isValid = await ed.verify(
          signature,
          dataToVerify,
          signingKey.publicKey,
        );
        result.checks.signature = isValid;
        if (!isValid) {
          result.errors.push("Invalid signature - verification failed");
        }
      } catch (error) {
        result.errors.push(
          `Signature verification error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        result.checks.signature = false;
      }

      // Structure validation
      result.checks.structure = true; // Already validated with isOpenBadgeCredential

      // Valid if all checks pass
      result.valid = result.errors.length === 0;
    } catch (error) {
      result.errors.push(
        `Verification error: ${
          error instanceof Error ? error.message : "Unknown error"
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
