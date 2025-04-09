/**
 * Credential Verification Controller
 *
 * This controller handles API requests for credential verification,
 * including verification by ID, JWT, and Linked Data Signatures.
 */

import { Context } from "hono";
import { z } from "zod";
import {
  CredentialVerificationService,
  credentialVerificationService,
} from "@/services/credential-verification.service";
import { BadRequestError } from "@/utils/errors";
import logger from "@/utils/logger";
import { type Logger as PinoLogger } from "pino";

/**
 * Credential Verification Controller
 */
export class CredentialVerificationController {
  private verificationService: CredentialVerificationService;
  private logger: PinoLogger;

  constructor() {
    this.verificationService = credentialVerificationService;
    this.logger = logger.child({ context: "CredentialVerificationController" });
  }

  /**
   * Verify a credential by ID
   *
   * @param c Hono context
   * @returns Verification result
   */
  async verifyCredential(c: Context): Promise<Response> {
    const credentialId = c.req.param("credentialId");
    const format = c.req.query("format") || "default";

    try {
      // Get the verification result
      const result =
        await this.verificationService.verifyCredential(credentialId);

      // For detailed format, return the full verification result
      if (format === "detailed") {
        return c.json({
          status: "success",
          data: result,
        });
      }

      // Default format for simplicity
      return c.json({
        status: "success",
        data: {
          valid: result.valid,
          checks: result.checks,
          errors: result.errors?.length > 0 ? result.errors : undefined,
          warnings:
            result.warnings && result.warnings.length > 0
              ? result.warnings
              : undefined,
        },
      });
    } catch (error) {
      this.logger.error(error, "Credential verification error:");
      return c.json(
        {
          status: "error",
          error: {
            code: "VERIFICATION_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Unknown error during verification",
          },
        },
        500,
      );
    }
  }

  /**
   * Verify a credential by JWT
   *
   * @param c Hono context
   * @returns Verification result
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
      const result = await this.verificationService.verifyCredentialJwt(jwt);

      return c.json({
        status: "success",
        data: result,
      });
    } catch (error) {
      this.logger.error(error, "JWT verification error:");

      if (error instanceof z.ZodError) {
        throw new BadRequestError(`Invalid request body: ${error.message}`);
      }

      // Return 401 for JWT verification errors
      return c.json(
        {
          status: "error",
          error: {
            code: "JWT_VERIFICATION_ERROR",
            message:
              error instanceof Error ? error.message : "Invalid or expired JWT",
          },
        },
        401,
      );
    }
  }

  /**
   * Verify a credential with Linked Data Signatures
   *
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
      const result =
        await this.verificationService.verifyCredentialLd(credential);

      return c.json({
        status: "success",
        data: result,
      });
    } catch (error) {
      this.logger.error(error, "Linked Data Signature verification error:");

      if (error instanceof z.ZodError) {
        throw new BadRequestError(`Invalid request body: ${error.message}`);
      }

      return c.json(
        {
          status: "error",
          error: {
            code: "VERIFICATION_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Unknown error during Linked Data Signature verification",
          },
        },
        500,
      );
    }
  }

  /**
   * Check if a credential is revoked
   *
   * @param c Hono context
   * @returns Revocation status
   */
  async checkCredentialStatus(c: Context): Promise<Response> {
    const credentialId = c.req.param("credentialId");

    try {
      // Check if the credential is revoked
      const isRevoked =
        await this.verificationService.isCredentialRevoked(credentialId);

      return c.json({
        status: "success",
        data: {
          credentialId,
          isRevoked,
          statusMessage: isRevoked
            ? "Credential has been revoked"
            : "Credential is active",
        },
      });
    } catch (error) {
      this.logger.error(error, "Credential status check error:");
      return c.json(
        {
          status: "error",
          error: {
            code: "STATUS_CHECK_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Unknown error during status check",
          },
        },
        500,
      );
    }
  }

  /**
   * Revoke a credential
   *
   * @param c Hono context
   * @returns Revocation result
   */
  async revokeCredential(c: Context): Promise<Response> {
    try {
      // Validate request body
      const schema = z.object({
        credentialId: z.string(),
        reason: z.string().optional(),
      });

      const body = await c.req.json();
      const { credentialId, reason } = schema.parse(body);

      // Revoke the credential
      const success = await this.verificationService.revokeCredential(
        credentialId,
        reason,
      );

      if (success) {
        return c.json({
          status: "success",
          data: {
            credentialId,
            revoked: true,
            message: "Credential revoked successfully",
          },
        });
      } else {
        return c.json(
          {
            status: "error",
            error: {
              code: "REVOCATION_ERROR",
              message: "Failed to revoke credential",
            },
          },
          400,
        );
      }
    } catch (error) {
      this.logger.error(error, "Credential revocation error:");

      if (error instanceof z.ZodError) {
        throw new BadRequestError(`Invalid request body: ${error.message}`);
      }

      return c.json(
        {
          status: "error",
          error: {
            code: "REVOCATION_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Unknown error during revocation",
          },
        },
        500,
      );
    }
  }
}

// Export a singleton instance
export const credentialVerificationController =
  new CredentialVerificationController();
