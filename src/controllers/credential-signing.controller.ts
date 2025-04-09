/**
 * Credential Signing Controller
 *
 * This controller handles HTTP requests for credential signing and verification.
 */

import { Context } from "hono";
import { credentialSigningService } from "../services/credential-signing.service";
import { z } from "zod";
import logger from "../utils/logger";
import { BadRequestError } from "../utils/errors";

/**
 * Credential Signing Controller
 */
export class CredentialSigningController {
  /**
   * Sign a credential using JWT
   * @param c Hono context
   * @returns Signed JWT
   */
  async signCredentialJwt(c: Context): Promise<Response> {
    try {
      // Validate request body
      const schema = z.object({
        payload: z.record(z.unknown()),
        keyId: z.string().optional(),
      });

      const body = await c.req.json();
      const { payload, keyId } = schema.parse(body);

      // Sign the credential
      const jwt = await credentialSigningService.signCredentialJwt(
        payload,
        keyId,
      );

      return c.json({ jwt });
    } catch (error) {
      logger.error("Failed to sign credential JWT", { error });

      if (error instanceof z.ZodError) {
        throw new BadRequestError(`Invalid request body: ${error.message}`);
      }

      throw new BadRequestError("Failed to sign credential JWT");
    }
  }

  /**
   * Verify a credential JWT
   * @param c Hono context
   * @returns Verified payload
   */
  async verifyCredentialJwt(c: Context): Promise<Response> {
    try {
      // Validate request body
      const schema = z.object({
        jwt: z.string(),
      });

      const body = await c.req.json();
      const { jwt } = schema.parse(body);

      // Verify the credential
      const payload = await credentialSigningService.verifyCredentialJwt(jwt);

      return c.json({ payload, isValid: true });
    } catch (error) {
      logger.error("Failed to verify credential JWT", { error });

      if (error instanceof z.ZodError) {
        throw new BadRequestError(`Invalid request body: ${error.message}`);
      }

      return c.json(
        {
          isValid: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        400,
      );
    }
  }

  /**
   * Sign a credential using Linked Data Signatures
   * @param c Hono context
   * @returns Signed credential
   */
  async signCredentialLd(c: Context): Promise<Response> {
    try {
      // Validate request body
      const schema = z.object({
        credential: z.record(z.unknown()),
        keyId: z.string().optional(),
      });

      const body = await c.req.json();
      const { credential, keyId } = schema.parse(body);

      // Sign the credential
      const signedCredential = await credentialSigningService.signCredentialLd(
        credential,
        keyId,
      );

      return c.json({ credential: signedCredential });
    } catch (error) {
      logger.error("Failed to sign credential with Linked Data Signature", {
        error,
      });

      if (error instanceof z.ZodError) {
        throw new BadRequestError(`Invalid request body: ${error.message}`);
      }

      throw new BadRequestError(
        "Failed to sign credential with Linked Data Signature",
      );
    }
  }

  /**
   * Verify a credential with Linked Data Signatures
   * @param c Hono context
   * @returns Verification result
   */
  async verifyCredentialLd(c: Context): Promise<Response> {
    try {
      // Validate request body
      const schema = z.object({
        credential: z.record(z.unknown()),
      });

      const body = await c.req.json();
      const { credential } = schema.parse(body);

      // Verify the credential
      const isValid =
        await credentialSigningService.verifyCredentialLd(credential);

      return c.json({ isValid });
    } catch (error) {
      logger.error("Failed to verify credential with Linked Data Signature", {
        error,
      });

      if (error instanceof z.ZodError) {
        throw new BadRequestError(`Invalid request body: ${error.message}`);
      }

      return c.json(
        {
          isValid: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        400,
      );
    }
  }
}

// Export singleton instance
export const credentialSigningController = new CredentialSigningController();
