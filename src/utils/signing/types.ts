/**
 * Interface for a JSON-LD proof
 */
export interface JsonLdProof {
  type: string;
  created: string;
  proofPurpose: string;
  verificationMethod: string;
  jws: string;
  [key: string]: unknown;
}

/**
 * Interface for a JSON-LD document
 */
export interface JsonLdDocument {
  "@context":
    | string
    | Record<string, unknown>
    | (string | Record<string, unknown>)[];
  [key: string]: unknown;
}

/**
 * Interface for a credential issuer
 */
export interface CredentialIssuer {
  id: string;
  [key: string]: unknown;
}

/**
 * Interface for a verifiable credential
 */
export interface VerifiableCredential extends JsonLdDocument {
  issuer: CredentialIssuer;
  [key: string]: unknown;
}

/**
 * Interface for a signed credential
 */
export interface SignedCredential extends VerifiableCredential {
  proof: JsonLdProof;
}
