import { z } from "zod";

// Define the issuer profile validation schema based on Open Badges 2.0/2.1
// with compatibility for OB 3.0 specifications
export const issuerProfileSchema = z.object({
  // Core required fields (OB 2.0 and 3.0)
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),

  // Optional fields
  description: z.string().optional(),
  email: z.string().email("Must be a valid email").optional(),
  image: z.string().url("Must be a valid URL").optional(),
  telephone: z.string().optional(),

  // Additional OB 3.0 fields (optional for compatibility)
  publicKey: z
    .array(
      z.object({
        id: z.string(),
        owner: z.string(),
        publicKeyPem: z.string().optional(),
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
  type: z.literal("Issuer").optional(),
});

// Validation schema for creating a new issuer profile
export const createIssuerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),
  description: z.string().optional(),
  email: z.string().email("Must be a valid email").optional(),
  image: z.string().url("Must be a valid URL").optional(),
});

// Validation schema for updating an existing issuer profile
export const updateIssuerSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  url: z.string().url("Must be a valid URL").optional(),
  description: z.string().optional(),
  email: z.string().email("Must be a valid email").optional(),
  image: z.string().url("Must be a valid URL").optional(),
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
    type: "Issuer",
    id: `${hostUrl}/issuers/${issuerId}`,
    name: issuer.name,
    url: issuer.url,
    ...(issuer.description && { description: issuer.description }),
    ...(issuer.email && { email: issuer.email }),
    ...(issuer.image && { image: issuer.image }),
  };
}
