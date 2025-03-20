/**
 * Open Badges 3.0 End-to-End Workflow Example
 *
 * This script demonstrates the complete lifecycle of an Open Badge 3.0 credential:
 * 1. Key generation for the issuer
 * 2. Status list creation for credential revocation
 * 3. Badge credential creation and signing
 * 4. Verification of the badge credential
 * 5. Revocation of the badge credential
 * 6. Re-verification to confirm revocation
 */

import { generateEd25519KeyPair } from "../src/utils/signing/key-generation";
import {
  signCredential,
  verifyCredential,
} from "../src/utils/signing/credential";
import {
  createStatusListCredential,
  createEncodedBitString,
  updateCredentialStatus,
  getIndexFromUuid,
  isCredentialRevoked,
} from "../src/utils/signing/status-list";
import * as crypto from "crypto";
import {
  OB3_CREDENTIAL_CONTEXT,
  OB3_CREDENTIAL_SCHEMA_URL,
} from "../src/constants/context-urls";

async function runOB3Workflow() {
  console.log("🏆 Open Badges 3.0 Workflow Example");
  console.log("====================================\n");

  // Step 1: Generate keys for the issuer
  console.log("Step 1: Generating issuer keys...");
  const issuerKeys = await generateEd25519KeyPair();
  const issuerDidKey = `did:key:${issuerKeys.publicKey.replace("z", "")}`;
  console.log(`Generated issuer DID: ${issuerDidKey}`);
  console.log("Keys generated successfully!\n");

  // Step 2: Create a status list for credential revocation
  console.log("Step 2: Creating status list...");
  const statusListId = `https://example.com/status/${crypto.randomUUID()}`;
  const statusList = createStatusListCredential(
    issuerDidKey,
    statusListId,
    "revocation",
    128, // Smaller size for example purposes
  );

  // Sign the status list credential
  const signedStatusList = await signCredential(
    statusList,
    issuerKeys.privateKey,
    {
      verificationMethod: `${issuerDidKey}#keys-1`,
      proofPurpose: "assertionMethod",
    },
  );
  console.log("Status list created and signed successfully!");
  console.log(`Status List ID: ${statusListId}\n`);

  // Step 3: Create and sign a badge credential
  console.log("Step 3: Creating badge credential...");
  // Generate a UUID for the badge credential
  const badgeId = crypto.randomUUID();
  const credentialId = `https://example.com/badges/${badgeId}`;

  // Determine the status index for this credential
  const statusIndex = getIndexFromUuid(badgeId);

  // Create the Open Badge 3.0 credential
  const badgeCredential = {
    "@context": OB3_CREDENTIAL_CONTEXT,
    id: credentialId,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: issuerDidKey,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: "did:example:recipient123",
      type: ["AchievementSubject"],
      achievement: {
        id: "https://example.com/achievements/coding-excellence",
        type: ["Achievement"],
        name: "Coding Excellence",
        description:
          "Awarded for demonstrating exceptional coding skills and practices.",
        criteria: {
          narrative:
            "The recipient demonstrated proficiency in algorithm design, writing clean code, and effective problem-solving.",
        },
        image: {
          id: "https://example.com/images/coding-badge.png",
          type: "Image",
        },
      },
    },
    credentialStatus: {
      id: `${statusListId}#${statusIndex}`,
      type: "StatusList2021Entry",
      statusPurpose: "revocation",
      statusListIndex: `${statusIndex}`,
      statusListCredential: statusListId,
    },
    credentialSchema: {
      id: OB3_CREDENTIAL_SCHEMA_URL,
      type: "JsonSchemaValidator2018",
    },
  };

  // Sign the badge credential
  const signedBadge = await signCredential(
    badgeCredential,
    issuerKeys.privateKey,
    {
      verificationMethod: `${issuerDidKey}#keys-1`,
      proofPurpose: "assertionMethod",
    },
  );

  console.log("Badge credential created and signed successfully!");
  console.log(`Badge ID: ${credentialId}`);
  console.log(`Status List Index: ${statusIndex}\n`);

  // Step 4: Verify the badge credential
  console.log("Step 4: Verifying badge credential...");

  // First verify the badge signature
  const badgeVerification = await verifyCredential(
    signedBadge,
    issuerKeys.publicKey,
  );

  console.log(
    `Badge signature verification: ${badgeVerification.verified ? "SUCCESS" : "FAILED"}`,
  );

  // Check if the badge is revoked in the status list
  console.log("Checking revocation status...");
  const encodedList = signedStatusList.credentialSubject.encodedList;
  const revoked = isCredentialRevoked(encodedList, statusIndex);

  console.log(`Badge revocation status: ${revoked ? "REVOKED" : "VALID"}`);
  console.log("Initial verification complete!\n");

  // Step 5: Revoke the badge credential
  console.log("Step 5: Revoking badge credential...");

  // Update the status list to revoke the credential
  const updatedEncodedList = updateCredentialStatus(
    encodedList,
    statusIndex,
    true,
  );

  // Update the status list credential with the new encoded list
  const updatedStatusList = {
    ...signedStatusList,
    credentialSubject: {
      ...signedStatusList.credentialSubject,
      encodedList: updatedEncodedList,
    },
  };

  // Re-sign the updated status list
  const updatedSignedStatusList = await signCredential(
    updatedStatusList,
    issuerKeys.privateKey,
    {
      verificationMethod: `${issuerDidKey}#keys-1`,
      proofPurpose: "assertionMethod",
    },
  );

  console.log("Badge credential revoked successfully!\n");

  // Step 6: Verify the revoked badge
  console.log("Step 6: Re-verifying badge credential after revocation...");

  // Check revocation status again
  const newEncodedList = updatedSignedStatusList.credentialSubject.encodedList;
  const newRevoked = isCredentialRevoked(newEncodedList, statusIndex);

  console.log(`Badge revocation status: ${newRevoked ? "REVOKED" : "VALID"}`);

  // In a real system, this would use a verification service that checks both
  // the signature and the revocation status
  const finalVerificationStatus =
    badgeVerification.verified && !newRevoked ? "VALID" : "INVALID";

  console.log(`Final badge verification status: ${finalVerificationStatus}`);
  console.log("\nWorkflow demonstration completed!");
}

// Run the workflow
runOB3Workflow().catch((err) => {
  console.error("Error in OB3 workflow:", err);
});
