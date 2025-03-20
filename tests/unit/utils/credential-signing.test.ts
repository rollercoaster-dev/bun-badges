import { describe, it, expect, beforeAll } from "bun:test";
import * as crypto from "crypto";
import { generateEd25519KeyPair } from "../../../src/utils/signing/key-generation";
import {
  signCredential,
  verifyCredential,
} from "../../../src/utils/signing/credential";
import {
  OB3_CREDENTIAL_CONTEXT,
  OB3_CREDENTIAL_SCHEMA_URL,
} from "../../../src/constants/context-urls";

describe("Credential Signing and Verification", () => {
  let keyPair: { publicKey: string; privateKey: string };
  let issuer: string;

  // Sample credential without proof
  const sampleCredential = {
    "@context": OB3_CREDENTIAL_CONTEXT,
    id: "urn:uuid:" + crypto.randomUUID(),
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: "", // Will be filled in beforeAll
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: "did:example:recipient123",
      type: ["AchievementSubject"],
      achievement: {
        id: "https://example.com/achievements/123",
        type: ["Achievement"],
        name: "Test Achievement",
        description: "A test achievement for unit testing",
      },
    },
    credentialSchema: {
      id: OB3_CREDENTIAL_SCHEMA_URL,
      type: "JsonSchemaValidator2018",
    },
  };

  beforeAll(async () => {
    // Generate keys for testing
    keyPair = await generateEd25519KeyPair();

    // Use the public key as part of the DID
    const publicKeyMultibase = keyPair.publicKey.replace("z", "");
    issuer = `did:key:${publicKeyMultibase}`;

    // Set the issuer in the sample credential
    sampleCredential.issuer = issuer;
  });

  it("should sign a credential with Open Badges 3.0 compliant signature", async () => {
    // Sign the credential
    const signedCredential = await signCredential(
      sampleCredential,
      keyPair.privateKey,
      {
        verificationMethod: `${issuer}#keys-1`,
        proofPurpose: "assertionMethod",
      },
    );

    // Verify the signed credential has a proof
    expect(signedCredential).toHaveProperty("proof");
    expect(signedCredential.proof).toHaveProperty("type", "DataIntegrityProof");
    expect(signedCredential.proof).toHaveProperty(
      "cryptosuite",
      "eddsa-rdfc-2022",
    );
    expect(signedCredential.proof).toHaveProperty(
      "proofPurpose",
      "assertionMethod",
    );
    expect(signedCredential.proof).toHaveProperty("verificationMethod");
    expect(signedCredential.proof).toHaveProperty("created");
    expect(signedCredential.proof).toHaveProperty("proofValue");
  });

  it("should verify a correctly signed credential", async () => {
    // Sign the credential
    const signedCredential = await signCredential(
      sampleCredential,
      keyPair.privateKey,
      {
        verificationMethod: `${issuer}#keys-1`,
        proofPurpose: "assertionMethod",
      },
    );

    // Verify the signed credential
    const verificationResult = await verifyCredential(
      signedCredential,
      keyPair.publicKey,
    );

    expect(verificationResult.verified).toBe(true);
    expect(verificationResult.results).toBeDefined();
  });

  it("should reject a credential with a tampered property", async () => {
    // Sign the credential
    const signedCredential = await signCredential(
      sampleCredential,
      keyPair.privateKey,
      {
        verificationMethod: `${issuer}#keys-1`,
        proofPurpose: "assertionMethod",
      },
    );

    // Tamper with the credential
    const tamperedCredential = JSON.parse(JSON.stringify(signedCredential));
    tamperedCredential.credentialSubject.achievement.name =
      "Tampered Achievement";

    // Verify the tampered credential
    const verificationResult = await verifyCredential(
      tamperedCredential,
      keyPair.publicKey,
    );

    expect(verificationResult.verified).toBe(false);
  });

  it("should reject a credential with an incorrect signature", async () => {
    // Sign the credential
    const signedCredential = await signCredential(
      sampleCredential,
      keyPair.privateKey,
      {
        verificationMethod: `${issuer}#keys-1`,
        proofPurpose: "assertionMethod",
      },
    );

    // Generate a different key pair
    const differentKeyPair = await generateEd25519KeyPair();

    // Verify with the wrong public key
    const verificationResult = await verifyCredential(
      signedCredential,
      differentKeyPair.publicKey,
    );

    expect(verificationResult.verified).toBe(false);
  });

  it("should handle a credential without a proof", async () => {
    // Try to verify an unsigned credential
    const verificationResult = await verifyCredential(
      sampleCredential,
      keyPair.publicKey,
    );

    expect(verificationResult.verified).toBe(false);
    expect(verificationResult.error).toBeDefined();
  });
});
