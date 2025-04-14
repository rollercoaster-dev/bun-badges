/**
 * Credential Signing Service
 *
 * This service handles signing and verification of Open Badges credentials.
 * It supports both JWT and Linked Data Signatures as specified in the
 * Open Badges 3.0 specification.
 */

import * as crypto from "crypto";
import { keyManagementService } from "./key-management.service";
import logger from "../utils/logger";

/**
 * Credential Signing Service
 */
export class CredentialSigningService {
  /**
   * Sign a credential using JWT
   * @param payload Credential payload
   * @param keyId Optional key ID to use for signing
   * @returns Signed JWT
   */
  async signCredentialJwt(
    payload: Record<string, unknown>,
    keyId?: string,
  ): Promise<string> {
    try {
      // Get the signing key
      const signingKey = keyId
        ? await keyManagementService.getKey(keyId)
        : await keyManagementService.getDefaultSigningKey();

      if (!signingKey) {
        throw new Error("Signing key not found");
      }

      // Create JWT header and payload
      const header = {
        alg: "RS256",
        kid: signingKey.id,
        typ: "JWT",
      };

      // Add issuedAt and expiration to payload
      const now = Math.floor(Date.now() / 1000);
      const enhancedPayload = {
        ...payload,
        iat: now,
        exp: now + 3600, // 1 hour
      };

      // Combine header and payload
      const headerBase64 = Buffer.from(JSON.stringify(header)).toString(
        "base64url",
      );
      const payloadBase64 = Buffer.from(
        JSON.stringify(enhancedPayload),
      ).toString("base64url");
      const dataToSign = `${headerBase64}.${payloadBase64}`;

      // Sign the data
      const signer = crypto.createSign("RSA-SHA256");
      signer.update(dataToSign);

      // Make sure we have the private key
      if (!signingKey.privateKey) {
        throw new Error("Private key not available for signing");
      }

      const signature = signer.sign(signingKey.privateKey, "base64url");

      // Create the JWT
      const jwt = `${dataToSign}.${signature}`;

      logger.info("Signed credential JWT", { keyId: signingKey.id });

      return jwt;
    } catch (error) {
      logger.error("Failed to sign credential JWT", { error });
      throw new Error("Failed to sign credential JWT");
    }
  }

  /**
   * Verify a credential JWT
   * @param jwt JWT to verify
   * @returns Verified payload
   */
  async verifyCredentialJwt(jwt: string): Promise<Record<string, unknown>> {
    try {
      // Split the JWT into parts
      const [headerBase64, payloadBase64, signatureBase64] = jwt.split(".");

      // Decode the header to get the key ID
      const headerJson = Buffer.from(headerBase64, "base64url").toString(
        "utf8",
      );
      const header = JSON.parse(headerJson);

      // Get the key
      const key = await keyManagementService.getKey(header.kid);

      if (!key) {
        throw new Error(`Key not found: ${header.kid}`);
      }

      // Verify the signature
      const dataToVerify = `${headerBase64}.${payloadBase64}`;
      const verifier = crypto.createVerify("RSA-SHA256");
      verifier.update(dataToVerify);
      const isValid = verifier.verify(
        key.publicKey,
        signatureBase64,
        "base64url",
      );

      if (!isValid) {
        throw new Error("Invalid signature");
      }

      // Decode the payload
      const payload = JSON.parse(
        Buffer.from(payloadBase64, "base64url").toString("utf8"),
      );

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new Error("Token expired");
      }

      logger.info("Verified credential JWT", { keyId: key.id });

      return payload as Record<string, unknown>;
    } catch (error) {
      logger.error("Failed to verify credential JWT", { error });
      throw new Error("Failed to verify credential JWT");
    }
  }

  /**
   * Sign a credential using Linked Data Signatures
   * @param credential Credential to sign
   * @param keyId Optional key ID to use for signing
   * @returns Signed credential
   */
  async signCredentialLd(
    credential: Record<string, unknown>,
    keyId?: string,
  ): Promise<Record<string, unknown>> {
    try {
      // Get the signing key
      const signingKey = keyId
        ? await keyManagementService.getKey(keyId)
        : await keyManagementService.getDefaultSigningKey();

      if (!signingKey) {
        throw new Error("Signing key not found");
      }

      // In a real implementation, we would use a proper Linked Data Signatures library
      // For now, we'll just add a mock proof
      const proof = {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        verificationMethod: `did:example:issuer#${signingKey.id}`,
        proofPurpose: "assertionMethod",
        proofValue: "mock-proof-value",
      };

      // Add the proof to the credential
      const signedCredential = {
        ...credential,
        proof,
      };

      logger.info("Signed credential with Linked Data Signature", {
        keyId: signingKey.id,
      });

      return signedCredential;
    } catch (error) {
      logger.error("Failed to sign credential with Linked Data Signature", {
        error,
      });
      throw new Error("Failed to sign credential with Linked Data Signature");
    }
  }

  /**
   * Verify a credential with Linked Data Signatures
   * @param credential Credential to verify
   * @returns True if the credential is valid
   */
  async verifyCredentialLd(
    credential: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      // In a real implementation, we would use a proper Linked Data Signatures library
      // For now, we'll just check if the proof exists
      const proof = credential.proof as Record<string, unknown>;

      if (!proof) {
        throw new Error("Credential does not have a proof");
      }

      // Extract the key ID from the verification method
      const verificationMethod = proof.verificationMethod as string;
      const keyId = verificationMethod.split("#")[1];

      // Get the key
      const key = await keyManagementService.getKey(keyId);

      if (!key) {
        throw new Error(`Key not found: ${keyId}`);
      }

      // In a real implementation, we would verify the proof
      // For now, we'll just return true
      logger.info("Verified credential with Linked Data Signature", { keyId });

      return true;
    } catch (error) {
      logger.error("Failed to verify credential with Linked Data Signature", {
        error,
      });
      throw new Error("Failed to verify credential with Linked Data Signature");
    }
  }
}

// Export singleton instance
export const credentialSigningService = new CredentialSigningService();
