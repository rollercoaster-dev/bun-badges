/**
 * Key Management Controller
 *
 * This controller handles HTTP requests for key management operations.
 */

import { Context } from "hono";
import {
  keyManagementService,
  KeyType,
  KeyAlgorithm,
} from "../services/key-management.service";
import { z } from "zod";
import logger from "../utils/logger";
import { BadRequestError, NotFoundError } from "../utils/errors";

/**
 * Key Management Controller
 */
export class KeyManagementController {
  /**
   * Get all keys
   * @param c Hono context
   * @returns List of keys
   */
  async getKeys(c: Context): Promise<Response> {
    try {
      const keys = await keyManagementService.listKeys();

      // Map to a safe response format (don't expose private keys)
      const safeKeys = keys.map((key) => ({
        id: key.id,
        type: key.type,
        algorithm: key.algorithm,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt,
        isRevoked: key.isRevoked,
      }));

      return c.json({ keys: safeKeys });
    } catch (error) {
      logger.error("Failed to get keys", { error });
      throw new BadRequestError("Failed to get keys");
    }
  }

  /**
   * Get a key by ID
   * @param c Hono context
   * @returns Key
   */
  async getKey(c: Context): Promise<Response> {
    try {
      const id = c.req.param("id");
      const key = await keyManagementService.getKey(id);

      if (!key) {
        throw new NotFoundError(`Key not found: ${id}`);
      }

      // Return a safe version of the key (don't expose private key)
      return c.json({
        id: key.id,
        type: key.type,
        algorithm: key.algorithm,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt,
        isRevoked: key.isRevoked,
      });
    } catch (error) {
      logger.error("Failed to get key", { error });

      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new BadRequestError("Failed to get key");
    }
  }

  /**
   * Create a new key
   *
   * @param c Hono context
   * @returns Created key
   */
  async createKey(c: Context): Promise<Response> {
    try {
      // Validate request body
      const schema = z.object({
        type: z.enum([KeyType.SIGNING, KeyType.VERIFICATION]),
        algorithm: z.enum([
          KeyAlgorithm.RS256,
          KeyAlgorithm.ES256,
          KeyAlgorithm.EdDSA,
        ]),
        name: z.string().optional(),
      });

      const body = await c.req.json();
      const { type, algorithm, name } = schema.parse(body);

      // Generate key
      const key = await keyManagementService.generateKey(type, algorithm, name);

      // Return a safe version of the key (don't expose private key)
      return c.json(
        {
          id: key.id,
          type: key.type,
          algorithm: key.algorithm,
          createdAt: key.createdAt,
          expiresAt: key.expiresAt,
          isRevoked: key.isRevoked,
        },
        201,
      );
    } catch (error) {
      logger.error("Failed to create key", { error });

      if (error instanceof z.ZodError) {
        throw new BadRequestError(`Invalid request body: ${error.message}`);
      }

      throw new BadRequestError("Failed to create key");
    }
  }

  /**
   * Rotate a key
   * @param c Hono context
   * @returns Rotated key
   */
  async rotateKey(c: Context): Promise<Response> {
    try {
      const id = c.req.param("id");
      const key = await keyManagementService.rotateKey(id);

      // Return a safe version of the key (don't expose private key)
      return c.json({
        id: key.id,
        type: key.type,
        algorithm: key.algorithm,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt,
        isRevoked: key.isRevoked,
      });
    } catch (error) {
      logger.error("Failed to rotate key", { error });

      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new BadRequestError("Failed to rotate key");
    }
  }

  /**
   * Delete a key
   * @param c Hono context
   * @returns Success message
   */
  async deleteKey(c: Context): Promise<Response> {
    try {
      const id = c.req.param("id");
      const success = await keyManagementService.deleteKey(id);

      if (!success) {
        throw new NotFoundError(`Key not found: ${id}`);
      }

      return c.json({ message: "Key deleted successfully" });
    } catch (error) {
      logger.error("Failed to delete key", { error });

      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new BadRequestError("Failed to delete key");
    }
  }
}

// Export singleton instance
export const keyManagementController = new KeyManagementController();
