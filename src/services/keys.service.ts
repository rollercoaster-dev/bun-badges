/**
 * Keys Service
 *
 * This service provides methods for managing cryptographic keys used in the application.
 * It handles key creation, retrieval, rotation, and revocation.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/db/config";
import { keys } from "@/db/schema/keys.schema";
import logger from "@/utils/logger";
import { type Logger as PinoLogger } from "pino";

/**
 * Type definitions for the keys service
 */
export type Key = typeof keys.$inferSelect;
export type NewKey = Omit<
  typeof keys.$inferInsert,
  "id" | "createdAt" | "isActive"
>;
export type KeyUpdate = Partial<
  Omit<typeof keys.$inferInsert, "id" | "createdAt">
>;

/**
 * Key status enum
 */
export enum KeyStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  REVOKED = "revoked",
}

/**
 * Keys Service
 */
export class KeysService {
  private logger: PinoLogger;

  constructor() {
    this.logger = logger.child({ context: "KeysService" });
  }

  /**
   * Create a new key
   * @param data Key data
   * @returns Created key
   */
  async createKey(data: NewKey): Promise<Key> {
    try {
      this.logger.info({ type: data.type }, "Creating new key");

      const [key] = await db
        .insert(keys)
        .values({
          ...data,
          isActive: true,
        })
        .returning();

      this.logger.info({ keyId: key.id }, "Key created successfully");
      return key;
    } catch (error) {
      this.logger.error({ error, data }, "Failed to create key");
      throw new Error(
        `Failed to create key: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get a key by ID
   * @param id Key ID
   * @returns Key or null if not found
   */
  async getKeyById(id: string): Promise<Key | null> {
    try {
      const result = await db.select().from(keys).where(eq(keys.id, id));

      return result[0] || null;
    } catch (error) {
      this.logger.error({ error, id }, "Failed to get key by ID");
      throw new Error(
        `Failed to get key by ID: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * List keys by type
   * @param type Key type
   * @param includeInactive Whether to include inactive keys
   * @returns Array of keys
   */
  async listKeysByType(
    type: string,
    includeInactive: boolean = false,
  ): Promise<Key[]> {
    try {
      if (includeInactive) {
        return await db.select().from(keys).where(eq(keys.type, type));
      } else {
        return await db
          .select()
          .from(keys)
          .where(and(eq(keys.type, type), eq(keys.isActive, true)));
      }
    } catch (error) {
      this.logger.error({ error, type }, "Failed to list keys by type");
      throw new Error(
        `Failed to list keys by type: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Update a key
   * @param id Key ID
   * @param data Key data to update
   * @returns Updated key
   */
  async updateKey(id: string, data: KeyUpdate): Promise<Key> {
    try {
      this.logger.info({ keyId: id }, "Updating key");

      const [key] = await db
        .update(keys)
        .set(data)
        .where(eq(keys.id, id))
        .returning();

      if (!key) {
        throw new Error(`Key with ID ${id} not found`);
      }

      this.logger.info({ keyId: id }, "Key updated successfully");
      return key;
    } catch (error) {
      this.logger.error({ error, id, data }, "Failed to update key");
      throw new Error(
        `Failed to update key: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Revoke a key
   * @param id Key ID
   * @param reason Revocation reason
   * @returns Void
   */
  async revokeKey(id: string, reason?: string): Promise<void> {
    try {
      this.logger.info({ keyId: id, reason }, "Revoking key");

      const [key] = await db
        .update(keys)
        .set({
          isActive: false,
          revokedAt: new Date(),
          revocationReason: reason,
        })
        .where(eq(keys.id, id))
        .returning();

      if (!key) {
        throw new Error(`Key with ID ${id} not found`);
      }

      this.logger.info({ keyId: id }, "Key revoked successfully");
    } catch (error) {
      this.logger.error({ error, id }, "Failed to revoke key");
      throw new Error(
        `Failed to revoke key: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Rotate a key (create new version, mark old as previous)
   * @param id Key ID to rotate
   * @returns New key
   */
  async rotateKey(id: string): Promise<Key> {
    try {
      this.logger.info({ keyId: id }, "Rotating key");

      // Get the old key
      const oldKey = await this.getKeyById(id);
      if (!oldKey) {
        throw new Error(`Key with ID ${id} not found`);
      }

      // Create a new key with the same properties
      const newKey = await this.createKey({
        type: oldKey.type,
        algorithm: oldKey.algorithm,
        publicKey: oldKey.publicKey,
        privateKey: oldKey.privateKey,
        name: oldKey.name,
        description: oldKey.description,
        version: this.generateNewVersion(oldKey.version),
        previousKeyId: oldKey.id,
      });

      // Update the old key to be inactive
      await this.updateKey(oldKey.id, {
        isActive: false,
      });

      this.logger.info(
        { oldKeyId: oldKey.id, newKeyId: newKey.id },
        "Key rotated successfully",
      );
      return newKey;
    } catch (error) {
      this.logger.error({ error, id }, "Failed to rotate key");
      throw new Error(
        `Failed to rotate key: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Check if a key is active
   * @param id Key ID
   * @returns Boolean indicating if the key is active
   */
  async isKeyActive(id: string): Promise<boolean> {
    try {
      const key = await this.getKeyById(id);
      if (!key) {
        return false;
      }

      // Check if the key is active
      if (!key.isActive) {
        return false;
      }

      // Check if the key is expired
      if (key.expiresAt && key.expiresAt < new Date()) {
        return false;
      }

      // Check if the key is revoked
      if (key.revokedAt) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error({ error, id }, "Failed to check if key is active");
      throw new Error(
        `Failed to check if key is active: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get key status
   * @param id Key ID
   * @returns Key status
   */
  async getKeyStatus(id: string): Promise<KeyStatus> {
    try {
      const key = await this.getKeyById(id);
      if (!key) {
        throw new Error(`Key with ID ${id} not found`);
      }

      // Check if the key is revoked
      if (key.revokedAt) {
        return KeyStatus.REVOKED;
      }

      // Check if the key is expired
      if (key.expiresAt && key.expiresAt < new Date()) {
        return KeyStatus.EXPIRED;
      }

      // Check if the key is active
      if (!key.isActive) {
        return KeyStatus.REVOKED;
      }

      return KeyStatus.ACTIVE;
    } catch (error) {
      this.logger.error({ error, id }, "Failed to get key status");
      throw new Error(
        `Failed to get key status: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Generate a new version string based on the old version
   * @param currentVersion Current version string
   * @returns New version string
   */
  private generateNewVersion(currentVersion?: string | null): string {
    if (!currentVersion) {
      return "1.0.0";
    }

    // Parse the version string
    const versionParts = currentVersion.split(".");
    if (versionParts.length !== 3) {
      return "1.0.0";
    }

    // Increment the patch version
    const major = parseInt(versionParts[0], 10);
    const minor = parseInt(versionParts[1], 10);
    const patch = parseInt(versionParts[2], 10) + 1;

    return `${major}.${minor}.${patch}`;
  }
}
