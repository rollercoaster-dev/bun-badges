/**
 * E2E Test Validation Utilities
 *
 * This module provides functions for validating Open Badges 3.0 credentials
 * against schemas, contexts, and cryptographic requirements.
 */

import Ajv from "ajv";
import { OB3_CREDENTIAL_SCHEMA_URL } from "@/constants/context-urls";

// Create AJV instance
const ajv = new Ajv({ allErrors: true, strict: false });

/**
 * Validates that a credential contains the required OB3 contexts
 * @param credential Credential to validate
 * @returns Validation result
 */
export function validateContexts(credential: any) {
  // Required OB3 contexts
  const requiredContexts = [
    "https://www.w3.org/2018/credentials/v1",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
  ];

  // Optional but common contexts
  const optionalContexts = [
    "https://w3id.org/security/data-integrity/v1",
    "https://w3id.org/vc/status-list/2021/v1",
  ];

  // Check if all required contexts are present
  if (!credential["@context"]) {
    return {
      valid: false,
      errors: ["Missing @context property"],
    };
  }

  const missingContexts = requiredContexts.filter(
    (context) => !credential["@context"].includes(context),
  );

  // Create the result with status and details
  const result = {
    valid: missingContexts.length === 0,
    contexts: {
      required: {
        present: requiredContexts.filter((context) =>
          credential["@context"].includes(context),
        ),
        missing: missingContexts,
      },
      optional: {
        present: optionalContexts.filter((context) =>
          credential["@context"].includes(context),
        ),
        missing: optionalContexts.filter(
          (context) => !credential["@context"].includes(context),
        ),
      },
    },
  };

  return result;
}

/**
 * Validates the OB3 credential structure
 * @param credential Credential to validate
 * @returns Validation result
 */
export function validateOB3Structure(credential: any) {
  const structureChecks = [
    {
      check:
        credential.type &&
        Array.isArray(credential.type) &&
        credential.type.includes("VerifiableCredential") &&
        credential.type.includes("OpenBadgeCredential"),
      name: "type",
      message:
        "Credential must have type array including VerifiableCredential and OpenBadgeCredential",
    },
    {
      check:
        credential.issuer &&
        typeof credential.issuer === "object" &&
        credential.issuer.id,
      name: "issuer",
      message: "Credential must have an issuer object with an id property",
    },
    {
      check:
        credential.issuanceDate && typeof credential.issuanceDate === "string",
      name: "issuanceDate",
      message: "Credential must have an issuanceDate string",
    },
    {
      check:
        credential.credentialSubject &&
        typeof credential.credentialSubject === "object",
      name: "credentialSubject",
      message: "Credential must have a credentialSubject object",
    },
    {
      check:
        credential.credentialSchema &&
        credential.credentialSchema.id === OB3_CREDENTIAL_SCHEMA_URL,
      name: "credentialSchema",
      message: `Credential must have a credentialSchema with id: ${OB3_CREDENTIAL_SCHEMA_URL}`,
    },
  ];

  // Check achievement structure if present
  const achievementCheck = {
    check:
      !credential.credentialSubject?.achievement ||
      (credential.credentialSubject.achievement &&
        credential.credentialSubject.achievement.type &&
        Array.isArray(credential.credentialSubject.achievement.type) &&
        credential.credentialSubject.achievement.type.includes("Achievement")),
    name: "achievement",
    message:
      "If achievement is present, it must have a type array including Achievement",
  };

  structureChecks.push(achievementCheck);

  // Calculate validation results
  const failures = structureChecks.filter((check) => !check.check);
  const valid = failures.length === 0;

  return {
    valid,
    failures: failures.map((f) => ({ property: f.name, message: f.message })),
  };
}

/**
 * Validates the presence and format of a cryptographic proof
 * @param credential Credential to validate
 * @returns Validation result
 */
