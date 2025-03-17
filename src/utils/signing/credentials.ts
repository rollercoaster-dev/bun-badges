import { JsonWebSignature } from "@transmute/json-web-signature";
import { createJsonWebKey, KeyPair } from "./keys";

export interface SigningOptions {
  /**
   * The keypair to use for signing
   */
  keyPair: KeyPair;

  /**
   * The date to use in the proof (defaults to now)
   */
  date?: string;
}

/**
 * Creates a document loader for JSON-LD contexts
 */
function createDocumentLoader() {
  return async (iri: string) => {
    // For now, we'll only handle the basic contexts
    // In a production environment, you'd want to implement proper context loading
    if (iri === "https://www.w3.org/2018/credentials/v1") {
      return {
        documentUrl: iri,
        document: {
          "@context": {
            "@version": 1.1,
            "@protected": true,
            id: "@id",
            type: "@type",
            VerifiableCredential: {
              "@id": "https://www.w3.org/2018/credentials#VerifiableCredential",
              "@context": {
                "@version": 1.1,
                "@protected": true,
                id: "@id",
                type: "@type",
                cred: "https://www.w3.org/2018/credentials#",
                sec: "https://w3id.org/security#",
                xsd: "http://www.w3.org/2001/XMLSchema#",
                credentialSubject: {
                  "@id": "cred:credentialSubject",
                  "@type": "@id",
                },
                issuer: { "@id": "cred:issuer", "@type": "@id" },
                issuanceDate: {
                  "@id": "cred:issuanceDate",
                  "@type": "xsd:dateTime",
                },
              },
            },
          },
        },
      };
    }

    if (iri === "https://w3id.org/security/suites/jws-2020/v1") {
      return {
        documentUrl: iri,
        document: {
          "@context": {
            "@version": 1.1,
            id: "@id",
            type: "@type",
            JsonWebSignature2020: {
              "@id": "https://w3id.org/security#JsonWebSignature2020",
              "@context": {
                "@protected": true,
                id: "@id",
                type: "@type",
                challenge: "https://w3id.org/security#challenge",
                created: {
                  "@id": "http://purl.org/dc/terms/created",
                  "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
                },
                domain: "https://w3id.org/security#domain",
                expires: {
                  "@id": "https://w3id.org/security#expiration",
                  "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
                },
                jws: "https://w3id.org/security#jws",
                nonce: "https://w3id.org/security#nonce",
                proofPurpose: {
                  "@id": "https://w3id.org/security#proofPurpose",
                  "@type": "@vocab",
                  "@context": {
                    "@protected": true,
                    id: "@id",
                    type: "@type",
                    assertionMethod: {
                      "@id": "https://w3id.org/security#assertionMethod",
                      "@type": "@id",
                      "@container": "@set",
                    },
                    authentication: {
                      "@id": "https://w3id.org/security#authenticationMethod",
                      "@type": "@id",
                      "@container": "@set",
                    },
                  },
                },
                verificationMethod: {
                  "@id": "https://w3id.org/security#verificationMethod",
                  "@type": "@id",
                },
              },
            },
          },
        },
      };
    }

    throw new Error(`Context ${iri} not implemented`);
  };
}

/**
 * Signs a credential using JSON-LD Signatures
 * @param credential - The credential to sign
 * @param options - Signing options
 * @returns The signed credential
 */
export async function signCredential<T extends Record<string, any>>(
  credential: T,
  options: SigningOptions,
): Promise<T & { proof: any }> {
  const key = await createJsonWebKey(options.keyPair);

  const suite = new JsonWebSignature({
    key,
    date: options.date || new Date().toISOString(),
  });

  // Ensure the credential has the required context for JSON-LD signatures
  const credentialWithContext = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
    ],
    ...credential,
  };

  // Create the proof
  const proof = await suite.createProof({
    document: credentialWithContext,
    purpose: {
      proofPurpose: "assertionMethod",
      verificationMethod: `${options.keyPair.controller}#${options.keyPair.publicKey}`,
      created: options.date || new Date().toISOString(),
    },
    documentLoader: createDocumentLoader(),
  });

  // Add the proof to the credential
  return {
    ...credentialWithContext,
    proof,
  };
}

/**
 * Verifies a signed credential
 * @param signedCredential - The signed credential to verify
 * @param publicKey - The public key to verify against
 * @returns True if the signature is valid, false otherwise
 */
export async function verifyCredential(
  signedCredential: Record<string, any>,
  publicKey: string,
): Promise<boolean> {
  try {
    const key = await createJsonWebKey({
      publicKey,
      privateKey: "", // Not needed for verification
      controller: signedCredential.issuer.id,
      type: "Ed25519VerificationKey2018",
    });

    const suite = new JsonWebSignature({
      key,
    });

    // Verify the proof
    const result = await suite.verifyProof({
      proof: signedCredential.proof,
      document: signedCredential,
      documentLoader: createDocumentLoader(),
    });

    return result.verified;
  } catch (error) {
    console.error("Verification failed:", error);
    return false;
  }
}
