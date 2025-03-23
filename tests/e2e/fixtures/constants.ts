/**
 * Test Fixture Constants
 *
 * Constant values used across tests
 */

// Context URLs
export const W3C_CREDENTIALS_CONTEXT_URL =
  "https://www.w3.org/2018/credentials/v1";
export const OB3_CONTEXT_URL =
  "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json";
export const DATA_INTEGRITY_CONTEXT_URL =
  "https://w3id.org/security/data-integrity/v1";
export const STATUS_LIST_CONTEXT_URL =
  "https://w3id.org/vc/status-list/2021/v1";

// Schema URLs
export const OB3_CREDENTIAL_SCHEMA_URL =
  "https://purl.imsglobal.org/spec/ob/v3p0/schema/json/ob_v3p0_achievementcredential_schema.json";
export const STATUS_LIST_SCHEMA_URL =
  "https://w3id.org/vc/status-list/2021/v1/schema/StatusList2021Credential.json";

// Cryptographic settings
export const DEFAULT_CRYPTOSUITE = "eddsa-rdfc-2022";

// Test settings
export const TEST_ISSUER_DID = "did:example:issuer";
export const TEST_ISSUER_URL = "https://example.com/issuers/test-issuer";
export const TEST_RECIPIENT_EMAIL = "test-recipient@example.com";
export const TEST_RECIPIENT_MAILTO = `mailto:${TEST_RECIPIENT_EMAIL}`;
export const TEST_RECIPIENT_DID = "did:example:recipient";

// Test badge properties
export const TEST_BADGE_NAME = "Test Badge";
export const TEST_BADGE_DESCRIPTION = "A badge for testing";
export const TEST_BADGE_CRITERIA_NARRATIVE = "Complete the test successfully";

// Status list properties
export const TEST_STATUS_PURPOSE = "revocation";
export const TEST_STATUS_TYPE = "StatusList2021Entry";
