import { z } from "zod";

// Define the issuer profile validation schema based on Open Badges 2.0/2.1 and 3.0
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

  // Type information (will be set automatically)
  type: z.union([
    z.literal("Profile"),
    z.literal("Issuer"),
    z.literal("https://purl.imsglobal.org/spec/vc/ob/vocab.html#Profile"),
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

// Types derived from the schemas
export type IssuerProfile = z.infer<typeof issuerProfileSchema>;
export type CreateIssuerDto = z.infer<typeof createIssuerSchema>;
export type UpdateIssuerDto = z.infer<typeof updateIssuerSchema>;

// Function to construct Open Badges 2.0 compliant Issuer JSON-LD
export function constructIssuerJsonLd(
  hostUrl: string,
  issuerId: string,
  issuer: CreateIssuerDto | (UpdateIssuerDto & { name: string; url: string }),
): Record<string, any> {
  return {
    "@context": "https://w3id.org/openbadges/v2",
    type: "Profile",
    id: `${hostUrl}/issuers/${issuerId}`,
    name: issuer.name,
    url: issuer.url,
    ...(issuer.description && { description: issuer.description }),
    ...(issuer.email && { email: issuer.email }),
    ...(issuer.image && { image: issuer.image }),
    // Add OB 3.0 relation if public key is present
    ...(issuer.publicKey && {
      related: [
        {
          type: ["https://purl.imsglobal.org/spec/vc/ob/vocab.html#Profile"],
          id: `did:web:${new URL(hostUrl).hostname}:issuers:${issuerId}`,
          version: "Open Badges v3p0",
        },
      ],
    }),
  };
}

// Function to construct Open Badges 3.0 compliant Issuer JSON-LD
export function constructIssuerJsonLdV3(
  hostUrl: string,
  issuerId: string,
  issuer: CreateIssuerDto | (UpdateIssuerDto & { name: string; url: string }),
): Record<string, any> {
  const hostname = new URL(hostUrl).hostname;
  const didId = `did:web:${hostname}:issuers:${issuerId}`;
  const httpsId = `${hostUrl}/issuers/${issuerId}`;

  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id: didId,
    type: "https://purl.imsglobal.org/spec/vc/ob/vocab.html#Profile",
    name: issuer.name,
    url: issuer.url,
    ...(issuer.description && { description: issuer.description }),
    ...(issuer.email && { email: issuer.email }),
    ...(issuer.image && { image: issuer.image }),
    alsoKnownAs: httpsId,
    otherIdentifier: [
      {
        type: ["IdentifierEntry"],
        identifier: httpsId,
        identifierType: "identifier",
      },
    ],
    ...(issuer.publicKey && { publicKey: issuer.publicKey }),
  };
}
