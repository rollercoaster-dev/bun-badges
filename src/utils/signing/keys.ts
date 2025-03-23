import { base58 } from "@scure/base";
import { eq } from "drizzle-orm";
import { DatabaseService } from "@/services/db.service";
import { signingKeys } from "@/db/schema/signing";
import { type IssuerProfile } from "@/models/issuer.model";
import * as ed from "@noble/ed25519";
import { toJsonb } from "@/utils/db-helpers";

const db = DatabaseService.db;

type PublicKey = NonNullable<IssuerProfile["publicKey"]>[number];
type PublicKeyJwk = NonNullable<PublicKey["publicKeyJwk"]>;

export interface StoredKeyPair {
  publicKeyMultibase: string;
  privateKeyMultibase: string;
  controller: string;
  type: "Ed25519VerificationKey2020";
  keyInfo: PublicKey;
}

export interface CryptoKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  controller: string;
  type: "Ed25519VerificationKey2020";
  keyInfo: PublicKey;
}

function encodeMultibase(key: Uint8Array): string {
  return "z" + base58.encode(key);
}

function encodeBase64Url(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Generates a new Ed25519 keypair for an issuer
 * @param issuerId - UUID of the issuer
 * @param skipStorage - Skip storing in the database (for tests)
 * @returns The generated keypair
 */
export async function generateSigningKey(
  issuerId: string,
  skipStorage: boolean = false,
): Promise<CryptoKeyPair> {
  // Generate Ed25519 key pair
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKey(privateKey);

  // Create DID key identifier
  const multicodecPrefix = new Uint8Array([0xed, 0x01]); // Ed25519 multicodec prefix
  const didKeyBytes = new Uint8Array(
    multicodecPrefix.length + publicKey.length,
  );
  didKeyBytes.set(multicodecPrefix);
  didKeyBytes.set(publicKey, multicodecPrefix.length);
  const didKey = `did:key:${encodeMultibase(didKeyBytes)}`;

  // Create JWK representation
  const publicKeyJwk: PublicKeyJwk = {
    kty: "OKP",
    crv: "Ed25519",
    x: encodeBase64Url(publicKey),
  };

  // Create public key object
  const keyInfo: PublicKey = {
    id: `${didKey}#key-1`,
    type: "Ed25519VerificationKey2020",
    controller: didKey,
    publicKeyJwk,
  };

  if (!skipStorage) {
    // Store the keypair in the database
    const storedKeyPair: StoredKeyPair = {
      publicKeyMultibase: encodeMultibase(publicKey),
      privateKeyMultibase: encodeMultibase(privateKey),
      controller: didKey,
      type: "Ed25519VerificationKey2020",
      keyInfo,
    };

    await db.insert(signingKeys).values({
      issuerId,
      publicKeyMultibase: storedKeyPair.publicKeyMultibase,
      privateKeyMultibase: storedKeyPair.privateKeyMultibase,
      controller: storedKeyPair.controller,
      type: storedKeyPair.type,
      keyInfo: toJsonb(storedKeyPair.keyInfo),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return {
    publicKey,
    privateKey,
    controller: didKey,
    type: "Ed25519VerificationKey2020",
    keyInfo,
  };
}

/**
 * Retrieves a signing key for an issuer
 * @param issuerId - UUID of the issuer
 * @returns The keypair if found, null otherwise
 */
export async function getSigningKey(
  issuerId: string,
): Promise<CryptoKeyPair | null> {
  const [key] = await db
    .select()
    .from(signingKeys)
    .where(eq(signingKeys.issuerId, issuerId))
    .limit(1);

  if (!key) {
    return null;
  }

  // Import the stored keys
  const publicKey = base58.decode(key.publicKeyMultibase.slice(1));
  const privateKey = base58.decode(key.privateKeyMultibase.slice(1));

  return {
    publicKey,
    privateKey,
    controller: key.controller,
    type: "Ed25519VerificationKey2020",
    keyInfo: key.keyInfo as PublicKey,
  };
}
