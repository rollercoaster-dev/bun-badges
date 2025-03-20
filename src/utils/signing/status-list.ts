/**
 * Status List 2021 utilities for Open Badges 3.0
 * Based on the W3C Status List 2021 specification
 */

// For efficiently handling bit operations in status lists
import FastBitSet from "fast-bitset";

/**
 * Create a new bitstring for a status list credential
 * @param size The size of the bitstring (number of credentials that can be tracked)
 * @returns Base64 encoded bitstring
 */
export function createEncodedBitString(size: number = 16384): string {
  // Create a BitSet of the specified size with all bits set to 0 (not revoked)
  const bitSet = new FastBitSet(size);
  return encodeBitString(bitSet);
}

/**
 * Encode a BitSet as a Base64 string for use in status list credentials
 * @param bitSet BitSet representing status
 * @returns Base64 encoded bitstring
 */
export function encodeBitString(bitSet: FastBitSet): string {
  const bitString = bitSet.toString();
  const buffer = Buffer.from(bitString, "binary");
  return buffer.toString("base64");
}

/**
 * Decode a Base64 string into a BitSet
 * @param encoded Base64 encoded bitstring
 * @returns BitSet object
 */
export function decodeBitString(encoded: string): FastBitSet {
  const buffer = Buffer.from(encoded, "base64");
  const bitString = buffer.toString("binary");
  return FastBitSet.fromString(bitString);
}

/**
 * Set a credential's status in the list (revoked or not revoked)
 * @param encodedList Base64 encoded bitstring
 * @param index Index of the credential in the list
 * @param revoked Whether the credential is revoked
 * @returns Updated Base64 encoded bitstring
 */
export function updateCredentialStatus(
  encodedList: string,
  index: number,
  revoked: boolean,
): string {
  const bitSet = decodeBitString(encodedList);

  // Set the bit at the specified index to the revoked status
  // In status lists, 1 = revoked, 0 = not revoked
  if (revoked) {
    bitSet.set(index);
  } else {
    bitSet.unset(index);
  }

  return encodeBitString(bitSet);
}

/**
 * Check if a credential is revoked in the status list
 * @param encodedList Base64 encoded bitstring
 * @param index Index of the credential in the list
 * @returns Whether the credential is revoked
 */
export function isCredentialRevoked(
  encodedList: string,
  index: number,
): boolean {
  const bitSet = decodeBitString(encodedList);
  return bitSet.get(index);
}

/**
 * Generate a compact index from a UUID
 * This helps map UUIDs to smaller numeric indices for the bitstring
 * @param uuid UUID string
 * @returns Numeric index
 */
export function getIndexFromUuid(uuid: string): number {
  // Remove dashes and convert to a hex string
  const hex = uuid.replace(/-/g, "");

  // Take the first 8 characters and convert to number
  // This gives us a 32-bit integer from the most significant bits of the UUID
  const index = parseInt(hex.substring(0, 8), 16);

  // Return modulo a reasonable size to keep indices within bounds
  // This may cause collisions with very large numbers of credentials
  return index % 16384;
}

/**
 * Create a mapping from UUID to index for more collision-resistant storage
 * @param uuid UUID string
 * @param index Optional explicit index to assign
 * @returns Object with UUID and index
 */
export interface UuidIndexMapping {
  uuid: string;
  index: number;
}

/**
 * Create a StatusList2021 credential for Open Badges 3.0
 * @param issuer Issuer URI or profile
 * @param id Credential ID
 * @param size Size of the bitstring
 * @returns A StatusList2021Credential structure (without proof)
 */
export function createStatusListCredential(
  issuer: string | object,
  id: string,
  purpose: "revocation" | "suspension" = "revocation",
  size: number = 16384,
): any {
  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/vc/status-list/2021/v1",
    ],
    id: id,
    type: ["VerifiableCredential", "StatusList2021Credential"],
    issuer: issuer,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: `${id}#list`,
      type: "StatusList2021",
      statusPurpose: purpose,
      encodedList: createEncodedBitString(size),
    },
  };
}
