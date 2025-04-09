/**
 * Key Management Service
 *
 * This service handles secure key management for Open Badges 3.0 implementation.
 * It provides functionality for loading, storing, and rotating cryptographic keys
 * used for signing and verifying credentials.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { generateKeyPair, exportJWK } from "jose";
import { env } from "../utils/env";
import logger from "../utils/logger";

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
  private keysDir: string;
  private keysCache: Map<string, KeyPair> = new Map();

  /**
   * Constructor
   * @param keysDir Directory to store keys
   */
  constructor(keysDir?: string) {
    this.keysDir = keysDir || env.KEYS_DIR || join(process.cwd(), "keys");

    // Ensure keys directory exists
    if (!existsSync(this.keysDir)) {
      try {
        mkdirSync(this.keysDir, { recursive: true });
      } catch (error) {
        logger.error("Failed to create keys directory", { error });
        throw new Error("Failed to create keys directory");
      }
    }

    // Load existing keys
    this.loadKeys();
  }

  /**
   * Load keys from the keys directory
   */
  private loadKeys(): void {
    try {
      // In a real implementation, we would load keys from a secure storage
      // For now, we'll just check if we have a default key and create one if not
      const defaultKeyPath = join(this.keysDir, "default-signing-key.json");

      if (!existsSync(defaultKeyPath)) {
        logger.info("Default signing key not found, generating a new one");
        this.generateKey(
          KeyType.SIGNING,
          KeyAlgorithm.RS256,
          "default-signing-key",
        );
      } else {
        // Load the default key
        const keyData = readFileSync(defaultKeyPath, "utf8");
        const keyPair = JSON.parse(keyData) as KeyPair;
        this.keysCache.set(keyPair.id, keyPair);
        logger.info("Loaded default signing key", { keyId: keyPair.id });
      }
    } catch (error) {
      logger.error("Failed to load keys", { error });
      throw new Error("Failed to load keys");
    }
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
    id?: string,
  ): Promise<KeyPair> {
    try {
      // Generate a unique ID if not provided
      const keyId = id || `${type}-${algorithm}-${Date.now()}`;

      // Generate key pair based on algorithm
      let keyPair;

      switch (algorithm) {
        case KeyAlgorithm.RS256:
          keyPair = await generateKeyPair("RS256");
          break;
        case KeyAlgorithm.ES256:
          keyPair = await generateKeyPair("ES256");
          break;
        case KeyAlgorithm.EdDSA:
          keyPair = await generateKeyPair("EdDSA");
          break;
        default:
          throw new Error(`Unsupported algorithm: ${algorithm}`);
      }

      // Export keys to JWK format
      const publicJwk = await exportJWK(keyPair.publicKey);
      const privateJwk = await exportJWK(keyPair.privateKey);

      // Create key pair object
      const newKeyPair: KeyPair = {
        id: keyId,
        type,
        algorithm,
        publicKey: JSON.stringify(publicJwk),
        privateKey: JSON.stringify(privateJwk),
        createdAt: new Date().toISOString(),
        isRevoked: false,
      };

      // Save key pair to file
      const keyPath = join(this.keysDir, `${keyId}.json`);
      writeFileSync(keyPath, JSON.stringify(newKeyPair, null, 2));

      // Add to cache
      this.keysCache.set(keyId, newKeyPair);

      logger.info("Generated new key pair", { keyId, type, algorithm });

      return newKeyPair;
    } catch (error) {
      logger.error("Failed to generate key pair", { error, type, algorithm });
      throw new Error("Failed to generate key pair");
    }
  }

  /**
   * Get a key pair by ID
   * @param id Key ID
   * @returns Key pair
   */
  getKey(id: string): KeyPair | undefined {
    return this.keysCache.get(id);
  }

  /**
   * Get the default signing key
   * @returns Default signing key
   */
  getDefaultSigningKey(): KeyPair | undefined {
    // Find the default signing key in the cache
    for (const [_, keyPair] of this.keysCache.entries()) {
      if (
        keyPair.type === KeyType.SIGNING &&
        keyPair.id === "default-signing-key" &&
        !keyPair.isRevoked
      ) {
        return keyPair;
      }
    }

    return undefined;
  }

  /**
   * Rotate a key
   * @param id Key ID
   * @returns New key pair
   */
  async rotateKey(id: string): Promise<KeyPair> {
    try {
      // Get the existing key
      const existingKey = this.keysCache.get(id);

      if (!existingKey) {
        throw new Error(`Key not found: ${id}`);
      }

      // Mark the existing key as revoked
      existingKey.isRevoked = true;

      // Save the updated key
      const keyPath = join(this.keysDir, `${id}.json`);
      writeFileSync(keyPath, JSON.stringify(existingKey, null, 2));

      // Generate a new key with the same type and algorithm
      const newKey = await this.generateKey(
        existingKey.type,
        existingKey.algorithm,
        `${id}-rotated-${Date.now()}`,
      );

      logger.info("Rotated key", { oldKeyId: id, newKeyId: newKey.id });

      return newKey;
    } catch (error) {
      logger.error("Failed to rotate key", { error, keyId: id });
      throw new Error("Failed to rotate key");
    }
  }

  /**
   * Import a key pair from JWK format
   * @param type Key type
   * @param algorithm Key algorithm
   * @param publicJwk Public key in JWK format
   * @param privateJwk Private key in JWK format
   * @param id Optional key ID
   * @returns Key pair
   */
  async importKey(
    type: KeyType,
    algorithm: KeyAlgorithm,
    publicJwk: object,
    privateJwk: object,
    id?: string,
  ): Promise<KeyPair> {
    try {
      // Generate a unique ID if not provided
      const keyId = id || `${type}-${algorithm}-imported-${Date.now()}`;

      // Create key pair object
      const keyPair: KeyPair = {
        id: keyId,
        type,
        algorithm,
        publicKey: JSON.stringify(publicJwk),
        privateKey: JSON.stringify(privateJwk),
        createdAt: new Date().toISOString(),
        isRevoked: false,
      };

      // Save key pair to file
      const keyPath = join(this.keysDir, `${keyId}.json`);
      writeFileSync(keyPath, JSON.stringify(keyPair, null, 2));

      // Add to cache
      this.keysCache.set(keyId, keyPair);

      logger.info("Imported key pair", { keyId, type, algorithm });

      return keyPair;
    } catch (error) {
      logger.error("Failed to import key pair", { error, type, algorithm });
      throw new Error("Failed to import key pair");
    }
  }

  /**
   * Export a key pair to JWK format
   * @param id Key ID
   * @returns Key pair in JWK format
   */
  exportKey(id: string): { publicKey: object; privateKey: object } | undefined {
    try {
      const keyPair = this.keysCache.get(id);

      if (!keyPair) {
        return undefined;
      }

      return {
        publicKey: JSON.parse(keyPair.publicKey),
        privateKey: JSON.parse(keyPair.privateKey),
      };
    } catch (error) {
      logger.error("Failed to export key pair", { error, keyId: id });
      throw new Error("Failed to export key pair");
    }
  }

  /**
   * List all keys
   * @returns List of keys
   */
  listKeys(): KeyPair[] {
    return Array.from(this.keysCache.values());
  }

  /**
   * Delete a key
   * @param id Key ID
   * @returns True if the key was deleted
   */
  deleteKey(id: string): boolean {
    try {
      // Get the existing key
      const existingKey = this.keysCache.get(id);

      if (!existingKey) {
        return false;
      }

      // Remove from cache
      this.keysCache.delete(id);

      // Delete the key file
      const keyPath = join(this.keysDir, `${id}.json`);
      if (existsSync(keyPath)) {
        writeFileSync(
          keyPath,
          JSON.stringify(
            {
              ...existingKey,
              isRevoked: true,
              deletedAt: new Date().toISOString(),
            },
            null,
            2,
          ),
        );
      }

      logger.info("Deleted key", { keyId: id });

      return true;
    } catch (error) {
      logger.error("Failed to delete key", { error, keyId: id });
      throw new Error("Failed to delete key");
    }
  }
}

// Export singleton instance
export const keyManagementService = new KeyManagementService();
