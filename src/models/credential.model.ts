/**
 * Type definitions for Open Badges 3.0 credentials
 * Based on the W3C Verifiable Credentials Data Model and Open Badges 3.0 specification
 */

/**
 * JSON-LD Context type
 */
export type JsonLdContext = string | string[] | Record<string, string>;

/**
 * Base type for all JSON-LD objects
 */
export interface JsonLdObject {
  "@context": JsonLdContext;
  id: string;
  type: string | string[];
}

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
 * Evidence for an achievement
 */
export interface Evidence {
  id: string;
  type: string;
  narrative?: string;
  genre?: string;
  audience?: string;
  description?: string;
}

/**
 * Credential status for revocation
 */
export interface CredentialStatus {
  id: string;
  type: string;
  statusListIndex: string;
  statusListCredential: string;
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
 * Image object for badge display
 */
export interface ImageObject {
  id: string;
  type: string;
  width?: number;
  height?: number;
  caption?: string;
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
  publicKeyJwk?: PublicKeyJwk;
}

/**
 * JSON Web Key
 */
export interface PublicKeyJwk {
  kty: string;
  crv: string;
  x: string;
  kid?: string;
  alg?: string;
  use?: string;
}

/**
 * Achievement criteria
 */
export interface AchievementCriteria {
  narrative: string;
  required?: boolean;
  threshold?: {
    min?: number;
    max?: number;
  };
}

/**
 * Achievement definition
 */
export interface Achievement {
  id: string;
  type: string[];
  name: string;
  description?: string;
  criteria?: AchievementCriteria;
  image?: ImageObject;
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
  credentialSubject: OpenBadgeCredentialSubject;
  evidence?: Evidence[];
  credentialStatus?: CredentialStatus;
  proof?: CredentialProof;
}

/**
 * Credential subject with achievement
 */
export interface OpenBadgeCredentialSubject extends CredentialSubject {
  achievement: Achievement;
  identity?: string;
  hashed?: boolean;
  salt?: string;
  email?: string;
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
  image?: ImageObject;
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

/**
 * Type guard to check if an object is an OpenBadgeCredential
 */
export function isOpenBadgeCredential(
  obj: unknown,
): obj is OpenBadgeCredential {
  if (!obj || typeof obj !== "object") return false;

  const credential = obj as Partial<OpenBadgeCredential>;

  return (
    Array.isArray(credential["@context"]) &&
    typeof credential.id === "string" &&
    Array.isArray(credential.type) &&
    (credential.type.includes("VerifiableCredential") ||
      credential.type.includes("OpenBadgeCredential")) &&
    typeof credential.issuanceDate === "string" &&
    (typeof credential.issuer === "string" ||
      (typeof credential.issuer === "object" && credential.issuer !== null)) &&
    typeof credential.credentialSubject === "object" &&
    credential.credentialSubject !== null
  );
}

/**
 * Type guard to check if an object is an Evidence
 */
export function isEvidence(obj: unknown): obj is Evidence {
  if (!obj || typeof obj !== "object") return false;

  const evidence = obj as Partial<Evidence>;

  return typeof evidence.id === "string" && typeof evidence.type === "string";
}

/**
 * Type guard to check if an object is an Achievement
 */
export function isAchievement(obj: unknown): obj is Achievement {
  if (!obj || typeof obj !== "object") return false;

  const achievement = obj as Partial<Achievement>;

  return (
    typeof achievement.id === "string" &&
    Array.isArray(achievement.type) &&
    typeof achievement.name === "string"
  );
}
