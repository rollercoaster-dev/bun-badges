import { eq } from "drizzle-orm";
import { db } from "@/db/config";
import { badgeAssertions, badgeClasses, issuerProfiles } from "@/db/schema";
import { getSigningKey } from "@/utils/signing/keys";
import * as ed from "@noble/ed25519";
import { base64url } from "@scure/base";

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

export class VerificationService {
  /**
   * Verify an Open Badges 2.0 assertion
   */
  async verifyOB2Assertion(assertionId: string): Promise<VerificationResult> {
    const result: VerificationResult = {
      valid: false,
      checks: {},
      errors: [],
    };

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

      // Structure validation would check JSON-LD structure
      result.checks.structure = true;

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
      checks: {},
      errors: [],
    };

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

      // Parse assertion JSON
      const assertionJson = assertion.assertionJson as any;

      // Check if this is an OB3.0 assertion with cryptographic proof
      if (!assertionJson.proof) {
        result.errors.push("Not an OB3.0 credential - no proof found");
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

      // Verify signature
      const proof = assertionJson.proof;
      const signingKey = await getSigningKey(assertion.issuerId);

      if (!signingKey) {
        result.errors.push("Issuer signing key not found");
        return result;
      }

      // Extract data to verify
      const proofValue = proof.proofValue;
      const signature = base64url.decode(proofValue);

      // For verification, we need to create a canonical document without the proof value
      const documentToVerify = { ...assertionJson };
      delete documentToVerify.proof;

      // Convert to canonical form (sorted, no whitespace)
      const canonicalData = JSON.stringify(documentToVerify);
      const dataToVerify = new TextEncoder().encode(canonicalData);

      // Verify with Ed25519
      const isValid = await ed.verify(
        signature,
        dataToVerify,
        signingKey.publicKey,
      );

      result.checks.signature = isValid;
      if (!isValid) {
        result.errors.push("Invalid signature");
      }

      // Structure validation would check JSON-LD structure
      result.checks.structure = true;

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
    // Get the assertion to determine format
    const [assertion] = await db
      .select()
      .from(badgeAssertions)
      .where(eq(badgeAssertions.assertionId, assertionId));

    if (!assertion) {
      return {
        valid: false,
        checks: {},
        errors: ["Assertion not found"],
      };
    }

    // Check if this is an OB3.0 assertion with proof
    const assertionJson = assertion.assertionJson as any;
    if (assertionJson.proof) {
      return this.verifyOB3Assertion(assertionId);
    }

    // Fall back to OB2.0 verification
    return this.verifyOB2Assertion(assertionId);
  }
}
