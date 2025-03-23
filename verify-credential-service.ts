#!/usr/bin/env bun

/**
 * Credential Service Validation Script
 *
 * This script validates that the credential service is functioning correctly
 * in a development environment. It tests the core methods that are failing
 * in the integration tests to confirm they work properly outside the test
 * environment.
 *
 * Usage:
 *   bun verify-credential-service.ts
 */

import { CredentialService } from "@/services/credential.service";
import { db } from "@/db/config";
import {
  badgeAssertions,
  badgeClasses,
  issuerProfiles,
  signingKeys,
} from "@/db/schema";
import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { StatusList2021Entry } from "@/models/credential.model";

// Load environment variables
dotenv.config();

// Create timestamp for unique identifiers
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

// Logger helper
const log = {
  info: (...args: any[]) => console.log("✓", ...args),
  error: (...args: any[]) => console.error("✗", ...args),
  section: (title: string) => console.log("\n==", title, "=="),
};

/**
 * Run the validation script
 */
async function main() {
  log.section("CREDENTIAL SERVICE VALIDATION");

  // Initialize the service
  const service = new CredentialService();
  log.info("Service initialized");

  // Track created resources for cleanup
  const createdResources = {
    issuer: null as string | null,
    badge: null as string | null,
    assertion: null as string | null,
    key: null as string | null,
  };

  // Host URL for credential generation
  const hostUrl = "https://example.com";

  try {
    // Create test data
    log.section("CREATING TEST DATA");

    // Create a test issuer
    const issuerId = crypto.randomUUID();
    createdResources.issuer = issuerId;

    log.info("Creating test issuer...");

    await db.insert(issuerProfiles).values({
      issuerId,
      name: `Test Issuer ${timestamp}`,
      url: "https://test-issuer.example.com",
      description: "Validation test issuer",
      email: "test-issuer@example.com",
      issuerJson: {
        "@context": "https://w3id.org/openbadges/v2",
        type: "Issuer",
        id: `https://test-issuer.example.com/issuers/${issuerId}`,
        name: `Test Issuer ${timestamp}`,
        url: "https://test-issuer.example.com",
        email: "test-issuer@example.com",
        description: "Validation test issuer",
      },
    });

    log.info(`Created issuer with ID: ${issuerId}`);

    // Create a test badge
    const badgeId = crypto.randomUUID();
    createdResources.badge = badgeId;

    log.info("Creating test badge...");

    await db.insert(badgeClasses).values({
      badgeId,
      issuerId,
      name: `Test Badge ${timestamp}`,
      description: "A test badge for validation",
      imageUrl: "https://test-badge.example.com/image.png",
      criteria: "https://test-badge.example.com/criteria",
      badgeJson: {
        "@context": "https://w3id.org/openbadges/v2",
        type: "BadgeClass",
        id: `https://test-badge.example.com/badges/${badgeId}`,
        name: `Test Badge ${timestamp}`,
        description: "A test badge for validation",
        image: "https://test-badge.example.com/image.png",
        criteria: {
          narrative: "Test criteria",
        },
        issuer: `https://test-issuer.example.com/issuers/${issuerId}`,
      },
    });

    log.info(`Created badge with ID: ${badgeId}`);

    // Create a test assertion
    const assertionId = crypto.randomUUID();
    createdResources.assertion = assertionId;

    log.info("Creating test assertion...");

    await db.insert(badgeAssertions).values({
      assertionId,
      badgeId,
      issuerId,
      recipientIdentity: "test-recipient@example.com",
      recipientType: "email",
      recipientHashed: false,
      issuedOn: new Date(),
      assertionJson: {
        "@context": "https://w3id.org/openbadges/v2",
        type: "Assertion",
        id: `https://example.com/assertions/${assertionId}`,
        recipient: {
          type: "email",
          identity: "test-recipient@example.com",
          hashed: false,
        },
        badge: `https://test-badge.example.com/badges/${badgeId}`,
        issuedOn: new Date().toISOString(),
        verification: {
          type: "HostedBadge",
        },
      },
    });

    log.info(`Created assertion with ID: ${assertionId}`);

    // Test the methods that are failing in integration tests
    log.section("TESTING SERVICE METHODS");

    // Test 1: Ensure issuer key exists
    log.info("Testing ensureIssuerKeyExists...");

    const key = await service.ensureIssuerKeyExists(issuerId);

    if (!key || !key.keyInfo || !key.privateKey || !key.publicKey) {
      throw new Error("Failed to create or retrieve signing key");
    }

    createdResources.key = key.keyInfo.id;
    log.info(`Successfully created or retrieved key: ${key.keyInfo.id}`);

    // Test 2: Create a credential
    log.info("Testing createCredential...");

    const credential = await service.createCredential(hostUrl, assertionId);

    if (!credential || !credential.id || !credential.proof) {
      throw new Error("Failed to create credential");
    }

    log.info(`Successfully created credential: ${credential.id}`);

    // Check for credential status
    if (credential.credentialStatus) {
      const statusEntry = credential.credentialStatus as StatusList2021Entry;
      log.info(
        `Credential has status of type: ${statusEntry.type} with purpose: ${statusEntry.statusPurpose}`,
      );
    } else {
      log.info("Credential does not have status information");
    }

    log.info("Credential details:", JSON.stringify(credential, null, 2));

    // All tests passed
    log.section("VALIDATION SUCCESSFUL");
    log.info("All credential service methods are working correctly");
  } catch (error: any) {
    log.section("VALIDATION FAILED");
    log.error("Error during validation:", error);

    // Additional diagnostics
    if (error.message && error.message.includes("syntax error")) {
      log.error("SQL Syntax Error Details:");
      log.error("Error code:", error.code);
      log.error("Position:", error.position);
      log.error("Detail:", error.detail);
    }
  } finally {
    // Clean up test data
    log.section("CLEANING UP");

    try {
      if (createdResources.assertion) {
        log.info(`Deleting test assertion: ${createdResources.assertion}`);
        await db
          .delete(badgeAssertions)
          .where(eq(badgeAssertions.assertionId, createdResources.assertion));
      }

      if (createdResources.badge) {
        log.info(`Deleting test badge: ${createdResources.badge}`);
        await db
          .delete(badgeClasses)
          .where(eq(badgeClasses.badgeId, createdResources.badge));
      }

      if (createdResources.key) {
        const keyId = createdResources.key.split("#")[1];
        log.info(`Deleting test key: ${keyId}`);
        await db.delete(signingKeys).where(eq(signingKeys.keyId, keyId));
      }

      if (createdResources.issuer) {
        log.info(`Deleting test issuer: ${createdResources.issuer}`);
        await db
          .delete(issuerProfiles)
          .where(eq(issuerProfiles.issuerId, createdResources.issuer));
      }

      log.info("Cleanup complete");
    } catch (cleanupError) {
      log.error("Error during cleanup:", cleanupError);
    }

    // Close database connection
    log.info("Closing database connection");
    await db.end();
  }
}

main().catch(console.error);
