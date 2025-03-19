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

    try {
      const result =
        await this.verificationService.verifyAssertion(assertionId);

      return c.json({
        status: "success",
        data: {
          valid: result.valid,
          checks: result.checks,
          errors: result.errors.length > 0 ? result.errors : undefined,
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
    try {
      const body = await c.req.json();

      if (!body.assertion) {
        return c.json(
          {
            status: "error",
            error: {
              code: "VALIDATION_ERROR",
              message: "Missing assertion field in request body",
            },
          },
          400,
        );
      }

      // For this endpoint, we'd need to extract the assertion ID and then verify it,
      // or implement a separate verification flow for in-memory badge data.
      // For now, we extract the ID from the assertion and use our existing method
      const assertionJson = body.assertion;
      const assertionId = assertionJson.id?.split("/").pop();

      if (!assertionId) {
        return c.json(
          {
            status: "error",
            error: {
              code: "VALIDATION_ERROR",
              message: "Could not extract assertion ID from provided JSON",
            },
          },
          400,
        );
      }

      const result =
        await this.verificationService.verifyAssertion(assertionId);

      return c.json({
        status: "success",
        data: {
          valid: result.valid,
          checks: result.checks,
          errors: result.errors.length > 0 ? result.errors : undefined,
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
}
