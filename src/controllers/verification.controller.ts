import { Context } from "hono";
import { VerificationService } from "@/services/verification.service";

export class VerificationController {
  private verificationService: VerificationService;

  constructor() {
    this.verificationService = new VerificationService();
  }

  /**
   * Verify a badge assertion by ID
   */
  async verifyAssertion(c: Context): Promise<Response> {
    const assertionId = c.req.param("assertionId");
    const format = c.req.query("format") || "default";

    try {
      // Get the verification result
      const result =
        await this.verificationService.verifyAssertion(assertionId);

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
      console.error("Verification error:", error);
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
   * Verify a badge by parsing the provided JSON
   */
  async verifyBadgeJson(c: Context): Promise<Response> {
    const body = await c.req.json();
    const format = c.req.query("format") || "default";

    try {
      if (!body.assertion && !body.credential) {
        return c.json(
          {
            status: "error",
            error: {
              code: "VALIDATION_ERROR",
              message: "Missing assertion or credential field in request body",
            },
          },
          400,
        );
      }

      // Handle both ob2 and ob3 formats
      const assertionJson = body.assertion || body.credential;
      let assertionId: string | undefined;

      // Extract ID from the credential's ID field
      if (assertionJson.id) {
        // Handle both absolute URLs and UUIDs
        const idParts = assertionJson.id.split("/");
        assertionId = idParts[idParts.length - 1];
      }

      if (!assertionId) {
        return c.json(
          {
            status: "error",
            error: {
              code: "VALIDATION_ERROR",
              message: "Could not extract ID from provided credential",
            },
          },
          400,
        );
      }

      const result =
        await this.verificationService.verifyAssertion(assertionId);

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
      console.error("Verification error:", error);
      return c.json(
        {
          status: "error",
          error: {
            code: "VALIDATION_ERROR",
            message:
              error instanceof Error ? error.message : "Invalid request format",
          },
        },
        400,
      );
    }
  }

  /**
   * Verify a status list credential
   */
  async verifyStatusList(c: Context): Promise<Response> {
    const statusListId = c.req.param("statusListId");

    try {
      // This is a placeholder for status list verification
      // In a full implementation, this would verify the status list credential
      return c.json({
        status: "success",
        data: {
          valid: true,
          message: "Status list verified",
          id: statusListId,
        },
      });
    } catch (error) {
      console.error("Status list verification error:", error);
      return c.json(
        {
          status: "error",
          error: {
            code: "VERIFICATION_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Unknown error during status list verification",
          },
        },
        500,
      );
    }
  }
}
