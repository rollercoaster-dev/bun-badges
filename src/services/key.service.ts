import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { DatabaseService } from "@/services/db.service"; // Import DatabaseService
import { issuerProfiles } from "@/db/schema/issuers"; // Import specific schema
import logger from "@/utils/logger"; // Use default import
import { APIError } from "@/utils/errors"; // Correct error class name

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // Bytes for AES GCM
const SALT_LENGTH = 16; // Bytes for PBKDF2 salt
const KEY_LENGTH = 32; // Bytes for derived key (AES-256)
const TAG_LENGTH = 16; // Bytes for GCM auth tag
const ITERATIONS = 100000; // Key derivation iterations
const DIGEST = "sha512"; // Hash algorithm for PBKDF2

/**
 * Service for managing cryptographic keys.
 *
 * Key Storage Format:
 * Encrypted private keys are stored as base64-encoded strings with the following components concatenated:
 *   - Salt (16 bytes): Unique per encryption operation, used for key derivation
 *   - IV (16 bytes): Initialization vector for AES-GCM
 *   - Auth Tag (16 bytes): Authentication tag from AES-GCM
 *   - Ciphertext (variable length): The encrypted private key data
 *
 * The storage format is: base64(salt + iv + tag + ciphertext)
 *
 * This format ensures each encryption operation uses a unique salt for key derivation
 * rather than a fixed salt, improving security by preventing related-key attacks.
 */
export class KeyManagementService {
  private masterEncryptionKey: string; // Store the raw key from env

  constructor(/* db: IDatabaseService */) {
    const masterEnvKey = process.env.MASTER_ENCRYPTION_KEY;
    if (!masterEnvKey) {
      logger.error(
        "MASTER_ENCRYPTION_KEY is not set in environment variables!",
      );
      throw new Error("MASTER_ENCRYPTION_KEY must be configured.");
    }
    this.masterEncryptionKey = masterEnvKey; // Store the raw key
    logger.info("KeyManagementService initialized with master key.");
    // Removed PBKDF2 derivation with fixed salt from constructor
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
   * Encrypts a private key using AES-256-GCM with a key derived from the master key and a unique salt.
   * @param privateKey The private key string to encrypt.
   * @returns Base64 encoded string containing salt + iv + authTag + ciphertext.
   */
  encryptPrivateKey(privateKey: string): string {
    logger.debug("Encrypting private key with unique salt...");
    try {
      // 1. Generate unique salt
      const salt = crypto.randomBytes(SALT_LENGTH);
      logger.debug(`Generated Salt: ${salt.toString("hex")}`);

      // 2. Derive unique key using PBKDF2 with the unique salt
      const derivedKey = crypto.pbkdf2Sync(
        this.masterEncryptionKey,
        salt,
        ITERATIONS,
        KEY_LENGTH,
        DIGEST,
      );
      logger.debug(`Derived key using unique salt.`); // Avoid logging the key itself

      // 3. Generate unique IV
      const iv = crypto.randomBytes(IV_LENGTH);
      logger.debug(`Generated IV: ${iv.toString("hex")}`);

      // 4. Create cipher with derived key and IV
      const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
      logger.debug("Cipher created.");

      // 5. Encrypt data
      // Ensure update and final work correctly with Buffer output
      const encryptedBuffer = Buffer.concat([
        cipher.update(privateKey, "utf8"),
        cipher.final(),
      ]);
      logger.debug("Encryption complete.");

      // 6. Get auth tag
      const tag = cipher.getAuthTag();
      logger.debug(`Got auth tag: ${tag.toString("hex")}`);

      // 7. Combine salt, iv, tag, and ciphertext
      const combined = Buffer.concat([
        salt, // SALT_LENGTH bytes
        iv, // IV_LENGTH bytes
        tag, // TAG_LENGTH bytes
        encryptedBuffer, // Variable length
      ]);

      // 8. Encode as Base64
      const result = combined.toString("base64");
      logger.debug("Private key encrypted successfully with unique salt.");
      return result;
    } catch (error) {
      logger.error(
        { err: error },
        "Failed to encrypt private key with unique salt",
      );
      // Ensure error handling is appropriate, maybe re-throw or use specific error type
      throw new APIError("Encryption failed", 500);
    }
  }

  /**
   * Decrypts a private key encrypted with encryptPrivateKey.
   * @param encryptedKey Base64 encoded string (salt + iv + authTag + ciphertext).
   * @returns The original private key string.
   */
  decryptPrivateKey(encryptedKey: string): string {
    logger.debug("Decrypting private key...");
    try {
      const combined = Buffer.from(encryptedKey, "base64");
      logger.debug(`Combined buffer length: ${combined?.length}`);

      // 1. Extract components using correct offsets
      const salt = combined.subarray(0, SALT_LENGTH);
      const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
      const tag = combined.subarray(
        SALT_LENGTH + IV_LENGTH,
        SALT_LENGTH + IV_LENGTH + TAG_LENGTH,
      );
      const ciphertext = combined.subarray(
        SALT_LENGTH + IV_LENGTH + TAG_LENGTH,
      );

      logger.debug(`Extracted Salt: ${salt.toString("hex")}`);
      logger.debug(`Extracted IV: ${iv.toString("hex")}`);
      logger.debug(`Extracted Tag: ${tag.toString("hex")}`);
      logger.debug(`Ciphertext length: ${ciphertext.length}`);

      // 2. Derive key using extracted salt
      const derivedKey = crypto.pbkdf2Sync(
        this.masterEncryptionKey, // Use the stored master key
        salt,
        ITERATIONS,
        KEY_LENGTH,
        DIGEST,
      );
      logger.debug("Derived key using extracted salt."); // Avoid logging key

      // 3. Create decipher with derived key and IV
      logger.debug("Creating decipher...");
      const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
      logger.debug("Decipher created.");

      // 4. Set auth tag
      logger.debug("Setting auth tag...");
      decipher.setAuthTag(tag);
      logger.debug("Auth tag set.");

      // 5. Decrypt data (pass raw buffer to update)
      logger.debug("Updating decipher...");
      const decryptedBufferPart1 = decipher.update(ciphertext); // Pass buffer directly
      logger.debug("Decipher updated.");

      logger.debug("Finalizing decipher...");
      const decryptedBufferPart2 = decipher.final();
      const finalDecryptedBuffer = Buffer.concat([
        decryptedBufferPart1,
        decryptedBufferPart2,
      ]);
      const decryptedString = finalDecryptedBuffer.toString("utf8");
      logger.debug("Decipher finalized.");

      logger.debug("Private key decrypted successfully.");
      return decryptedString;
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

    // Access db via static property
    const db = DatabaseService.db;

    const issuers = await db
      .select({
        encryptedPrivateKey: issuerProfiles.encryptedPrivateKey,
      })
      .from(issuerProfiles)
      .where(eq(issuerProfiles.issuerId, issuerId))
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
