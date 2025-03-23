/**
 * Sample OB3 Credential
 *
 * A sample OB3 credential for testing
 */

import {
  W3C_CREDENTIALS_CONTEXT_URL,
  OB3_CONTEXT_URL,
  DATA_INTEGRITY_CONTEXT_URL,
  STATUS_LIST_CONTEXT_URL,
  OB3_CREDENTIAL_SCHEMA_URL,
  TEST_ISSUER_DID,
  TEST_RECIPIENT_MAILTO,
  TEST_BADGE_NAME,
  TEST_BADGE_DESCRIPTION,
  TEST_BADGE_CRITERIA_NARRATIVE,
} from "../constants";

/**
 * Create a test credential with the given parameters
 * @param options Custom properties to override in the credential
 * @returns Sample credential object
 */
export function createSampleCredential(options: any = {}) {
  const issuanceDate = options.issuanceDate || new Date().toISOString();
  const id = options.id || `urn:uuid:${crypto.randomUUID()}`;

  return {
    "@context": [
      W3C_CREDENTIALS_CONTEXT_URL,
      OB3_CONTEXT_URL,
      DATA_INTEGRITY_CONTEXT_URL,
      STATUS_LIST_CONTEXT_URL,
    ],
    id: id,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: {
      id: options.issuerId || TEST_ISSUER_DID,
      name: options.issuerName || "Test Issuer",
      url: options.issuerUrl || "https://example.com/issuers/test",
    },
    issuanceDate: issuanceDate,
    expirationDate: options.expirationDate,
    credentialSchema: {
      id: OB3_CREDENTIAL_SCHEMA_URL,
      type: "JsonSchemaValidator2018",
    },
    credentialSubject: {
      id: options.recipientId || TEST_RECIPIENT_MAILTO,
      type: ["AchievementSubject"],
      achievement: {
        id: options.achievementId || `https://example.com/achievements/${id}`,
        type: ["Achievement"],
        name: options.badgeName || TEST_BADGE_NAME,
        description: options.badgeDescription || TEST_BADGE_DESCRIPTION,
        criteria: {
          narrative: options.criteriaNarrative || TEST_BADGE_CRITERIA_NARRATIVE,
        },
        image: options.badgeImage || {
          id: "https://example.com/badges/test-badge.png",
          type: "Image",
        },
      },
    },
    credentialStatus:
      options.includeStatus === false
        ? undefined
        : {
            id:
              options.statusId ||
              `https://example.com/status/list#${options.statusIndex || 0}`,
            type: "StatusList2021Entry",
            statusPurpose: "revocation",
            statusListIndex: options.statusIndex || 0,
            statusListCredential:
              options.statusListCredential || "https://example.com/status/list",
          },
    proof:
      options.includeProof === false
        ? undefined
        : {
            type: "DataIntegrityProof",
            cryptosuite: "eddsa-rdfc-2022",
            created: options.proofCreated || issuanceDate,
            verificationMethod:
              options.verificationMethod || `${TEST_ISSUER_DID}#key-1`,
            proofPurpose: "assertionMethod",
            proofValue:
              options.proofValue ||
              "zQwerty123456789EXAMPLE_PROOF_VALUEzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
          },
  };
}

/**
 * Create a sample revoked credential
 * @returns Revoked credential object
 */
export function createRevokedCredential() {
  return createSampleCredential({
    credentialStatus: {
      id: "https://example.com/status/list#123",
      type: "StatusList2021Entry",
      statusPurpose: "revocation",
      statusListIndex: 123,
      statusListCredential: "https://example.com/status/list",
    },
  });
}

/**
 * Create a sample credential with a hashed recipient
 * @returns Credential with hashed recipient
 */
export function createHashedRecipientCredential() {
  return createSampleCredential({
    recipientId:
      "sha256$1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  });
}

/**
 * Create a malformed credential for testing validation failures
 * @param malformationType Type of malformation to apply
 * @returns Malformed credential
 */
export function createMalformedCredential(malformationType: string) {
  const credential = createSampleCredential();

  switch (malformationType) {
    case "missing-context":
      credential["@context"] = [W3C_CREDENTIALS_CONTEXT_URL]; // Remove OB3 context
      break;
    case "missing-type":
      credential.type = ["VerifiableCredential"]; // Remove OpenBadgeCredential
      break;
    case "missing-schema":
      delete credential.credentialSchema;
      break;
    case "invalid-proof":
      credential.proof.proofValue = "INVALID_PROOF_VALUE";
      break;
    case "missing-proof":
      delete credential.proof;
      break;
    case "tampered-content":
      credential.credentialSubject.achievement.name = "TAMPERED NAME";
      break;
    default:
      // No malformation
      break;
  }

  return credential;
}
