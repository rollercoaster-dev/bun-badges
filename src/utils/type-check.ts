/**
 * This file is used to verify that our type improvements work properly.
 * It's a simple test that imports all the relevant types and checks a few instances.
 */
import {
  OpenBadgeCredential,
  isOpenBadgeCredential,
  DataIntegrityProof,
} from "@/models/credential.model";

import {
  OB2BadgeAssertion,
  isOB2BadgeAssertion,
} from "@/services/verification.service";

import {
  OB3_CREDENTIAL_CONTEXT,
  OB2_CONTEXT_URL,
} from "@/constants/context-urls";

import logger from "./logger";

// Example OB3 credential for testing
const testCredential: OpenBadgeCredential = {
  "@context": OB3_CREDENTIAL_CONTEXT,
  id: "https://example.com/credentials/123",
  type: ["VerifiableCredential", "OpenBadgeCredential"],
  issuer: {
    id: "https://example.com/issuers/456",
    type: "Profile",
    name: "Test Issuer",
  },
  issuanceDate: "2025-01-01T00:00:00Z",
  credentialSubject: {
    id: "recipient@example.com",
    type: "EmailCredentialSubject",
    achievement: {
      id: "https://example.com/badges/789",
      type: ["AchievementCredential"],
      name: "Test Badge",
      description: "A test badge",
      image: {
        id: "https://example.com/badges/789/image",
        type: "Image",
      },
      criteria: {
        narrative: "The criteria for earning this badge",
      },
    },
  },
  proof: {
    type: "DataIntegrityProof",
    cryptosuite: "eddsa-rdfc-2022",
    created: "2025-01-01T00:00:01Z",
    verificationMethod: "https://example.com/issuers/456#keys-1",
    proofPurpose: "assertionMethod",
    proofValue: "z4oey5q6...",
  } as DataIntegrityProof,
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
logger.info("Is valid OB3 credential:", isOpenBadgeCredential(testCredential));
logger.info("Is valid OB2 assertion:", isOB2BadgeAssertion(testOB2Assertion));

logger.info("Type check complete. The type imports are working.");
