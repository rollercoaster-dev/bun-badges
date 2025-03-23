import { Context } from "hono";
import { db } from "@/db/config";
import { badgeAssertions, badgeClasses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CredentialService } from "@/services/credential.service";
import { isValidUuid } from "@/utils/validation";
import { OB2BadgeAssertion } from "@/services/verification.service";
import { OpenBadgeCredential } from "@/models/credential.model";

type AssertionJson = OB2BadgeAssertion | OpenBadgeCredential;

export class AssertionController {
  private credentialService: CredentialService;
  // Initialize services
  constructor() {
    this.credentialService = new CredentialService();
  }

  /**
   * List all assertions with optional filters
   */
  async listAssertions(c: Context) {
    try {
      const query = c.req.query();
      const badgeId = query.badgeId;
      const issuerId = query.issuerId;
      const format = query.format || "ob2";

      // Validate UUIDs if provided
      if (badgeId && !isValidUuid(badgeId)) {
        return c.json({
          status: "success",
          data: {
            assertions: [],
          },
        });
      }

      if (issuerId && !isValidUuid(issuerId)) {
        return c.json({
          status: "success",
          data: {
            assertions: [],
          },
        });
      }

      // Build query based on filters
      let results;
      if (badgeId) {
        results = await db
          .select()
          .from(badgeAssertions)
          .where(eq(badgeAssertions.badgeId, badgeId));
      } else if (issuerId) {
        results = await db
          .select()
          .from(badgeAssertions)
          .where(eq(badgeAssertions.issuerId, issuerId));
      } else {
        results = await db.select().from(badgeAssertions);
      }

      // Map results and handle format conversion if needed
      const assertions = await Promise.all(
        results.map(async (result) => {
          const assertionJson = result.assertionJson as AssertionJson;
          if (format === "ob3" && !("proof" in assertionJson)) {
            // Convert to OB3 if requested
            const credential = await this.credentialService.createCredential(
              new URL(c.req.url).origin,
              result.assertionId,
            );
            return {
              ...result,
              assertionJson: credential,
            };
          }
          return {
            ...result,
            assertionJson,
          };
        }),
      );

      return c.json({
        status: "success",
        data: {
          assertions,
        },
      });
    } catch (error) {
      console.error("Failed to list assertions:", error);
      return c.json(
        {
          status: "error",
          error: {
            code: "SERVER_ERROR",
            message: "Failed to retrieve assertions",
          },
        },
        500,
      );
    }
  }

  /**
   * Get a specific assertion by ID
   */
  async getAssertion(c: Context) {
    try {
      const assertionId = c.req.param("id");
      let format = "ob2";

      try {
        // Try to access format as a function parameter first
        const formatParam = c.req.query("format");
        if (formatParam) {
          format = formatParam;
        }
      } catch (e) {
        // If accessing as function fails, leave the default
      }

      if (!assertionId || !isValidUuid(assertionId)) {
        return c.json(
          {
            status: "error",
            error: {
              code: "NOT_FOUND",
              message: "Assertion not found",
            },
          },
          404,
        );
      }

      const assertion = await db
        .select()
        .from(badgeAssertions)
        .where(eq(badgeAssertions.assertionId, assertionId))
        .limit(1);

      if (!assertion || assertion.length === 0) {
        return c.json(
          {
            status: "error",
            error: {
              code: "NOT_FOUND",
              message: "Assertion not found",
            },
          },
          404,
        );
      }

      const result = assertion[0];
      const assertionJson = result.assertionJson as AssertionJson;

      // Convert to OB3 if requested
      if (format === "ob3" && !("proof" in assertionJson)) {
        const credential = await this.credentialService.createCredential(
          new URL(c.req.url).origin,
          result.assertionId,
        );
        return c.json({
          status: "success",
          data: {
            assertion: {
              ...result,
              assertionJson: credential,
            },
          },
        });
      }

      return c.json({
        status: "success",
        data: {
          assertion: {
            ...result,
            assertionJson,
          },
        },
      });
    } catch (error) {
      console.error("Failed to get assertion:", error);
      return c.json(
        {
          status: "error",
          error: {
            code: "SERVER_ERROR",
            message: "Failed to retrieve assertion",
          },
        },
        500,
      );
    }
  }

