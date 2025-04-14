/**
 * Key Management Service
 *
 * This service handles secure key management for Open Badges 3.0 implementation.
 * It provides functionality for loading, storing, and rotating cryptographic keys
 * used for signing and verifying credentials.
 *
 * This implementation uses a database for key storage and management.
 */

import logger from "../utils/logger";
import { KeysService, type Key } from "./keys.service";
import { KeyManagementService as KeyService } from "./key.service";

/**
 * Key types supported by the service
 */
export enum KeyType {
  SIGNING = "signing",
  VERIFICATION = "verification",
}

/**
 * Key algorithms supported by the service
 */
export enum KeyAlgorithm {
  RS256 = "RS256",
  ES256 = "ES256",
  EdDSA = "EdDSA",
}

/**
 * Key format for storage
 */
export interface KeyPair {
  id: string;
  type: KeyType;
  algorithm: KeyAlgorithm;
  publicKey: string;
  privateKey: string;
  createdAt: string;
  expiresAt?: string;
  isRevoked: boolean;
}

/**
 * Key Management Service
 */
export class KeyManagementService {
  private keysService: KeysService;
  private keyService: KeyService;
  private keysCache: Map<string, KeyPair> = new Map();

  /**
   * Constructor
   */
  constructor() {
    this.keysService = new KeysService();
    this.keyService = new KeyService();

    // Note: Keys will be loaded via the initialize method
  }

  /**
   * Initialize the service
   * This must be called before using any other methods
   */
  public async initialize(): Promise<void> {
    // Load existing keys
    await this.loadKeys();
  }

  /**
   * Load keys from the database
   */
  private async loadKeys(): Promise<void> {
    try {
      // Clear the cache
      this.keysCache.clear();

      // Load all active signing keys
      const signingKeys = await this.keysService.listKeysByType(
        KeyType.SIGNING,
      );

      // Add keys to cache
      for (const key of signingKeys) {
        this.keysCache.set(key.id, this.dbKeyToKeyPair(key));
      }

      // Check if we have a default signing key
      const defaultKeys = signingKeys.filter(
        (key) => key.name === "default-signing-key",
      );

      if (defaultKeys.length === 0) {
        logger.info("Default signing key not found, generating a new one");
        await this.generateKey(
          KeyType.SIGNING,
          KeyAlgorithm.RS256,
          "default-signing-key",
        );
      } else {
        logger.info("Loaded default signing key", { keyId: defaultKeys[0].id });
      }
    } catch (error) {
      logger.error("Failed to load keys", { error });
      throw new Error("Failed to load keys");
    }
  }

  /**
   * Convert a database key to a key pair
   * @param key Database key
   * @returns Key pair
   */
  private dbKeyToKeyPair(key: Key): KeyPair {
    return {
      id: key.id,
      type: key.type as KeyType,
      algorithm: key.algorithm as KeyAlgorithm,
      publicKey: key.publicKey,
      privateKey: key.privateKey || "",
      createdAt: key.createdAt.toISOString(),
      expiresAt: key.expiresAt?.toISOString(),
      isRevoked: !key.isActive || !!key.revokedAt,
    };
  }

