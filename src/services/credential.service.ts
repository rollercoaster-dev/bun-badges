import { eq } from "drizzle-orm";
import { db } from "@/db/config";
import { badgeAssertions, badgeClasses, issuerProfiles } from "@/db/schema";
import { getSigningKey, generateSigningKey } from "@/utils/signing/keys";
import * as ed from "@noble/ed25519";
import { base64url } from "@scure/base";
import {
  OpenBadgeCredential,
  OpenBadgeAchievement,
} from "@/models/credential.model";

export class CredentialService {
  /**
   * Create a new issuer key pair if one doesn't exist
   */
  async ensureIssuerKeyExists(issuerId: string) {
    const key = await getSigningKey(issuerId);
    if (!key) {
      return generateSigningKey(issuerId);
    }
    return key;
  }

  /**
   * Create an Open Badges 3.0 achievement
   */
  async createAchievement(
    hostUrl: string,
    badgeId: string,
  ): Promise<OpenBadgeAchievement> {
    // Get the badge class
    const [badge] = await db
      .select()
      .from(badgeClasses)
      .where(eq(badgeClasses.badgeId, badgeId));

    if (!badge) {
      throw new Error("Badge not found");
    }

    // Get the issuer
    const [issuer] = await db
      .select()
      .from(issuerProfiles)
      .where(eq(issuerProfiles.issuerId, badge.issuerId));

    if (!issuer) {
      throw new Error("Issuer not found");
    }

    // Create achievement definition
    return {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3id.org/badges/v3",
      ],
      id: `${hostUrl}/badges/${badge.badgeId}`,
      type: ["AchievementCredential"],
      name: badge.name,
      description: badge.description,
      image: {
        id: badge.imageUrl,
        type: "Image",
      },
      criteria: {
        narrative: badge.criteria,
      },
      issuer: `${hostUrl}/issuers/${badge.issuerId}`,
    };
  }

  /**
   * Create an Open Badges 3.0 verifiable credential
   */
  async createCredential(
    hostUrl: string,
    assertionId: string,
  ): Promise<OpenBadgeCredential> {
    // Get the assertion
    const [assertion] = await db
      .select()
      .from(badgeAssertions)
      .where(eq(badgeAssertions.assertionId, assertionId));

    if (!assertion) {
      throw new Error("Assertion not found");
    }

    // Get the badge
    const achievement = await this.createAchievement(
      hostUrl,
      assertion.badgeId,
    );

    // Create the credential without proof
    const credential: Omit<OpenBadgeCredential, "proof"> = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3id.org/vc/status-list/2021/v1",
        "https://w3id.org/badges/v3",
      ],
      id: `${hostUrl}/assertions/${assertion.assertionId}`,
      type: ["VerifiableCredential", "OpenBadgeCredential"],
      issuer: `${hostUrl}/issuers/${assertion.issuerId}`,
      issuanceDate: assertion.issuedOn.toISOString(),
      credentialSubject: {
        id: assertion.recipientHashed ? undefined : assertion.recipientIdentity,
        type:
          assertion.recipientType === "email"
            ? "EmailCredentialSubject"
            : "IdentityObject",
        achievement,
      },
      evidence: assertion.evidenceUrl
        ? [
            {
              id: assertion.evidenceUrl,
              type: "Evidence",
            },
          ]
        : undefined,
    };

    // Ensure issuer has keys
    await this.ensureIssuerKeyExists(assertion.issuerId);

    // Sign the credential
    return this.signCredential(assertion.issuerId, credential);
  }

  /**
   * Sign a credential with issuer's private key
   */
  async signCredential<T extends Record<string, any>>(
    issuerId: string,
    credential: T,
  ): Promise<T & { proof: any }> {
    const signingKey = await getSigningKey(issuerId);
    if (!signingKey) {
      throw new Error("Issuer signing key not found");
    }

    // Prepare the document for signing by creating a copy without the proof
    const documentToSign = { ...credential };

    // Create a canonical form of the credential for signing
    const canonicalData = JSON.stringify(documentToSign);
    const dataToSign = new TextEncoder().encode(canonicalData);

    // Sign the credential
    const signature = await ed.sign(dataToSign, signingKey.privateKey);
    const proofValue = base64url.encode(signature);

    // Add the proof to the credential
    return {
      ...credential,
      proof: {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        verificationMethod: signingKey.keyInfo.id,
        proofPurpose: "assertionMethod",
        proofValue,
      },
    };
  }

  /**
   * Verify a credential's signature
   */
  async verifySignature<T extends Record<string, any>>(
    credential: T & { proof: any },
  ): Promise<boolean> {
    if (!credential.proof) {
      return false;
    }

    try {
      // Extract issuer ID from the credential
      const issuerId =
        typeof credential.issuer === "string"
          ? credential.issuer.split("/").pop()
          : credential.issuer.id.split("/").pop();

      if (!issuerId) {
        return false;
      }

      // Get the issuer's public key
      const signingKey = await getSigningKey(issuerId);
      if (!signingKey) {
        return false;
      }

      // Extract signature from proof
      const proofValue = credential.proof.proofValue;
      const signature = base64url.decode(proofValue);

      // Create canonical form for verification without the proof
      const documentToVerify = { ...credential };
      delete documentToVerify.proof;

      const canonicalData = JSON.stringify(documentToVerify);
      const dataToVerify = new TextEncoder().encode(canonicalData);

      // Verify the signature
      return ed.verify(signature, dataToVerify, signingKey.publicKey);
    } catch (error) {
      console.error("Signature verification error:", error);
      return false;
    }
  }
}
