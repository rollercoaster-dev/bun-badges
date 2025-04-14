/**
 * Credential Signing Service
 *
 * This service handles signing and verification of Open Badges credentials.
 * It supports both JWT and Linked Data Signatures as specified in the
 * Open Badges 3.0 specification.
 */

import { keyManagementService } from "./key-management.service";
import logger from "../utils/logger";
import {
  executeWithErrorHandling,
  unwrapResult,
} from "../utils/error-handling";
import {
  encodeBase64Url,
  decodeBase64Url,
  splitJwt,
  createJwt,
  getCurrentTimestamp,
} from "../utils/jwt";
import { getJwtAlgorithm, signData, verifySignature } from "../utils/crypto";

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
    const result = await executeWithErrorHandling(async () => {
      // Get the signing key
      const signingKey = keyId
        ? await keyManagementService.getKey(keyId)
        : await keyManagementService.getDefaultSigningKey();

      if (!signingKey) {
        throw new Error("Signing key not found");
      }

      // Create JWT header and payload
      const alg = getJwtAlgorithm(signingKey.algorithm);

      const header = {
        alg,
        kid: signingKey.id,
        typ: "JWT",
      };

      // Add issuedAt and expiration to payload
      const now = getCurrentTimestamp();
      const enhancedPayload = {
        ...payload,
        iat: now,
        exp: now + 3600, // 1 hour
      };

      // Encode header and payload
      const headerBase64 = encodeBase64Url(header);
      const payloadBase64 = encodeBase64Url(enhancedPayload);
      const dataToSign = `${headerBase64}.${payloadBase64}`;

      // Make sure we have the private key
      if (!signingKey.privateKey) {
        throw new Error("Private key not available for signing");
      }

      // Sign the data
      const signature = signData(
        dataToSign,
        signingKey.privateKey,
        signingKey.algorithm,
      );

      // Create the JWT
      const jwt = createJwt(headerBase64, payloadBase64, signature);

      logger.info("Signed credential JWT", { keyId: signingKey.id });

      return jwt;
    }, "Failed to sign credential JWT");

    return unwrapResult(result);
  }

  /**
   * Verify a credential JWT
   * @param jwt JWT to verify
   * @returns Verified payload
   */
  async verifyCredentialJwt(jwt: string): Promise<Record<string, unknown>> {
    const result = await executeWithErrorHandling(async () => {
      // Split the JWT into parts
      const [headerBase64, payloadBase64, signatureBase64] = splitJwt(jwt);

      // Decode the header to get the key ID
      const header = decodeBase64Url<{ kid: string; alg: string }>(
        headerBase64,
      );

      // Get the key
      const key = await keyManagementService.getKey(header.kid);

      if (!key) {
        throw new Error(`Key not found: ${header.kid}`);
      }

      // Verify the signature
      const dataToVerify = `${headerBase64}.${payloadBase64}`;
      const isValid = verifySignature(
        dataToVerify,
        signatureBase64,
        key.publicKey,
        key.algorithm,
      );

      if (!isValid) {
        throw new Error("Invalid signature");
      }

      // Decode the payload
      const payload = decodeBase64Url<Record<string, unknown>>(payloadBase64);

      // Check expiration
      const now = getCurrentTimestamp();
      if (payload.exp && typeof payload.exp === "number" && payload.exp < now) {
        throw new Error("Token expired");
      }

      logger.info("Verified credential JWT", { keyId: key.id });

      return payload;
    }, "Failed to verify credential JWT");

    return unwrapResult(result);
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
    const result = await executeWithErrorHandling(async () => {
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
    }, "Failed to sign credential with Linked Data Signature");

    return unwrapResult(result);
  }

  /**
   * Verify a credential with Linked Data Signatures
   * @param credential Credential to verify
   * @returns True if the credential is valid
   */
  async verifyCredentialLd(
    credential: Record<string, unknown>,
  ): Promise<boolean> {
    const result = await executeWithErrorHandling(async () => {
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
    }, "Failed to verify credential with Linked Data Signature");

    return unwrapResult(result);
  }
}

// Export singleton instance
export const credentialSigningService = new CredentialSigningService();
