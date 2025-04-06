/**
 * Schema validation for Open Badges 3.0 credentials
 */
import { OpenBadgeCredential } from "@/models/credential.model";
import { OB3_CREDENTIAL_SCHEMA_URL } from "@/constants/context-urls";
import Ajv, { AnySchema } from "ajv";
// Import logger
// import { createLogger } from "@/utils/logger";
import logger from "@/utils/logger";

// Create logger instance
// const logger = createLogger("SchemaValidation");
const baseLogger = logger.child({ context: "SchemaValidation" });

/**
 * Ajv schema validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Loaded schemas cache to avoid fetching multiple times
 */
const schemaCache = new Map<string, unknown>();

/**
 * Fetch and parse a JSON schema from a URL
 * @param url The URL of the schema to fetch
 * @returns The parsed schema
 */
async function fetchSchema(url: string): Promise<unknown> {
  try {
    // Check cache first
    if (schemaCache.has(url)) {
      return schemaCache.get(url);
    }

    // Fetch the schema
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.statusText}`);
    }

    const schema = await response.json();

    // Cache the schema
    schemaCache.set(url, schema);

    return schema;
  } catch (error) {
    // Replace console.error
    // logger.error(`Error fetching schema: ${error}`);
    baseLogger.error(error, `Error fetching schema from URL: ${url}`);
    throw error;
  }
}

/**
 * Validate a credential against the OB3 schema
 * @param credential The credential to validate
 * @returns Validation result with any errors
 */
export async function validateOB3Credential(
  credential: OpenBadgeCredential,
): Promise<ValidationResult> {
  try {
    // Create Ajv instance with options appropriate for Ajv v8
    const ajv = new Ajv({ allErrors: true });

    // Get the schema URL from the credential if available, otherwise use default
    const schemaUrl =
      credential.credentialSchema?.id || OB3_CREDENTIAL_SCHEMA_URL;

    // Fetch the schema
    const schema = await fetchSchema(schemaUrl);

    // Compile the schema
    const validate = ajv.compile(schema as AnySchema);

    // Validate the credential
    const valid = validate(credential);

    // Return validation result
    if (!valid) {
      const errors = (validate.errors || []).map(
        (error) =>
          `${error.instancePath || ""} ${error.message || "Invalid value"}`,
      );
      // Log validation errors
      baseLogger.warn({ errors }, "OB3 Credential schema validation failed");
      return { valid: false, errors };
    }

    return { valid: true };
  } catch (error) {
    // Log the error during the validation process (e.g., fetching schema)
    baseLogger.error(
      error,
      "Error during OB3 credential schema validation process",
    );
    return {
      valid: false,
      errors: [
        `Schema validation error: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

/**
 * Simplified validation for use in test environments
 * @param credential The credential to validate
 * @returns Validation result
 */
export function validateOB3CredentialBasic(
  credential: OpenBadgeCredential,
): ValidationResult {
  try {
    // For basic validation, we'll just check the required properties
    const errors: string[] = [];

    // Check @context
    if (!Array.isArray(credential["@context"])) {
      errors.push("@context must be an array");
    } else {
      const hasVCContext = credential["@context"].some(
        (ctx) =>
          ctx === "https://www.w3.org/2018/credentials/v1" ||
          ctx.includes("credentials/v1"),
      );

      const hasOB3Context = credential["@context"].some(
        (ctx) =>
          ctx ===
            "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json" ||
          ctx.includes("ob/v3p0/context"),
      );

      if (!hasVCContext) {
        errors.push(
          "Missing required VC context: https://www.w3.org/2018/credentials/v1",
        );
      }

      if (!hasOB3Context) {
        errors.push(
          "Missing required OB3 context: https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
        );
      }
    }

    // Check required top-level properties
    if (!credential.id) {
      errors.push("Missing required property: id");
    }

    if (!Array.isArray(credential.type)) {
      errors.push("type must be an array");
    } else {
      if (!credential.type.includes("VerifiableCredential")) {
        errors.push("Missing required type: VerifiableCredential");
      }

      if (!credential.type.includes("OpenBadgeCredential")) {
        errors.push("Missing required type: OpenBadgeCredential");
      }
    }

    if (!credential.issuer) {
      errors.push("Missing required property: issuer");
    }

    if (!credential.issuanceDate) {
      errors.push("Missing required property: issuanceDate");
    }

    if (!credential.credentialSubject) {
      errors.push("Missing required property: credentialSubject");
    } else {
      // Check credentialSubject properties
      const subject = credential.credentialSubject;

      if (!subject.achievement) {
        errors.push("Missing required property: credentialSubject.achievement");
      } else {
        // Check achievement properties
        const achievement = subject.achievement;

        if (!achievement.id) {
          errors.push(
            "Missing required property: credentialSubject.achievement.id",
          );
        }

        if (!Array.isArray(achievement.type)) {
          errors.push("credentialSubject.achievement.type must be an array");
        }

        if (!achievement.name) {
          errors.push(
            "Missing required property: credentialSubject.achievement.name",
          );
        }
      }
    }

    if (!credential.credentialSchema) {
      errors.push("Missing required property: credentialSchema");
    } else if (credential.credentialSchema.id !== OB3_CREDENTIAL_SCHEMA_URL) {
      errors.push(`credentialSchema.id must be: ${OB3_CREDENTIAL_SCHEMA_URL}`);
    }

    if (errors.length > 0) {
      // Log basic validation errors
      baseLogger.warn({ errors }, "OB3 Credential basic validation failed");
      return { valid: false, errors };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      errors: [
        `Basic schema validation error: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}
