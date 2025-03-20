/**
 * JSON-LD Context URLs for Open Badges specifications
 */

/**
 * Open Badges 2.0 Context URL
 */
export const OB2_CONTEXT_URL = "https://w3id.org/openbadges/v2";

/**
 * Open Badges 3.0 Context URL
 * The official URLs from the IMS Global specification
 */
export const OB3_CONTEXT_URL =
  "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json";

/**
 * W3C Verifiable Credentials Context URL
 */
export const VC_CONTEXT_URL = "https://www.w3.org/2018/credentials/v1";

/**
 * W3C Status List 2021 Context URL
 */
export const STATUS_LIST_CONTEXT_URL =
  "https://w3id.org/vc/status-list/2021/v1";

/**
 * W3C Security Suites JWS 2020 Context URL
 */
export const JWS_CONTEXT_URL = "https://w3id.org/security/suites/jws-2020/v1";

/**
 * Open Badges 3.0 Credential Schema URL
 */
export const OB3_CREDENTIAL_SCHEMA_URL =
  "https://purl.imsglobal.org/spec/ob/v3p0/schema/json/ob_v3p0_achievementcredential_schema.json";

/**
 * Open Badges 3.0 Badge Schema URL
 */
export const OB3_BADGE_SCHEMA_URL =
  "https://purl.imsglobal.org/spec/ob/v3p0/schema/json/ob_v3p0_badge_schema.json";

/**
 * Common context arrays for different credential types
 */
export const OB3_CREDENTIAL_CONTEXT = [
  VC_CONTEXT_URL,
  STATUS_LIST_CONTEXT_URL,
  OB3_CONTEXT_URL,
];

export const OB3_ACHIEVEMENT_CONTEXT = [VC_CONTEXT_URL, OB3_CONTEXT_URL];
