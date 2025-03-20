import { eq } from "drizzle-orm";
import { db } from "@/db/config";
import { badgeAssertions, badgeClasses, issuerProfiles } from "@/db/schema";
import { getSigningKey } from "@/utils/signing/keys";
import * as ed from "@noble/ed25519";
import { base64url } from "@scure/base";
import { isValidUuid } from "@/utils/validation";

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
      let assertionJson: any;
      if (typeof assertion.assertionJson === "string") {
        try {
          assertionJson = JSON.parse(assertion.assertionJson);
        } catch (error) {
          result.errors.push("Invalid JSON format in credential");
          return result;
        }
      } else {
        assertionJson = assertion.assertionJson as any;
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
      result.checks.structure = this.validateOB2Structure(assertionJson);
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
   * Validate the structure of an OB2 assertion
   */
  private validateOB2Structure(assertion: any): boolean {
    if (!assertion) return false;

    // Check essential fields for OB2.0
    return Boolean(
      assertion.id &&
        (assertion.type === "Assertion" || assertion.badge) &&
        assertion.recipient,
    );
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
      let assertionJson: any;
      if (typeof assertion.assertionJson === "string") {
        try {
          assertionJson = JSON.parse(assertion.assertionJson);
        } catch (error) {
          result.errors.push("Invalid JSON format in credential");
          return result;
        }
      } else {
        assertionJson = assertion.assertionJson as any;
      }

      // Check if this is an OB3.0 assertion with cryptographic proof
      if (!assertionJson.proof) {
        result.errors.push("Not an OB3.0 credential - no proof found");
        return result;
      }

      // Validate proof format
      const proof = assertionJson.proof;
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
      let proofValue: string;
      try {
        proofValue = proof.proofValue;
        if (!proofValue) {
          result.errors.push("Missing proof value");
          return result;
        }
      } catch (error) {
        result.errors.push("Invalid proof value format");
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
      const documentToVerify = JSON.parse(JSON.stringify(assertionJson));

      // For Ed25519Signature2020, we remove the entire proof object for verification
      delete documentToVerify.proof;

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
      result.checks.structure = this.validateCredentialStructure(assertionJson);
      if (!result.checks.structure) {
        result.errors.push("Invalid credential structure");
      }

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
   * Validate the structure of a credential
   */
  private validateCredentialStructure(credential: any): boolean {
    // Basic structure validation for OB3 credential
    if (!credential) return false;

    // Check essential fields
    const hasRequiredFields = Boolean(
      credential.id &&
        credential.type &&
        // Check for OB3.0 fields
        ((Array.isArray(credential.type) &&
          (credential.type.includes("VerifiableCredential") ||
            credential.type.includes("OpenBadgeCredential"))) ||
          // Allow OB2.0 Assertion type as well for compatibility
          credential.type === "Assertion" ||
          credential.type === "BadgeClass"),
    );

    return hasRequiredFields;
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
    let assertionJson: any;
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
      assertionJson = assertion.assertionJson as any;
    }

    // Determine the badge format and verification method
    let isOB3 = false;

    // Check for OB3 proof
    if (assertionJson.proof) {
      isOB3 = true;
    }

    // Check for OB3 context
    if (
      assertionJson["@context"] &&
      Array.isArray(assertionJson["@context"]) &&
      assertionJson["@context"].some(
        (ctx: string) =>
          ctx.includes("credentials/v1") ||
          ctx.includes("security/suites/ed25519-2020"),
      )
    ) {
      isOB3 = true;
    }

    // Check for OB3 credential type
    if (
      assertionJson.type &&
      Array.isArray(assertionJson.type) &&
      (assertionJson.type.includes("VerifiableCredential") ||
        assertionJson.type.includes("OpenBadgeCredential"))
    ) {
      isOB3 = true;
    }

    // Verify according to detected format
    if (isOB3) {
      return this.verifyOB3Assertion(assertionId);
    } else {
      return this.verifyOB2Assertion(assertionId);
    }
  }
}
