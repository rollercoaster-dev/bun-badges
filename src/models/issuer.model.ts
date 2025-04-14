import { z } from "zod";
import type { OB2, OB3, Shared } from "@/utils/openbadges-types"; // Import standard types

// Define the issuer profile validation schema based on Open Badges 2.0/2.1 and 3.0
// This schema defines the structure used internally and for database validation,
// designed to be compatible with properties from both OB2 Profile and OB3 Issuer.
export const issuerProfileSchema = z.object({
  // Core required fields (OB 2.0 and 3.0)
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),

  // Optional fields
  description: z.string().optional(),
  email: z.string().email("Must be a valid email").optional(),
  image: z.string().url("Must be a valid URL").optional(),
  telephone: z.string().optional(),

  // OB 3.0 Public Key Management
  publicKey: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["Ed25519VerificationKey2020", "RsaVerificationKey2018"]),
        controller: z.string(),
        publicKeyJwk: z
          .object({
            kty: z.string(),
            crv: z.string().optional(),
            x: z.string().optional(),
            y: z.string().optional(),
            n: z.string().optional(),
            e: z.string().optional(),
          })
          .optional(),
        publicKeyPem: z.string().optional(),
      }),
    )
    .optional(),

  // OB 3.0 Cross-Version Linking
  otherIdentifier: z
    .array(
      z.object({
        type: z.array(z.literal("IdentifierEntry")),
        identifier: z.string().url(),
        identifierType: z.literal("identifier"),
      }),
    )
    .optional(),

  // Extended metadata (optional)
  location: z
    .object({
      name: z.string(),
      address: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    })
    .optional(),

  // Type information (will be set automatically based on context, OB2 or OB3)
  type: z.union([
    z.literal("Profile"), // OB2
    z.literal("Issuer"), // OB3 (though often an array like ["Issuer", "Profile"])
    z.literal("https://purl.imsglobal.org/spec/vc/ob/vocab.html#Profile"), // Explicit OB3 type
  ]),
});

// Validation schema for creating a new issuer profile
export const createIssuerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),
  description: z.string().optional(),
  email: z.string().email("Must be a valid email").optional(),
  image: z.string().url("Must be a valid URL").optional(),
  // Optional OB 3.0 fields for creation
  publicKey: issuerProfileSchema.shape.publicKey.optional(),
});

// Validation schema for updating an existing issuer profile
export const updateIssuerSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  url: z.string().url("Must be a valid URL").optional(),
  description: z.string().optional(),
  email: z.string().email("Must be a valid email").optional(),
  image: z.string().url("Must be a valid URL").optional(),
  // Optional OB 3.0 fields for updates
  publicKey: issuerProfileSchema.shape.publicKey.optional(),
});

// Types derived from the schemas (remain unchanged for internal use)
export type IssuerProfile = z.infer<typeof issuerProfileSchema>;
export type CreateIssuerDto = z.infer<typeof createIssuerSchema>;
export type UpdateIssuerDto = z.infer<typeof updateIssuerSchema>;

// --- Standard Type Aliases for Clarity ---
export type OB2IssuerProfile = OB2.Profile;
export type OB3IssuerProfile = OB3.Issuer;

// --- JSON-LD Output Types (Aligned with Standards) ---

/**
 * Represents the structure for an Open Badges 2.0 Issuer Profile JSON-LD response.
 * Extends the standard OB2.Profile type.
 */
export interface IssuerJsonLdV2 extends OB2.Profile {
  "@context": "https://w3id.org/openbadges/v2";
  // Properties from OB2.Profile are inherited (id, type, name, url, etc.)
  // Add OB3 relation if applicable (specific to this implementation's output)
  related?: Array<{
    type: ["https://purl.imsglobal.org/spec/vc/ob/vocab.html#Profile"]; // Explicit OB3 Profile type
    id: Shared.IRI; // Use IRI type
    version: "Open Badges v3p0";
  }>;
}

/**
 * Represents the structure for an Open Badges 3.0 Issuer Profile JSON-LD response.
 * Extends the standard OB3.Issuer type.
 */
export interface IssuerJsonLdV3 extends OB3.Issuer {
  "@context": (
    | "https://www.w3.org/ns/did/v1"
    | "https://www.w3.org/ns/credentials/v2"
    | "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"
  )[];
  // Properties from OB3.Issuer are inherited (id, type, name, url, verificationMethod, etc.)
  // Removed non-standard alsoKnownAs and otherIdentifier fields for better alignment.
}

// Function to construct Open Badges 2.0 compliant Issuer JSON-LD
export function constructIssuerJsonLd(
  hostUrl: string,
  issuerId: string,
  issuer: CreateIssuerDto | (UpdateIssuerDto & { name: string; url: string }),
): IssuerJsonLdV2 {
  // Return type updated to IssuerJsonLdV2
  const profileId = `${hostUrl}/issuers/${issuerId}` as Shared.IRI;

  // Explicitly construct the full object for better type safety
  const issuerV2: IssuerJsonLdV2 = {
    "@context": "https://w3id.org/openbadges/v2",
    type: "Profile",
    id: profileId,
    name: issuer.name,
    url: issuer.url as Shared.IRI,
    description: issuer.description, // Directly assign, undefined if not present
    email: issuer.email, // Directly assign, undefined if not present
    image: issuer.image ? (issuer.image as Shared.IRI) : undefined, // Assign with cast if present
    // Initialize optional fields that might be added
    related: undefined,
  };

  // Add OB 3.0 relation if public key is present
  if (issuer.publicKey && issuer.publicKey.length > 0) {
    const hostname = new URL(hostUrl).hostname;
    const didId = `did:web:${hostname}:issuers:${issuerId}` as Shared.IRI;
    issuerV2.related = [
      {
        type: ["https://purl.imsglobal.org/spec/vc/ob/vocab.html#Profile"],
        id: didId,
        version: "Open Badges v3p0",
      },
    ];
  }

  return issuerV2;
}

// Function to construct Open Badges 3.0 compliant Issuer JSON-LD
export function constructIssuerJsonLdV3(
  hostUrl: string,
  issuerId: string,
  issuer: CreateIssuerDto | (UpdateIssuerDto & { name: string; url: string }),
): IssuerJsonLdV3 {
  // Return type updated to IssuerJsonLdV3
  const hostname = new URL(hostUrl).hostname;
  const didId = `did:web:${hostname}:issuers:${issuerId}` as Shared.IRI;

  // Explicitly construct the full object
  const issuerV3: IssuerJsonLdV3 = {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id: didId, // The DID identifier is the primary ID
    type: ["Issuer", "Profile"],
    name: issuer.name,
    url: issuer.url as Shared.IRI, // The primary URL of the issuer
    description: issuer.description,
    email: issuer.email,
    image: issuer.image ? (issuer.image as Shared.IRI) : undefined,
    verificationMethod: issuer.publicKey
      ? issuer.publicKey.map((pk) => ({
          id: pk.id as Shared.IRI,
          type: pk.type,
          controller: pk.controller as Shared.IRI,
          publicKeyJwk: pk.publicKeyJwk,
          ...(pk.publicKeyPem && { publicKeyPem: pk.publicKeyPem }),
        }))
      : [], // Provide empty array if no keys
  };

  return issuerV3;
}
