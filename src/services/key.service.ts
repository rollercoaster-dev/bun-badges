import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/config"; // Import db and schema directly
import logger from "@/utils/logger"; // Use default import
import { APIError } from "@/utils/errors"; // Correct error class name

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // Bytes for AES GCM
const SALT_LENGTH = 16; // Bytes for key derivation
const KEY_LENGTH = 32; // Bytes for AES-256
const TAG_LENGTH = 16; // Bytes for GCM auth tag
const ITERATIONS = 100000; // Key derivation iterations
const DIGEST = "sha512";

export class KeyManagementService {
  private masterKey: Buffer;

  constructor(/* db: IDatabaseService */) {
    // Remove unused db parameter
    const masterEncryptionKey = process.env.MASTER_ENCRYPTION_KEY; // Use process.env
    if (!masterEncryptionKey) {
      logger.error(
        "MASTER_ENCRYPTION_KEY is not set in environment variables!",
      );
      throw new Error("MASTER_ENCRYPTION_KEY must be configured.");
    }
    // Derive a stable key from the master key using PBKDF2. This adds protection against weak master keys.
    // In a real scenario, the salt might be stored or derived consistently, but for simplicity here, we'll use a fixed salt.
    // WARNING: Using a fixed salt reduces security compared to a unique salt per encryption.
    // Consider storing a unique salt alongside the encrypted data if enhancing security.
    const salt = Buffer.from("fixed-salt-for-key-derivation"); // Example fixed salt - IMPROVE THIS IN PRODUCTION
    this.masterKey = crypto.pbkdf2Sync(
      masterEncryptionKey,
      salt,
      ITERATIONS,
      KEY_LENGTH,
      DIGEST,
    );
  }

  /**
   * Generates a new Ed25519 key pair for signing.
   * Exports keys in PEM format.
   */
  generateKeyPair(): { publicKey: string; privateKey: string } {
    logger.info("Generating new Ed25519 key pair...");
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
        publicKeyEncoding: {
          type: "spki",
          format: "pem",
        },
        privateKeyEncoding: {
          type: "pkcs8",
          format: "pem",
        },
      });
      logger.info("Successfully generated Ed25519 key pair.");
      return { publicKey, privateKey };
    } catch (error) {
      logger.error({ err: error }, "Failed to generate key pair");
      throw new APIError("Key generation failed", 500);
    }
  }

  /**
   * Encrypts a private key using AES-256-GCM with the derived master key.
   * @param privateKey The private key string to encrypt.
   * @returns Base64 encoded string containing iv + ciphertext + authTag.
   */
  encryptPrivateKey(privateKey: string): string {
    logger.debug("Encrypting private key...");
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);

      let encrypted = cipher.update(privateKey, "utf8", "base64");
      encrypted += cipher.final("base64");

      const tag = cipher.getAuthTag();

      // Combine IV, ciphertext, and tag for storage
      const combined = Buffer.concat([
        iv,
        tag,
        Buffer.from(encrypted, "base64"),
      ]);

      logger.debug("Private key encrypted successfully.");
      return combined.toString("base64");
    } catch (error) {
      logger.error({ err: error }, "Failed to encrypt private key");
      throw new APIError("Encryption failed", 500);
    }
  }

  /**
   * Decrypts a private key encrypted with encryptPrivateKey.
   * @param encryptedKey Base64 encoded string (iv + ciphertext + authTag).
   * @returns The original private key string.
   */
  decryptPrivateKey(encryptedKey: string): string {
    logger.debug("Decrypting private key...");
    try {
      const combined = Buffer.from(encryptedKey, "base64");

      // Extract IV, tag, and ciphertext
      const iv = combined.subarray(0, IV_LENGTH);
      const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
      const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

      const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(
        ciphertext.toString("base64"),
        "base64",
        "utf8",
      );
      decrypted += decipher.final("utf8");

      logger.debug("Private key decrypted successfully.");
      return decrypted;
    } catch (error) {
      logger.error(
        { err: error },
        "Failed to decrypt private key - potentially invalid key or data tampering",
      );
      // Distinguish common decryption errors if needed
      if (
        error instanceof Error &&
        error.message.includes("Unsupported state")
      ) {
        throw new APIError(
          "Decryption failed: Invalid authentication tag",
          400,
        );
      }
      throw new APIError("Decryption failed", 500);
    }
  }

  /**
   * Retrieves an issuer's encrypted private key from the database and decrypts it.
   * @param issuerId The UUID of the issuer.
   * @returns The decrypted private key string.
   * @throws {ApiError} if issuer or key not found, or decryption fails.
   */
  async getIssuerPrivateKey(issuerId: string): Promise<string> {
    logger.debug(
      { issuerId },
      "Retrieving encrypted private key for issuer...",
    );

    // Query database directly using imported db and schema
    const issuers = await db
      .select({
        encryptedPrivateKey: schema.issuerProfiles.encryptedPrivateKey,
      })
      .from(schema.issuerProfiles)
      .where(eq(schema.issuerProfiles.issuerId, issuerId))
      .limit(1);

    const issuer = issuers[0];

    if (!issuer) {
      logger.warn(
        { issuerId },
        "Issuer not found when trying to retrieve private key.",
      );
      throw new APIError("Issuer not found", 404);
    }

    if (!issuer.encryptedPrivateKey) {
      logger.warn(
        { issuerId },
        "Issuer found, but no encrypted private key is stored.",
      );
      throw new APIError("Private key not found for this issuer", 404);
    }

    logger.debug({ issuerId }, "Found encrypted key, attempting decryption...");
    return this.decryptPrivateKey(issuer.encryptedPrivateKey);
  }
}
