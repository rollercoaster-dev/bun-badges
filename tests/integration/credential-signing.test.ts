import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { CredentialSigningService } from "../../src/services/credential-signing.service";
import {
  KeyManagementService,
  KeyType,
  KeyAlgorithm,
  keyManagementService,
} from "../../src/services/key-management.service";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

describe("Credential Signing Service", () => {
  // Create a temporary directory for test keys
  const testKeysDir = join(process.cwd(), "tests", "temp", "keys");
  let testKeyManagementService: KeyManagementService;
  let credentialSigningService: CredentialSigningService;
  let testKeyId: string;

  beforeAll(async () => {
    // Ensure the test keys directory exists
    if (!existsSync(testKeysDir)) {
      mkdirSync(testKeysDir, { recursive: true });
    }

    // Create a new key management service instance for testing
    testKeyManagementService = new KeyManagementService();
    await testKeyManagementService.initialize();

    // Create a new credential signing service instance
    credentialSigningService = new CredentialSigningService();

    // Generate a test key
    const keyPair = await testKeyManagementService.generateKey(
      KeyType.SIGNING,
      KeyAlgorithm.RS256,
      "test-signing-key",
    );

    testKeyId = keyPair.id;

    // Mock the keyManagementService.getKey and getDefaultSigningKey methods
    // @ts-ignore - we're mocking the methods
    keyManagementService.getKey = async (id: string) =>
      await testKeyManagementService.getKey(id);
    // @ts-ignore - we're mocking the methods
    keyManagementService.getDefaultSigningKey = async () =>
      await testKeyManagementService.getDefaultSigningKey();
  });

  afterAll(() => {
    // Clean up the test keys directory
    rmSync(testKeysDir, { recursive: true, force: true });
  });

  test("should sign a credential using JWT", async () => {
    // Create a test credential payload
    const payload = {
      iss: "https://example.com",
      sub: "recipient-123",
      vc: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: {
          id: "https://example.com",
          name: "Example Issuer",
        },
        credentialSubject: {
          id: "recipient-123",
          achievement: {
            id: "https://example.com/badges/123",
            name: "Test Badge",
            description: "A test badge for unit testing",
          },
        },
      },
    };

    // Sign the credential
    const jwt = await credentialSigningService.signCredentialJwt(
      payload,
      testKeyId,
    );

    // Verify the JWT format
    expect(jwt).toBeDefined();
    expect(typeof jwt).toBe("string");
    expect(jwt.split(".").length).toBe(3); // Header, payload, signature
  });

  test("should verify a credential JWT", async () => {
    // Create a test credential payload
    const payload = {
      iss: "https://example.com",
      sub: "recipient-123",
      vc: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: {
          id: "https://example.com",
          name: "Example Issuer",
        },
        credentialSubject: {
          id: "recipient-123",
          achievement: {
            id: "https://example.com/badges/123",
            name: "Test Badge",
            description: "A test badge for unit testing",
          },
        },
      },
    };

    // Sign the credential
    const jwt = await credentialSigningService.signCredentialJwt(
      payload,
      testKeyId,
    );

    // Verify the credential
    const verifiedPayload =
      await credentialSigningService.verifyCredentialJwt(jwt);

    // Verify the payload
    expect(verifiedPayload).toBeDefined();
    expect(verifiedPayload.iss).toBe(payload.iss);
    expect(verifiedPayload.sub).toBe(payload.sub);
    expect(verifiedPayload.vc).toBeDefined();
  });

  test("should sign a credential using Linked Data Signatures", async () => {
    // Create a test credential
    const credential = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3id.org/security/suites/ed25519-2020/v1",
      ],
      id: "https://example.com/credentials/123",
      type: ["VerifiableCredential", "OpenBadgeCredential"],
      issuer: {
        id: "https://example.com",
        name: "Example Issuer",
      },
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: "did:example:recipient-123",
        achievement: {
          id: "https://example.com/badges/123",
          name: "Test Badge",
          description: "A test badge for unit testing",
        },
      },
    };

    // Sign the credential
    const signedCredential = await credentialSigningService.signCredentialLd(
      credential,
      testKeyId,
    );

    // Verify the signed credential
    expect(signedCredential).toBeDefined();
    const proof = signedCredential.proof as {
      type: string;
      proofPurpose: string;
      verificationMethod: string;
    };
    expect(proof).toBeDefined();
    expect(proof.type).toBe("Ed25519Signature2020");
    expect(proof.proofPurpose).toBe("assertionMethod");
    expect(proof.verificationMethod).toContain(testKeyId);
  });

  test("should verify a credential with Linked Data Signatures", async () => {
    // Create a test credential
    const credential = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3id.org/security/suites/ed25519-2020/v1",
      ],
      id: "https://example.com/credentials/123",
      type: ["VerifiableCredential", "OpenBadgeCredential"],
      issuer: {
        id: "https://example.com",
        name: "Example Issuer",
      },
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: "did:example:recipient-123",
        achievement: {
          id: "https://example.com/badges/123",
          name: "Test Badge",
          description: "A test badge for unit testing",
        },
      },
    };

    // Sign the credential
    const signedCredential = await credentialSigningService.signCredentialLd(
      credential,
      testKeyId,
    );

    // Verify the credential
    const isValid =
      await credentialSigningService.verifyCredentialLd(signedCredential);

    // Verify the result
    expect(isValid).toBe(true);
  });
});
