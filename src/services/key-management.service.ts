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
import {
  executeWithErrorHandling,
  unwrapResult,
} from "../utils/error-handling";

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
    const result = await executeWithErrorHandling(async () => {
      await this.loadKeys();
    }, "Failed to initialize key management service");

    if (!result.success) {
      throw result.error;
    }
  }

  /**
   * Load keys from the database
   */
  private async loadKeys(): Promise<void> {
    // Clear the cache
    this.clearCache();

    // Load all active signing keys
    const signingKeys = await this.keysService.listKeysByType(KeyType.SIGNING);

    // Add keys to cache
    for (const key of signingKeys) {
      this.updateCache(key);
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
  }

  /**
   * Clear the key cache
   */
  private clearCache(): void {
    this.keysCache.clear();
  }

  /**
   * Update the key cache with a key
   * @param key The key to update in the cache
   */
  private updateCache(key: Key): void {
    const keyPair = this.dbKeyToKeyPair(key);
    this.keysCache.set(key.id, keyPair);
  }

  /**
   * Get a key from the cache or fall back to the database
   * @param id Key ID
   * @returns Key pair or undefined if not found
   */
  private async getCachedKey(id: string): Promise<KeyPair | undefined> {
    // Check cache first
    if (this.keysCache.has(id)) {
      return this.keysCache.get(id);
    }

    // If not in cache, get from database
    const key = await this.keysService.getKeyById(id);

    if (!key) {
      return undefined;
    }

    // Update cache
    this.updateCache(key);

    return this.keysCache.get(id);
  }

  /**
   * Handle private key encryption/decryption based on key type
   * @param privateKey The private key to handle
   * @param type The key type
   * @param encrypt Whether to encrypt or decrypt the key
   * @returns The handled private key
   */
  private handlePrivateKey(
    privateKey: string,
    type: KeyType,
    encrypt: boolean,
  ): string {
    if (!privateKey) {
      return "";
    }

    if (type !== KeyType.SIGNING) {
      return privateKey;
    }

    return encrypt
      ? this.keyService.encryptPrivateKey(privateKey)
      : this.keyService.decryptPrivateKey(privateKey);
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
   * @param name Optional key name
   * @returns Key pair
   */
  async generateKey(
    type: KeyType,
    algorithm: KeyAlgorithm,
    name?: string,
  ): Promise<KeyPair> {
    const result = await executeWithErrorHandling(
      async () => {
        logger.info("Generating new key pair", { type, algorithm, name });

        // Generate key pair based on algorithm
        // Use the KeyService for all key generation to ensure compatibility with Bun
        // This handles the differences in crypto implementation between Node.js and Bun
        const generatedKeyPair = this.keyService.generateKeyPair();
        const publicKey = generatedKeyPair.publicKey;
        const privateKey = generatedKeyPair.privateKey;

        // Encrypt the private key if needed
        const encryptedPrivateKey = this.handlePrivateKey(
          privateKey,
          type,
          true,
        );

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

        // Update cache
        this.updateCache(key);

        logger.info("Generated new key pair", {
          keyId: key.id,
          type,
          algorithm,
        });

        return this.keysCache.get(key.id)!;
      },
      "Failed to generate key pair",
      { type, algorithm, name },
    );

    return unwrapResult(result);
  }

  /**
   * Get a key pair by ID
   * @param id Key ID
   * @returns Key pair
   */
  async getKey(id: string): Promise<KeyPair | undefined> {
    const result = await executeWithErrorHandling(
      async () => {
        return this.getCachedKey(id);
      },
      "Failed to get key",
      { keyId: id },
    );

    return result.success ? result.data : undefined;
  }

  /**
   * Get the default signing key
   * @returns Default signing key
   */
  async getDefaultSigningKey(): Promise<KeyPair | undefined> {
    const result = await executeWithErrorHandling(async () => {
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

      // Update cache
      this.updateCache(defaultKey);

      return this.keysCache.get(defaultKey.id);
    }, "Failed to get default signing key");

    return result.success ? result.data : undefined;
  }

  /**
   * Rotate a key
   * @param id Key ID
   * @returns New key pair
   */
  async rotateKey(id: string): Promise<KeyPair> {
    const result = await executeWithErrorHandling(
      async () => {
        logger.info("Rotating key", { keyId: id });

        // Get the existing key
        const key = await this.keysService.getKeyById(id);

        if (!key) {
          throw new Error(`Key not found: ${id}`);
        }

        // Use the KeysService to rotate the key
        const newKey = await this.keysService.rotateKey(id);

        // Update cache
        this.keysCache.delete(id); // Remove old key from cache
        this.updateCache(newKey); // Add new key to cache

        logger.info("Rotated key", { oldKeyId: id, newKeyId: newKey.id });

        return this.keysCache.get(newKey.id)!;
      },
      "Failed to rotate key",
      { keyId: id },
    );

    return unwrapResult(result);
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
    const result = await executeWithErrorHandling(
      async () => {
        logger.info("Importing key pair", { type, algorithm, name });

        // Encrypt the private key if needed
        const encryptedPrivateKey = this.handlePrivateKey(
          privateKeyPem,
          type,
          true,
        );

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

        // Update cache
        this.updateCache(key);

        logger.info("Imported key pair", { keyId: key.id, type, algorithm });

        return this.keysCache.get(key.id)!;
      },
      "Failed to import key pair",
      { type, algorithm, name },
    );

    return unwrapResult(result);
  }

  /**
   * Export a key pair in PEM format
   * @param id Key ID
   * @returns Key pair in PEM format
   */
  async exportKey(
    id: string,
  ): Promise<{ publicKey: string; privateKey: string } | undefined> {
    const result = await executeWithErrorHandling(
      async () => {
        // Get the key from database
        const key = await this.keysService.getKeyById(id);

        if (!key) {
          return undefined;
        }

        // Decrypt the private key if needed
        const privateKey = this.handlePrivateKey(
          key.privateKey || "",
          key.type as KeyType,
          false,
        );

        return {
          publicKey: key.publicKey,
          privateKey,
        };
      },
      "Failed to export key pair",
      { keyId: id },
    );

    return result.success ? result.data : undefined;
  }

  /**
   * List all keys
   * @returns List of keys
   */
  async listKeys(): Promise<KeyPair[]> {
    const result = await executeWithErrorHandling(async () => {
      // Get all keys from database
      const keys = await this.keysService.listKeysByType(KeyType.SIGNING, true);
      const verificationKeys = await this.keysService.listKeysByType(
        KeyType.VERIFICATION,
        true,
      );

      // Combine all keys
      const allKeys = [...keys, ...verificationKeys];

      // Clear cache and update with all keys
      this.clearCache();
      for (const key of allKeys) {
        this.updateCache(key);
      }

      // Return all key pairs from cache
      return Array.from(this.keysCache.values());
    }, "Failed to list keys");

    return unwrapResult(result);
  }

  /**
   * Delete a key
   * @param id Key ID
   * @returns True if the key was deleted
   */
  async deleteKey(id: string): Promise<boolean> {
    const result = await executeWithErrorHandling(
      async () => {
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
      },
      "Failed to delete key",
      { keyId: id },
    );

    return result.success ? result.data : false;
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
