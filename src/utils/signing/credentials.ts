import base64url from "base64url";
import * as ed from "@noble/ed25519";
import type {
  JsonLdProof,
  VerifiableCredential,
  SignedCredential,
} from "@/utils/signing/types";

interface SigningOptions {
  /**
   * The keypair to use for signing
   */
  keyPair: {
    publicKey: Uint8Array;
    privateKey: Uint8Array;
    controller: string;
    type: string;
  };

  /**
   * The date to use in the proof (defaults to now)
   */
  date?: string;
}

// Document loader deliberately removed as it's not used in the current implementation

interface JsonWebSignature2020Proof extends JsonLdProof {
  type: "JsonWebSignature2020";
  created: string;
  verificationMethod: string;
  proofPurpose: "assertionMethod";
  jws: string;
}

async function createJws(
  data: Uint8Array,
  privateKey: Uint8Array,
): Promise<string> {
  const header = {
    alg: "EdDSA",
    b64: true,
    crit: ["b64"],
  };

  const encodedHeader = base64url.encode(JSON.stringify(header));
  const encodedData = base64url.encode(Buffer.from(data));
  const signingInput = new TextEncoder().encode(
    `${encodedHeader}.${encodedData}`,
  );

  const signature = await ed.sign(signingInput, privateKey);

  // Direct base64url encoding of the signature bytes
  return `${encodedHeader}.${encodedData}.${base64url.encode(Buffer.from(signature))}`;
}

async function verifyJws(jws: string, publicKey: Uint8Array): Promise<boolean> {
  const [encodedHeader, encodedData, encodedSignature] = jws.split(".");
  if (!encodedHeader || !encodedData || !encodedSignature) {
    throw new Error("Invalid JWS format");
  }

  const signingInput = new TextEncoder().encode(
    `${encodedHeader}.${encodedData}`,
  );
  // Directly decode the base64url signature to get the raw bytes
  const signature = Buffer.from(base64url.decode(encodedSignature));

  try {
    return await ed.verify(signature, signingInput, publicKey);
  } catch {
    // Silent fail for verification errors
    return false;
  }
}

/**
 * Signs a credential using JSON-LD Signatures
 * @param credential - The credential to sign
 * @param options - Signing options
 * @returns The signed credential
 */
export async function signCredential(
  credential: VerifiableCredential,
  options: SigningOptions,
): Promise<SignedCredential> {
  // Ensure credential has required context
  if (!credential["@context"]) {
    credential["@context"] = [];
  }
  if (!Array.isArray(credential["@context"])) {
    credential["@context"] = [credential["@context"]];
  }
  if (
    !credential["@context"].includes(
      "https://w3id.org/security/suites/jws-2020/v1",
    )
  ) {
    credential["@context"].push("https://w3id.org/security/suites/jws-2020/v1");
  }

  // Create JWS using credential data
  const credentialData = new TextEncoder().encode(JSON.stringify(credential));
  const jws = await createJws(credentialData, options.keyPair.privateKey);

  const proof: JsonWebSignature2020Proof = {
    type: "JsonWebSignature2020",
    created: options.date ?? new Date().toISOString(),
    verificationMethod: `${options.keyPair.controller}#key-1`,
    proofPurpose: "assertionMethod",
    jws,
  };

  return {
    ...credential,
    proof,
  };
}

/**
 * Verifies a signed credential
 * @param signedCredential - The signed credential to verify
 * @param publicKey - The public key to verify with
 * @returns Whether the credential is valid
 */
export async function verifyCredential(
  signedCredential: SignedCredential,
  publicKey: Uint8Array,
): Promise<boolean> {
  const { proof } = signedCredential;
  if (!proof?.jws) {
    throw new Error("No proof found in credential");
  }

  return await verifyJws(proof.jws, publicKey);
}