  /**
   * Create a new badge assertion
   */
  async createAssertion(c: Context) {
    try {
      const body = await c.req.json();

      // Handle both styles of query parameter access
      let format = "ob2";
      try {
        // Try function style first
        const query = c.req.query();
        format = query.format || "ob2";
      } catch (e) {
        // Fall back to property style if function call fails
        format = (c.req.query as any).format || "ob2";
      }

      // Validate required fields
      const { badgeId, recipient, evidence } = body;

      if (!badgeId || !recipient) {
        return c.json(
          {
            status: "error",
            error: {
              code: "VALIDATION",
              message: "Missing required fields",
            },
          },
          400,
        );
      }

      // Validate recipient object
      if (!recipient.type || !recipient.identity) {
        return c.json(
          {
            status: "error",
            error: {
              code: "VALIDATION",
              message: "Invalid recipient data",
            },
          },
          400,
        );
      }

      // Validate badge ID format
      if (!isValidUuid(badgeId)) {
        return c.json(
          {
            status: "error",
            error: {
              code: "NOT_FOUND",
              message: "Badge not found",
            },
          },
          404,
        );
      }

      // Verify badge exists
      const badge = await db
        .select()
        .from(badgeClasses)
        .where(eq(badgeClasses.badgeId, badgeId))
        .limit(1);

      if (!badge || badge.length === 0) {
        return c.json(
          {
            status: "error",
            error: {
              code: "NOT_FOUND",
              message: "Badge not found",
            },
          },
          404,
        );
      }

      // Create the assertion
      const assertionId = crypto.randomUUID();
      const now = new Date();

      // Create the assertion in the database
      await db.insert(badgeAssertions).values({
        assertionId,
        badgeId,
        issuerId: badge[0].issuerId,
        recipientType: recipient.type,
        recipientIdentity: recipient.identity,
        recipientHashed: false,
        issuedOn: now,
        evidenceUrl: evidence?.url,
        revoked: false,
        assertionJson: {
          "@context": "https://w3id.org/openbadges/v2",
          type: "Assertion",
          id: `${new URL(c.req.url).origin}/assertions/${assertionId}`,
          recipient: {
            type: recipient.type,
            identity: recipient.identity,
            hashed: false,
          },
          badge: badge[0].badgeJson,
          issuedOn: now.toISOString(),
          verification: {
            type: "HostedBadge",
          },
        },
      });

      // For OB3 format, ensure signing key exists and convert to OB3
      if (format === "ob3") {
        await this.credentialService.ensureIssuerKeyExists(badge[0].issuerId);
        const credential = await this.credentialService.createCredential(
          new URL(c.req.url).origin,
          assertionId,
        );
        return c.json({
          status: "success",
          data: {
            assertionId,
            assertion: {
              assertionJson: credential,
            },
          },
        });
      }

      // Return OB2 assertion
      return c.json({
        status: "success",
        data: {
          assertionId,
          assertion: {
            assertionJson: {
              "@context": "https://w3id.org/openbadges/v2",
              type: "Assertion",
              id: `${new URL(c.req.url).origin}/assertions/${assertionId}`,
              recipient: {
                type: recipient.type,
                identity: recipient.identity,
                hashed: false,
              },
              badge: badge[0].badgeJson,
              issuedOn: now.toISOString(),
              verification: {
                type: "HostedBadge",
              },
            },
          },
        },
      });
    } catch (error) {
      console.error("Failed to create assertion:", error);
      return c.json(
        {
          status: "error",
          error: {
            code: "SERVER_ERROR",
            message: "Failed to create assertion",
          },
        },
        500,
      );
    }
  }

  /**
   * Revoke a badge assertion
   */
  async revokeAssertion(c: Context) {
    try {
      const assertionId = c.req.param("id");
      const body = await c.req.json();
      let format = "ob2";

      try {
        // Try to access format as a function parameter first
        const formatParam = c.req.query("format");
        if (formatParam) {
          format = formatParam;
        }
      } catch (e) {
        // If accessing as function fails, leave the default
      }

      // Validate required fields
      const { reason } = body;

      if (!reason) {
        return c.json(
          {
            status: "error",
            error: {
              code: "VALIDATION",
              message: "Revocation reason is required",
            },
          },
          400,
        );
      }

      if (!assertionId || !isValidUuid(assertionId)) {
        return c.json(
          {
            status: "error",
            error: {
              code: "NOT_FOUND",
              message: "Assertion not found",
            },
          },
          404,
        );
      }

      // Get the assertion
      const assertion = await db
        .select()
        .from(badgeAssertions)
        .where(eq(badgeAssertions.assertionId, assertionId))
        .limit(1);

      if (!assertion || assertion.length === 0) {
        return c.json(
          {
            status: "error",
            error: {
              code: "NOT_FOUND",
              message: "Assertion not found",
            },
          },
          404,
        );
      }

      const result = assertion[0];
      const assertionJson = result.assertionJson as AssertionJson;

      // Update the assertion
      const updatedAssertion = await db
        .update(badgeAssertions)
        .set({
          revoked: true,
          revocationReason: reason,
        })
        .where(eq(badgeAssertions.assertionId, assertionId))
        .returning();

      if (!updatedAssertion || updatedAssertion.length === 0) {
        throw new Error("Failed to update assertion");
      }

      // Convert to OB3 if requested
      if (format === "ob3" && !("proof" in assertionJson)) {
        const credential = await this.credentialService.createCredential(
          new URL(c.req.url).origin,
          result.assertionId,
        );
        return c.json({
          status: "success",
          data: {
            assertion: {
              ...updatedAssertion[0],
              assertionJson: credential,
            },
          },
        });
      }

      return c.json({
        status: "success",
        data: {
          assertion: {
            ...updatedAssertion[0],
            assertionJson,
          },
        },
      });
    } catch (error) {
      console.error("Failed to revoke assertion:", error);
      return c.json(
        {
          status: "error",
          error: {
            code: "SERVER_ERROR",
            message: "Failed to revoke assertion",
          },
        },
        500,
      );
    }
  }

  // Removed unused function: hashRecipientIdentity
}
