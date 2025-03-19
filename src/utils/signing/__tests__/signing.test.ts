import { describe, test, expect } from "bun:test";
import { generateSigningKey } from "../keys";
import { signCredential, verifyCredential } from "../credentials";

describe("Digital Signing", () => {
  test("should generate a keypair and sign/verify a credential", async () => {
    // Generate a keypair without database storage
    const keyPair = await generateSigningKey("test-issuer-id", true);
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
    expect(keyPair.controller).toContain("did:key:");
    expect(keyPair.type).toBe("Ed25519VerificationKey2020");

    // Create a test credential
    const credential = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3id.org/security/suites/jws-2020/v1",
      ],
      id: "http://example.edu/credentials/3732",
      type: ["VerifiableCredential", "BadgeCredential"],
      issuer: {
        id: keyPair.controller,
        type: "Profile",
        name: "Test Issuer",
      },
      issuanceDate: "2024-03-20T19:23:24Z",
      credentialSubject: {
        id: "did:example:ebfeb1f712ebc6f1c276e12ec21",
        type: ["BadgeClass"],
        name: "Test Badge",
        description: "A test badge for testing digital signatures",
      },
    };

    // Sign the credential
    const signedCredential = await signCredential(credential, { keyPair });
    expect(signedCredential.proof).toBeDefined();
    expect(signedCredential.proof.type).toBe("JsonWebSignature2020");
    expect(signedCredential.proof.verificationMethod).toContain(
      keyPair.controller,
    );

    // Verify the credential
    const isValid = await verifyCredential(signedCredential, keyPair.publicKey);
    expect(isValid).toBe(true);

    // Verify with wrong public key should fail
    const wrongKeyPair = await generateSigningKey("another-issuer-id", true);
    // Since we're using a completely different key pair, this should fail
    const isInvalid = await verifyCredential(
      signedCredential,
      wrongKeyPair.publicKey,
    );
    // Wrong key should return false
    expect(isInvalid).toBe(false);
  });
});
