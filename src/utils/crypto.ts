/**
 * Crypto utilities
 *
 * This module provides utilities for cryptographic operations.
 */

import * as crypto from "crypto";
import { KeyAlgorithm } from "../services/key-management.service";

/**
 * Get the appropriate signing algorithm for a key algorithm
 * @param algorithm The key algorithm
 * @returns The crypto signing algorithm
 */
export function getSigningAlgorithm(algorithm: KeyAlgorithm): string {
  switch (algorithm) {
    case KeyAlgorithm.ES256:
      return "sha256";
    case KeyAlgorithm.EdDSA:
      // For EdDSA, we need to use a different approach
      // This is a simplified version for testing
      return "sha512";
    case KeyAlgorithm.RS256:
    default:
      return "RSA-SHA256";
  }
}

/**
 * Get the appropriate JWT algorithm name for a key algorithm
 * @param algorithm The key algorithm
 * @returns The JWT algorithm name
 */
export function getJwtAlgorithm(algorithm: KeyAlgorithm): string {
  switch (algorithm) {
    case KeyAlgorithm.ES256:
      return "ES256";
    case KeyAlgorithm.EdDSA:
      return "EdDSA";
    case KeyAlgorithm.RS256:
    default:
      return "RS256";
  }
}

/**
 * Sign data with a private key
 * @param data The data to sign
 * @param privateKey The private key to sign with
 * @param algorithm The key algorithm
 * @returns The signature
 */
export function signData(
  data: string,
  privateKey: string,
  algorithm: KeyAlgorithm,
): string {
  const signAlgorithm = getSigningAlgorithm(algorithm);
  const signer = crypto.createSign(signAlgorithm);
  signer.update(data);
  return signer.sign(privateKey, "base64url");
}

/**
 * Verify a signature
 * @param data The data that was signed
 * @param signature The signature to verify
 * @param publicKey The public key to verify with
 * @param algorithm The key algorithm
 * @returns Whether the signature is valid
 */
export function verifySignature(
  data: string,
  signature: string,
  publicKey: string,
  algorithm: KeyAlgorithm,
): boolean {
  const verifyAlgorithm = getSigningAlgorithm(algorithm);
  const verifier = crypto.createVerify(verifyAlgorithm);
  verifier.update(data);
  return verifier.verify(publicKey, signature, "base64url");
}
