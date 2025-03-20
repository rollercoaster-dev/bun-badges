import { base58 } from "@scure/base";
import * as crypto from "crypto";

/**
 * Generates a new Ed25519 keypair for use in digital signatures
 * @returns Promise resolving to a keypair with multibase-encoded keys
 */
export async function generateEd25519KeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  // Use the node.js/Bun crypto API to generate an Ed25519 key pair
  const keyPair = crypto.generateKeyPairSync("ed25519", {
    publicKeyEncoding: {
      type: "spki",
      format: "der",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "der",
    },
  });

  // Extract raw key bytes
  const publicKeyBytes = extractPublicKeyBytes(keyPair.publicKey);
  const privateKeyBytes = extractPrivateKeyBytes(keyPair.privateKey);

  // Encode keys using multibase (base58 with 'z' prefix)
  const publicKey = encodeMultibase(publicKeyBytes);
  const privateKey = encodeMultibase(privateKeyBytes);

  return {
    publicKey,
    privateKey,
  };
}

/**
 * Extracts the raw Ed25519 public key bytes from a DER-encoded SPKI public key
 * @param derPublicKey DER-encoded public key
 * @returns Raw public key bytes
 */
function extractPublicKeyBytes(derPublicKey: Buffer): Uint8Array {
  // For Ed25519, the raw public key is typically the last 32 bytes of the DER structure
  // This is a simplified extraction that works for Ed25519 keys
  return derPublicKey.slice(derPublicKey.length - 32);
}

/**
 * Extracts the raw Ed25519 private key bytes from a DER-encoded PKCS8 private key
 * @param derPrivateKey DER-encoded private key
 * @returns Raw private key bytes
 */
function extractPrivateKeyBytes(derPrivateKey: Buffer): Uint8Array {
  // For Ed25519, the private key is typically 32 bytes
  // We search for the key bytes in the DER structure
  // This is a simplified approach that works for Ed25519 keys

  // The private key is typically after these bytes in the DER structure
  const privateKeyMarker = Buffer.from([0x04, 0x20]);
  const markerIndex = derPrivateKey.indexOf(privateKeyMarker);

  if (markerIndex !== -1) {
    return derPrivateKey.slice(
      markerIndex + privateKeyMarker.length,
      markerIndex + privateKeyMarker.length + 32,
    );
  }

  // Fallback: return the last 32 bytes as the private key
  return derPrivateKey.slice(derPrivateKey.length - 32);
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
