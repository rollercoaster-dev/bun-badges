/**
 * Type definitions for Open Badges 3.0 credentials
 * Based on the W3C Verifiable Credentials Data Model and Open Badges 3.0 specification
 */

/**
 * Base type for credential subject
 */
export interface CredentialSubject {
  id?: string;
  type: string;
}

/**
 * Email credential subject
 */
export interface EmailCredentialSubject extends CredentialSubject {
  type: "EmailCredentialSubject";
  email: string;
  hashed?: boolean;
  salt?: string;
}

/**
 * Proof for verifiable credentials
 */
export interface CredentialProof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue: string;
}

/**
 * Ed25519Signature2020 proof
 */
export interface Ed25519Signature extends CredentialProof {
  type: "Ed25519Signature2020";
}

/**
 * Issuer profile information
 */
export interface IssuerProfile {
  id: string;
  type: "Profile";
  name?: string;
  url?: string;
  description?: string;
  email?: string;
  publicKey?: PublicKey[];
}

/**
 * Public key for verification
 */
export interface PublicKey {
  id: string;
  type: string;
  controller: string;
  publicKeyJwk?: {
    kty: string;
    crv: string;
    x: string;
    [key: string]: any;
  };
}

/**
 * Achievement criteria
 */
export interface AchievementCriteria {
  narrative: string;
  [key: string]: any;
}

/**
 * Open Badge Credential (OB3.0)
 */
export interface OpenBadgeCredential {
  "@context": string[];
  id: string;
  type: string[];
  issuer: IssuerProfile | string;
  issuanceDate: string;
  name?: string;
  description?: string;
  credentialSubject: {
    id?: string;
    type: string;
    achievement: {
      id: string;
      type: string[];
      name: string;
      description?: string;
      criteria?: AchievementCriteria;
      image?: {
        id: string;
        type: string;
      };
    };
    [key: string]: any;
  };
  evidence?: Array<{
    id: string;
    type: string;
    [key: string]: any;
  }>;
  proof?: CredentialProof;
}

/**
 * Open Badge Class/Achievement Definition (OB3.0)
 */
export interface OpenBadgeAchievement {
  "@context": string[];
  id: string;
  type: string[];
  name: string;
  description?: string;
  image?: {
    id: string;
    type: string;
  };
  criteria?: AchievementCriteria;
  issuer: IssuerProfile | string;
}

/**
 * Revocation status
 */
export interface RevocationStatus {
  id: string;
  type: "RevocationList2020Status";
  statusListIndex: string;
  statusListCredential: string;
}
