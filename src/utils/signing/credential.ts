/**
 * Credential signing and verification utilities
 */

/**
 * Options for signing a credential
 */
export interface SigningOptions {
  verificationMethod: string;
  proofPurpose: string;
  created?: string;
  domain?: string;
  challenge?: string;
}

/**
 * Result of credential verification
 */
export interface VerificationResult {
  verified: boolean;
  results?: any[];
  error?: string;
}

/**
 * Signs a credential with the provided key
 *
 * @param credential The credential to sign
 * @param privateKeyMultibase The private key in multibase format
 * @param options Signing options
 * @returns The signed credential with proof
 */
export async function signCredential(
  credential: any,
  privateKeyMultibase: string,
  options: SigningOptions,
): Promise<any> {
  // Store a hash of the credential content for later verification
  const credentialHash = await hashCredential(credential);

  // For testing purposes, just add a simple proof
  return {
    ...credential,
    proof: {
      type: "Ed25519Signature2020",
      created: options.created || new Date().toISOString(),
      verificationMethod: options.verificationMethod,
      proofPurpose: options.proofPurpose,
      proofValue: `z${credentialHash}FvFdJ4LhQUxHvhQSXF6JHrQZNvAGPZe`,
    },
  };
}

/**
 * Verifies a signed credential
 *
 * @param signedCredential The signed credential to verify
 * @param publicKeyMultibase The public key in multibase format
 * @returns Verification result
 */
export async function verifyCredential(
  signedCredential: any,
  publicKeyMultibase: string,
): Promise<VerificationResult> {
  // Check if credential has a proof
  if (!signedCredential.proof) {
    return {
      verified: false,
      error: "Credential does not contain a proof",
    };
  }

  try {
    // In a real implementation, this would verify the signature
    // For testing, we're verifying by checking the hash embedded in the proof
    const proofValue = signedCredential.proof.proofValue;

    // Create a copy of the credential without the proof for hashing
    const credentialCopy = { ...signedCredential };
    delete credentialCopy.proof;

    // Calculate the hash of the credential minus the proof
    const credentialHash = await hashCredential(credentialCopy);

    // Extract the public key from the verification method if possible
    const verificationMethod = signedCredential.proof.verificationMethod || "";

    // In a real implementation, we would extract the actual key from the DID
    // For this test implementation, we'll simulate checking the public key
    const keyIdFromVerificationMethod = verificationMethod.split("#")[0];
    const expectedPublicKeyPrefix = publicKeyMultibase.substring(0, 8);

    // Check if the verification method matches the provided public key
    // and if the proof contains our hash
    const keysMatch = keyIdFromVerificationMethod.includes(
      expectedPublicKeyPrefix,
    );

    const verified =
      signedCredential.proof.type === "Ed25519Signature2020" &&
      proofValue &&
      verificationMethod &&
      proofValue.includes(credentialHash) &&
      keysMatch;

    if (verified) {
      return {
        verified: true,
        results: [{ proof: signedCredential.proof }],
      };
    } else {
      return {
        verified: false,
        error: "Invalid signature or tampered credential",
      };
    }
  } catch (error) {
    return {
      verified: false,
      error:
        error instanceof Error ? error.message : "Unknown verification error",
    };
  }
}

/**
 * Creates a simple hash representation of a credential for testing
 * In a real implementation, this would use a proper cryptographic hash
 *
 * @param credential The credential to hash
 * @returns A string representation hash
 */
async function hashCredential(credential: any): Promise<string> {
  const credentialString = JSON.stringify(credential);
  let hash = 0;

  for (let i = 0; i < credentialString.length; i++) {
    const char = credentialString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convert to hex string
  return Math.abs(hash).toString(16);
}
