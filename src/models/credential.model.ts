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
 * DID credential subject
 */
export interface DidCredentialSubject extends CredentialSubject {
  type: "DidCredentialSubject";
  id: string; // A DID URI
}

/**
 * URL credential subject
 */
export interface UrlCredentialSubject extends CredentialSubject {
  type: "UrlCredentialSubject";
  id: string; // A URL
}

/**
 * Phone credential subject
 */
export interface PhoneCredentialSubject extends CredentialSubject {
  type: "PhoneCredentialSubject";
  phone: string;
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
 * Status List 2021 status type
 */
export interface StatusList2021Entry extends CredentialStatus {
  type: "StatusList2021Entry";
  statusPurpose: "revocation" | "suspension";
}

/**
 * Base Proof for verifiable credentials
 */
export interface CredentialProof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue?: string;
  jws?: string;
}

/**
 * Ed25519Signature2020 proof
 */
export interface Ed25519Signature2020 extends CredentialProof {
  type: "Ed25519Signature2020";
  proofValue: string;
}

/**
 * JsonWebSignature2020 proof
 */
export interface JsonWebSignature2020 extends CredentialProof {
  type: "JsonWebSignature2020";
  jws: string;
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
  publicKeyMultibase?: string;
}

/**
 * JSON Web Key
 */
export interface PublicKeyJwk {
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  n?: string;
  e?: string;
  kid?: string;
  alg?: string;
  use?: string;
}

/**
 * Credential Schema
 */
export interface CredentialSchema {
  id: string;
  type: string;
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
  creator?: IssuerProfile | string;
}

/**
 * Achievement with specific types
 */
export interface AchievementCredential extends Achievement {
  type: ["AchievementCredential"];
  achievementType?: string;
  tags?: string[];
  alignment?: AlignmentObject[];
}

/**
 * Alignment object for standards alignment
 */
export interface AlignmentObject {
  type: "Alignment";
  targetName: string;
  targetUrl: string;
  targetDescription?: string;
  targetFramework?: string;
  targetCode?: string;
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
  evidence?: Evidence[] | Evidence;
  credentialStatus?: CredentialStatus;
  credentialSchema?: CredentialSchema;
  proof?: CredentialProof;
  expirationDate?: string;
  refreshService?: {
    id: string;
    type: string;
  };
  termsOfUse?: {
    id?: string;
    type: string;
    obligation?: string;
    prohibition?: string;
    permission?: string;
  }[];
}

/**
 * Credential subject with achievement
 */
export interface OpenBadgeCredentialSubject extends CredentialSubject {
  achievement: Achievement;
  identity?: string;
  hashed?: boolean;
  salt?: string;
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
  alignment?: AlignmentObject[];
  tags?: string[];
}

/**
 * Base Verifiable Credential interface without specific credential subject requirements
 * This allows StatusList2021Credential to share properties with OpenBadgeCredential
 * without requiring the achievement property
 */
export interface BaseVerifiableCredential {
  "@context": string[];
  id: string;
  type: string[];
  issuer: IssuerProfile | string;
  issuanceDate: string;
  name?: string;
  description?: string;
  credentialSubject: {
    id: string;
    type: string;
    [key: string]: unknown;
  };
  evidence?: Evidence[] | Evidence;
  credentialStatus?: CredentialStatus;
  credentialSchema?: CredentialSchema;
  proof?: CredentialProof;
  expirationDate?: string;
  refreshService?: {
    id: string;
    type: string;
  };
  termsOfUse?: {
    id?: string;
    type: string;
    obligation?: string;
    prohibition?: string;
    permission?: string;
  }[];
}

/**
 * Status List 2021 Credential
 */
export interface StatusList2021Credential extends BaseVerifiableCredential {
  type: ["VerifiableCredential", "StatusList2021Credential"];
  credentialSubject: {
    id: string;
    type: "StatusList2021";
    statusPurpose: "revocation" | "suspension";
    encodedList: string; // Base64-encoded bitstring
  };
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
 * Type guard to check if an object is a StatusList2021Credential
 */
export function isStatusList2021Credential(
  obj: unknown,
): obj is StatusList2021Credential {
  if (!obj || typeof obj !== "object") return false;

  // Check if it has the basic structure of a BaseVerifiableCredential
  const credential = obj as Partial<BaseVerifiableCredential>;

  if (!Array.isArray(credential.type)) return false;
  if (!credential.type.includes("StatusList2021Credential")) return false;
  if (typeof credential["@context"] !== "object") return false;
  if (typeof credential.id !== "string") return false;
  if (typeof credential.issuanceDate !== "string") return false;
  if (
    typeof credential.credentialSubject !== "object" ||
    credential.credentialSubject === null
  )
    return false;

  // Check the specific StatusList2021 subject properties
  const subject = credential.credentialSubject as Partial<
    StatusList2021Credential["credentialSubject"]
  >;

  return (
    typeof subject === "object" &&
    subject !== null &&
    subject.type === "StatusList2021" &&
    typeof subject.statusPurpose === "string" &&
    typeof subject.encodedList === "string"
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
