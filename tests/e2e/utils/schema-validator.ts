/**
 * OB3 Schema Validation Utilities
 *
 * This module provides functions for validating credentials against
 * Open Badges 3.0 JSON schemas
 */

import Ajv from "ajv";
import addFormats from "ajv-formats";
import { OB3_CREDENTIAL_SCHEMA_URL } from "@/constants/context-urls";

// Create an AJV instance with all the options we need
const ajv = new Ajv({
  allErrors: true,
  strict: false,
  validateFormats: true,
  verbose: true,
});

// Add formats like uri, date-time, email, etc.
addFormats(ajv);

// Store compiled schemas for reuse
const schemaCache = new Map();

/**
 * Load a JSON schema from a local file or URL
 * @param schemaPath Path or URL to the schema
 * @returns Loaded schema object
 */
export async function loadSchema(schemaPath: string): Promise<any> {
  try {
    // For local files, use fs
    if (schemaPath.startsWith("/") || schemaPath.startsWith("./")) {
      const fs = await import("fs/promises");
      const content = await fs.readFile(schemaPath, "utf-8");
      return JSON.parse(content);
    }

    // For remote schemas, use fetch
    const response = await fetch(schemaPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error loading schema from ${schemaPath}:`, error);
    throw error;
  }
}

/**
 * Get a compiled validator for a schema
 * @param schema Schema object or URI
 * @returns Compiled validator function
 */
export async function getValidator(schema: any): Promise<any> {
  // If schema is a string (URI), try to load it from cache or fetch it
  if (typeof schema === "string") {
    const schemaUri = schema;

    // Check cache first
    if (schemaCache.has(schemaUri)) {
      return schemaCache.get(schemaUri);
    }

    // Load the schema
    schema = await loadSchema(schemaUri);
  }

  // Compile the schema
  const validate = ajv.compile(schema);

  // Cache the validator if it has an $id
  if (schema.$id) {
    schemaCache.set(schema.$id, validate);
  }

  return validate;
}

/**
 * Validate a credential against the OB3 schema
 * @param credential Credential to validate
 * @param schemaUrl Optional schema URL (defaults to OB3 credential schema)
 * @returns Validation result
 */
export async function validateAgainstSchema(
  credential: any,
  schemaUrl = OB3_CREDENTIAL_SCHEMA_URL,
): Promise<{ valid: boolean; errors?: any[] }> {
  try {
    // Get the validator
    const validate = await getValidator(schemaUrl);

    // Validate the credential
    const valid = validate(credential);

    return {
      valid,
      errors: valid ? undefined : validate.errors,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          message: `Schema validation error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

/**
 * Validate a credential against its own specified schema
 * @param credential Credential with credentialSchema property
 * @returns Validation result
 */
export async function validateAgainstCredentialSchema(
  credential: any,
): Promise<{ valid: boolean; errors?: any[] }> {
  // Check if credential has a schema reference
  if (!credential.credentialSchema || !credential.credentialSchema.id) {
    return {
      valid: false,
      errors: [{ message: "Credential missing credentialSchema.id property" }],
    };
  }

  return validateAgainstSchema(credential, credential.credentialSchema.id);
}

/**
 * Check if a credential has a valid schema reference
 * @param credential Credential to check
 * @returns Validation result
 */
export function validateSchemaReference(credential: any): {
  valid: boolean;
  message?: string;
  schemaId?: string;
} {
  // Check if credential has a schema property
  if (!credential.credentialSchema) {
    return {
      valid: false,
      message: "Credential missing credentialSchema property",
    };
  }

  // Check schema ID
  if (!credential.credentialSchema.id) {
    return {
      valid: false,
      message: "Credential missing credentialSchema.id property",
    };
  }

  // Check schema type
  if (!credential.credentialSchema.type) {
    return {
      valid: false,
      message: "Credential missing credentialSchema.type property",
    };
  }

  // For OB3 credentials, check if the schema ID is the official one
  if (
    credential.type &&
    Array.isArray(credential.type) &&
    credential.type.includes("OpenBadgeCredential")
  ) {
    if (credential.credentialSchema.id !== OB3_CREDENTIAL_SCHEMA_URL) {
      return {
        valid: false,
        message: `OpenBadgeCredential should use schema ID ${OB3_CREDENTIAL_SCHEMA_URL}`,
        schemaId: credential.credentialSchema.id,
      };
    }
  }

  return {
    valid: true,
    schemaId: credential.credentialSchema.id,
  };
}