export function validateProof(credential: any) {
  // Return early if no proof
  if (!credential.proof) {
    return {
      valid: false,
      errors: ["Missing proof property"],
    };
  }

  const proofChecks = [
    {
      check: credential.proof.type === "DataIntegrityProof",
      name: "type",
      message: "Proof must have type DataIntegrityProof",
    },
    {
      check: credential.proof.cryptosuite === "eddsa-rdfc-2022",
      name: "cryptosuite",
      message: "Proof must use cryptosuite eddsa-rdfc-2022",
    },
    {
      check: !!credential.proof.verificationMethod,
      name: "verificationMethod",
      message: "Proof must include verificationMethod",
    },
    {
      check: !!credential.proof.proofValue,
      name: "proofValue",
      message: "Proof must include proofValue",
    },
    {
      check: !!credential.proof.created,
      name: "created",
      message: "Proof must include created timestamp",
    },
  ];

  // Calculate validation results
  const failures = proofChecks.filter((check) => !check.check);
  const valid = failures.length === 0;

  return {
    valid,
    failures: failures.map((f) => ({ property: f.name, message: f.message })),
  };
}

/**
 * Validates the status list entry if present
 * @param credential Credential to validate
 * @returns Validation result
 */
export function validateStatusList(credential: any) {
  // If no status, it's valid but not using status
  if (!credential.credentialStatus) {
    return {
      valid: true,
      usingStatusList: false,
      message: "No credential status found - not using status list",
    };
  }

  const statusChecks = [
    {
      check: credential.credentialStatus.type === "StatusList2021Entry",
      name: "type",
      message: "Status must have type StatusList2021Entry",
    },
    {
      check: !!credential.credentialStatus.statusPurpose,
      name: "statusPurpose",
      message: "Status must include statusPurpose",
    },
    {
      check: !!credential.credentialStatus.statusListIndex,
      name: "statusListIndex",
      message: "Status must include statusListIndex",
    },
    {
      check: !!credential.credentialStatus.statusListCredential,
      name: "statusListCredential",
      message: "Status must include statusListCredential URL",
    },
  ];

  // Calculate validation results
  const failures = statusChecks.filter((check) => !check.check);
  const valid = failures.length === 0;

  return {
    valid,
    usingStatusList: true,
    failures: failures.map((f) => ({ property: f.name, message: f.message })),
  };
}

/**
 * Validates a recipient in a credential
 * @param credential Credential to validate
 * @param expectedRecipient Optional expected recipient to check against
 * @returns Validation result
 */
export function validateRecipient(credential: any, expectedRecipient?: string) {
  // If no subject, invalid
  if (!credential.credentialSubject) {
    return {
      valid: false,
      errors: ["Missing credentialSubject property"],
    };
  }

  const recipientId = credential.credentialSubject.id;

  // Check if it's a valid recipient identifier
  const isValidEmailFormat =
    typeof recipientId === "string" &&
    (recipientId.startsWith("mailto:") ||
      recipientId.startsWith("did:") ||
      recipientId.startsWith("https:") ||
      recipientId.startsWith("sha256$"));

  const result = {
    valid: isValidEmailFormat,
    recipientId,
    isHashed: recipientId && recipientId.startsWith("sha256$"),
    format: recipientId
      ? recipientId.startsWith("mailto:")
        ? "email"
        : recipientId.startsWith("did:")
          ? "did"
          : recipientId.startsWith("https:")
            ? "url"
            : recipientId.startsWith("sha256$")
              ? "hashed"
              : "unknown"
      : "missing",
  };

  // If expected recipient provided, check if it matches (for non-hashed)
  if (expectedRecipient && !result.isHashed) {
    const expectedFormatted =
      expectedRecipient.includes("@") &&
      !expectedRecipient.startsWith("mailto:")
        ? `mailto:${expectedRecipient}`
        : expectedRecipient;

    result.valid = result.valid && recipientId === expectedFormatted;
  }

  return result;
}

/**
 * Full OB3 credential validation
 * @param credential Credential to validate
 * @returns Comprehensive validation result
 */
export function validateOB3Credential(credential: any) {
  const contextResult = validateContexts(credential);
  const structureResult = validateOB3Structure(credential);
  const proofResult = validateProof(credential);
  const statusResult = validateStatusList(credential);
  const recipientResult = validateRecipient(credential);

  // Overall validity
  const valid =
    contextResult.valid &&
    structureResult.valid &&
    proofResult.valid &&
    statusResult.valid &&
    recipientResult.valid;

  return {
    valid,
    context: contextResult,
    structure: structureResult,
    proof: proofResult,
    status: statusResult,
    recipient: recipientResult,
  };
}
