/**
 * Schema validation for Open Badges 3.0 credentials
 */
import { OpenBadgeCredential, OB3 } from "@/utils/openbadges-types";
import { OB3_CREDENTIAL_SCHEMA_URL } from "@/constants/context-urls";
import Ajv, { AnySchema } from "ajv";
import { Context } from "hono";
// Import logger
// import { createLogger } from "@/utils/logger";
import logger from "@/utils/logger";
import {
  type AnyValidateFunction,
  ErrorObject as AjvErrorObject,
} from "ajv/dist/types";
import * as Zod from "zod";

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
        // Handle both single achievement and array of achievements
        const achievement = subject.achievement;
        let targetAchievement: OB3.Achievement | undefined;

        if (Array.isArray(achievement)) {
          if (achievement.length === 0) {
            errors.push("credentialSubject.achievement array cannot be empty");
          } else {
            targetAchievement = achievement[0]; // Validate the first achievement in the array
          }
        } else {
          targetAchievement = achievement; // It's a single object
        }

        if (targetAchievement) {
          // Check achievement properties on the target object
          if (!targetAchievement.id) {
            errors.push(
              "Missing required property: credentialSubject.achievement.id",
            );
          }

          if (!Array.isArray(targetAchievement.type)) {
            errors.push("credentialSubject.achievement.type must be an array");
          }

          if (!targetAchievement.name) {
            errors.push(
              "Missing required property: credentialSubject.achievement.name",
            );
          }
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

// Validation middleware for Hono
export const validate = (
  schema: AnyValidateFunction | Zod.ZodTypeAny,
  target: "body" | "query" | "param" = "body",
) => {
  return async (ctx: Context, next: () => Promise<void>) => {
    try {
      let dataToValidate;
      if (target === "body") {
        dataToValidate = await ctx.req.json();
      } else if (target === "query") {
        dataToValidate = ctx.req.query();
      } else {
        // target === "param"
        dataToValidate = ctx.req.param();
      }

      let isValid = false;
      let errors: AjvErrorObject[] | Zod.ZodIssue[] | null = null;

      if (typeof schema === "function") {
        // AJV schema
        isValid = await schema(dataToValidate);
        if (!isValid) errors = schema.errors ?? null;
      } else {
        // Zod schema
        const parseResult = await schema.safeParseAsync(dataToValidate);
        isValid = parseResult.success;
        if (!isValid) {
          if (parseResult.error) {
            errors = parseResult.error.errors;
          } else {
            logger.error("Zod validation failed but no error object found");
            errors = [
              { message: "Unknown Zod validation error" },
            ] as Zod.ZodIssue[];
          }
        }
      }

      if (!isValid) {
        logger.error(
          `Validation failed (${typeof schema === "function" ? "AJV" : "Zod"}):`,
          errors,
        );
        return ctx.json(
          {
            status: "error",
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid request data",
              details: errors,
            },
          },
          400,
        );
      }

      // If validation passed, proceed to next middleware/handler
      await next();
      return; // Explicitly return after next() completes
    } catch (error) {
      logger.error(error, `Validation error in ${target}:`);
      // Ensure catch block also returns explicitly
      return ctx.json(
        {
          status: "error",
          error: {
            code: "INVALID_REQUEST",
            message: `Failed to parse request ${target}`,
          },
        },
        400,
      );
    }
  };
};

// Specific validation middleware examples
export const validateCreateIssuer = (
  target: "body" | "query" | "param" = "body",
) => {
  return async (ctx: Context, next: () => Promise<void>) => {
    // Placeholder - actual schema should be imported and used
    const schema = Zod.object({ name: Zod.string(), url: Zod.string().url() });
    // Re-use the generic validate logic (or implement specific logic)
    // This example re-uses the generic one for demonstration
    const validationMiddleware = validate(schema, target);
    await validationMiddleware(ctx, next);
  };
};
