/**
 * This file is used to verify that our type improvements work properly.
 * It's a simple test that imports all the relevant types and checks a few instances.
 */

// Corrected and Consolidated Imports:
import { isOpenBadgeCredential } from "@/models/credential.model";
import {
  OB2BadgeAssertion,
  isOB2BadgeAssertion,
} from "@/services/verification.service";
import {
  OB3_CREDENTIAL_CONTEXT,
  OB2_CONTEXT_URL,
} from "@/constants/context-urls";
import logger from "./logger"; // Assuming relative path is correct for this file
import {
  OpenBadgeCredential,
  OpenBadgeProof,
  toIRI,
  toDateTime,
} from "@/utils/openbadges-types";

// Example OB3 credential for testing
const testCredential: OpenBadgeCredential = {
  "@context": OB3_CREDENTIAL_CONTEXT,
  id: toIRI("https://example.com/credentials/123"),
  type: ["VerifiableCredential", "OpenBadgeCredential"],
  issuer: {
    id: toIRI("https://example.com/issuers/456"),
    type: "Profile",
    name: "Test Issuer",
  },
  issuanceDate: toDateTime("2025-01-01T00:00:00Z"),
  credentialSubject: {
    id: toIRI("recipient@example.com"),
    type: "EmailCredentialSubject",
    achievement: {
      id: toIRI("https://example.com/badges/789"),
      type: ["AchievementCredential"],
      name: "Test Badge",
      description: "A test badge",
      image: toIRI("https://example.com/badges/789/image"),
      criteria: {
        narrative: "The criteria for earning this badge",
      },
    },
  },
  proof: {
    type: "DataIntegrityProof",
    cryptosuite: "eddsa-rdfc-2022",
    created: toDateTime("2025-01-01T00:00:01Z"),
    verificationMethod: toIRI("https://example.com/issuers/456#keys-1"),
    proofPurpose: "assertionMethod",
    proofValue: "z4oey5q6...",
  } as OpenBadgeProof,
};

// Example OB2 assertion for testing
const testOB2Assertion: OB2BadgeAssertion = {
  "@context": OB2_CONTEXT_URL,
  type: "Assertion",
  id: "https://example.com/assertions/123",
  recipient: {
    type: "email",
    identity: "recipient@example.com",
    hashed: true,
    salt: "abc123",
  },
  badge: {
    type: "BadgeClass",
    id: "https://example.com/badges/456",
    name: "Test Badge",
    description: "A test badge",
    image: "https://example.com/badges/456/image",
    criteria: {
      narrative: "The criteria for earning this badge",
    },
    issuer: {
      type: "Issuer",
      id: "https://example.com/issuers/789",
      name: "Test Issuer",
    },
  },
  verification: {
    type: "HostedBadge",
  },
  issuedOn: "2023-01-01T00:00:00Z",
};

// Test type guards
// logger.info("Is valid OB3 credential:", isOpenBadgeCredential(testCredential)); // Original call using imported guard
logger.info("Is valid OB2 assertion:", isOB2BadgeAssertion(testOB2Assertion));

logger.info("Type check complete. The type imports are working.");

/**
 * Type checking utilities
 */
// Removed duplicate imports

/**
 * Checks if the object is likely an OpenBadgeCredential V3
 */
export function isOpenBadgeCredentialV3(
  obj: unknown,
): obj is OpenBadgeCredential {
  // Implementation using the imported guard
  return isOpenBadgeCredential(obj);
}

/**
 * Checks if the object has a DataIntegrityProof
 */
export function hasDataIntegrityProof(
  obj: unknown,
): obj is { proof: OpenBadgeProof } {
  // Use OpenBadgeProof
  if (typeof obj !== "object" || obj === null) return false;
  const maybeProof = (obj as Record<string, unknown>).proof;
  if (typeof maybeProof !== "object" || maybeProof === null) return false;
  return (maybeProof as Record<string, unknown>).type === "DataIntegrityProof";
}

// Updated test call to use the local wrapper function
logger.info(
  "Is valid OB3 credential (V3 function):",
  isOpenBadgeCredentialV3(testCredential),
);