  /**
   * Generate a new key pair
   * @param type Key type
   * @param algorithm Key algorithm
   * @param id Optional key ID
   * @returns Key pair
   */
  async generateKey(
    type: KeyType,
    algorithm: KeyAlgorithm,
    name?: string,
  ): Promise<KeyPair> {
    try {
      logger.info("Generating new key pair", { type, algorithm, name });

      // Generate key pair based on algorithm
      let publicKey: string;
      let privateKey: string;

      // Use the KeyService for all key generation to ensure compatibility with Bun
      // This handles the differences in crypto implementation between Node.js and Bun
      const generatedKeyPair = this.keyService.generateKeyPair();
      publicKey = generatedKeyPair.publicKey;
      privateKey = generatedKeyPair.privateKey;

      // Encrypt the private key if it's a signing key
      let encryptedPrivateKey = privateKey;
      if (type === KeyType.SIGNING) {
        encryptedPrivateKey = this.keyService.encryptPrivateKey(privateKey);
      }

      // Create the key in the database
      const key = await this.keysService.createKey({
        type,
        algorithm,
        publicKey,
        privateKey: encryptedPrivateKey,
        name,
        description: `${type} key using ${algorithm} algorithm`,
        version: "1.0.0",
      });

      // Convert to KeyPair format
      const keyPair = this.dbKeyToKeyPair(key);

      // Add to cache
      this.keysCache.set(key.id, keyPair);

      logger.info("Generated new key pair", { keyId: key.id, type, algorithm });

      return keyPair;
    } catch (error) {
      logger.error("Failed to generate key pair", { error, type, algorithm });
      throw new Error(
        `Failed to generate key pair: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get a key pair by ID
   * @param id Key ID
   * @returns Key pair
   */
  async getKey(id: string): Promise<KeyPair | undefined> {
    try {
      // Check cache first
      if (this.keysCache.has(id)) {
        return this.keysCache.get(id);
      }

      // If not in cache, get from database
      const key = await this.keysService.getKeyById(id);

      if (!key) {
        return undefined;
      }

      // Convert to KeyPair format
      const keyPair = this.dbKeyToKeyPair(key);

      // Add to cache
      this.keysCache.set(id, keyPair);

      return keyPair;
    } catch (error) {
      logger.error("Failed to get key", { error, keyId: id });
      throw new Error(
        `Failed to get key: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get the default signing key
   * @returns Default signing key
   */
  async getDefaultSigningKey(): Promise<KeyPair | undefined> {
    try {
      // Find the default signing key in the cache
      for (const [_, keyPair] of this.keysCache.entries()) {
        if (keyPair.type === KeyType.SIGNING && !keyPair.isRevoked) {
          // Check if this is the default key by name
          const key = await this.keysService.getKeyById(keyPair.id);
          if (key && key.name === "default-signing-key") {
            return keyPair;
          }
        }
      }

      // If not found in cache, query the database
      const keys = await this.keysService.listKeysByType(KeyType.SIGNING);
      const defaultKey = keys.find(
        (key) => key.name === "default-signing-key" && key.isActive,
      );

      if (!defaultKey) {
        // Generate a new default key if none exists
        logger.info("Default signing key not found, generating a new one");
        return await this.generateKey(
          KeyType.SIGNING,
          KeyAlgorithm.RS256,
          "default-signing-key",
        );
      }

      // Convert to KeyPair format
      const keyPair = this.dbKeyToKeyPair(defaultKey);

      // Add to cache
      this.keysCache.set(defaultKey.id, keyPair);

      return keyPair;
    } catch (error) {
      logger.error("Failed to get default signing key", { error });
      throw new Error(
        `Failed to get default signing key: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Rotate a key
   * @param id Key ID
   * @returns New key pair
   */
  async rotateKey(id: string): Promise<KeyPair> {
    try {
      logger.info("Rotating key", { keyId: id });

      // Get the existing key
      const key = await this.keysService.getKeyById(id);

      if (!key) {
        throw new Error(`Key not found: ${id}`);
      }

      // Use the KeysService to rotate the key
      const newKey = await this.keysService.rotateKey(id);

      // Convert to KeyPair format
      const newKeyPair = this.dbKeyToKeyPair(newKey);

      // Update cache
      this.keysCache.delete(id); // Remove old key from cache
      this.keysCache.set(newKey.id, newKeyPair); // Add new key to cache

      logger.info("Rotated key", { oldKeyId: id, newKeyId: newKey.id });

      return newKeyPair;
    } catch (error) {
      logger.error("Failed to rotate key", { error, keyId: id });
      throw new Error(
        `Failed to rotate key: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Import a key pair from PEM format
   * @param type Key type
   * @param algorithm Key algorithm
   * @param publicKeyPem Public key in PEM format
   * @param privateKeyPem Private key in PEM format
   * @param name Optional key name
   * @returns Key pair
   */
  async importKey(
    type: KeyType,
    algorithm: KeyAlgorithm,
    publicKeyPem: string,
    privateKeyPem: string,
    name?: string,
  ): Promise<KeyPair> {
    try {
      logger.info("Importing key pair", { type, algorithm, name });

      // Encrypt the private key if it's a signing key
      let encryptedPrivateKey = privateKeyPem;
      if (type === KeyType.SIGNING) {
        encryptedPrivateKey = this.keyService.encryptPrivateKey(privateKeyPem);
      }

      // Create the key in the database
      const key = await this.keysService.createKey({
        type,
        algorithm,
        publicKey: publicKeyPem,
        privateKey: encryptedPrivateKey,
        name: name || `imported-${type}-${algorithm}-${Date.now()}`,
        description: `Imported ${type} key using ${algorithm} algorithm`,
        version: "1.0.0",
      });

      // Convert to KeyPair format
      const keyPair = this.dbKeyToKeyPair(key);

      // Add to cache
      this.keysCache.set(key.id, keyPair);

      logger.info("Imported key pair", { keyId: key.id, type, algorithm });

      return keyPair;
    } catch (error) {
      logger.error("Failed to import key pair", { error, type, algorithm });
      throw new Error(
        `Failed to import key pair: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Export a key pair in PEM format
   * @param id Key ID
   * @returns Key pair in PEM format
   */
  async exportKey(
    id: string,
  ): Promise<{ publicKey: string; privateKey: string } | undefined> {
    try {
      // Get the key from database
      const key = await this.keysService.getKeyById(id);

      if (!key) {
        return undefined;
      }

      // Decrypt the private key if it's a signing key
      let privateKey = key.privateKey || "";
      if (key.type === KeyType.SIGNING && privateKey) {
        privateKey = this.keyService.decryptPrivateKey(privateKey);
      }

      return {
        publicKey: key.publicKey,
        privateKey,
      };
    } catch (error) {
      logger.error("Failed to export key pair", { error, keyId: id });
      throw new Error(
        `Failed to export key pair: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * List all keys
   * @returns List of keys
   */
  async listKeys(): Promise<KeyPair[]> {
    try {
      // Get all keys from database
      const keys = await this.keysService.listKeysByType(KeyType.SIGNING, true);
      const verificationKeys = await this.keysService.listKeysByType(
        KeyType.VERIFICATION,
        true,
      );

      // Combine all keys
      const allKeys = [...keys, ...verificationKeys];

      // Convert to KeyPair format
      const keyPairs = allKeys.map((key) => this.dbKeyToKeyPair(key));

      // Update cache
      this.keysCache.clear();
      for (const keyPair of keyPairs) {
        this.keysCache.set(keyPair.id, keyPair);
      }

      return keyPairs;
    } catch (error) {
      logger.error("Failed to list keys", { error });
      throw new Error(
        `Failed to list keys: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delete a key
   * @param id Key ID
   * @returns True if the key was deleted
   */
  async deleteKey(id: string): Promise<boolean> {
    try {
      // Get the key from database
      const key = await this.keysService.getKeyById(id);

      if (!key) {
        return false;
      }

      // Revoke the key
      await this.keysService.revokeKey(id, "Key deleted");

      // Remove from cache
      this.keysCache.delete(id);

      logger.info("Deleted key", { keyId: id });

      return true;
    } catch (error) {
      logger.error("Failed to delete key", { error, keyId: id });
      throw new Error(
        `Failed to delete key: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

// Create singleton instance
const keyManagementService = new KeyManagementService();

// Initialize the service
// This is an immediately invoked async function to initialize the service
// It will run when the module is first imported
(async () => {
  try {
    logger.info("Initializing KeyManagementService...");
    await keyManagementService.initialize();
    logger.info("KeyManagementService initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize KeyManagementService", { error });
  }
})();

// Export the singleton instance
export { keyManagementService };
