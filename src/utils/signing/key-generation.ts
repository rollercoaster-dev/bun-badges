import { base58 } from "@scure/base";
import * as ed from "@noble/ed25519";

/**
 * Generates a new Ed25519 keypair for use in digital signatures
 * @returns Promise resolving to a keypair with multibase-encoded keys
 */
export async function generateEd25519KeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  // Generate Ed25519 key pair
  const privateKeyBytes = ed.utils.randomPrivateKey();
  const publicKeyBytes = await ed.getPublicKey(privateKeyBytes);

  // Encode keys using multibase (base58 with 'z' prefix)
  const publicKey = encodeMultibase(publicKeyBytes);
  const privateKey = encodeMultibase(privateKeyBytes);

  return {
    publicKey,
    privateKey,
  };
}

/**
 * Encodes a byte array as a multibase string (base58 with 'z' prefix)
 * @param key Byte array to encode
 * @returns Multibase encoded string
 */
function encodeMultibase(key: Uint8Array): string {
  return "z" + base58.encode(key);
}

/**
 * Decodes a multibase string into a byte array
 * @param multibase Multibase encoded string
 * @returns Decoded byte array
 */
export function decodeMultibase(multibase: string): Uint8Array {
  if (!multibase.startsWith("z")) {
    throw new Error("Invalid multibase format, expected 'z' prefix");
  }
  return base58.decode(multibase.slice(1));
}
