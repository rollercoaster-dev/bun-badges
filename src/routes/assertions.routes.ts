import { Hono } from "hono";
import { db } from "@/db/config";
import { badgeAssertions, badgeClasses, issuerProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { CredentialService } from "@/services/credential.service";
import { VerificationService } from "@/services/verification.service";
import { isValidUuid } from "@/utils/validation";

const ASSERTION_ROUTES = {
  CREATE: "/assertions",
  GET: "/assertions/:id",
  LIST: "/assertions",
  REVOKE: "/assertions/:id/revoke",
};

const assertions = new Hono();

// Initialize services
const credentialService = new CredentialService();
const verificationService = new VerificationService();

// List all assertions (with optional filters)
assertions.get(ASSERTION_ROUTES.LIST, async (c) => {
  try {
    const badgeId = c.req.query("badgeId");
    const issuerId = c.req.query("issuerId");

    // Validate UUIDs if provided - Early validation helps prevent DB errors
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

    if (badgeId && issuerId) {
      const results = await db
        .select()
        .from(badgeAssertions)
        .where(
          and(
            eq(badgeAssertions.badgeId, badgeId),
            eq(badgeAssertions.issuerId, issuerId),
          ),
        );

      return c.json({
        status: "success",
        data: {
          assertions: results,
        },
      });
    } else if (badgeId) {
      const results = await db
        .select()
        .from(badgeAssertions)
        .where(eq(badgeAssertions.badgeId, badgeId));

      return c.json({
        status: "success",
        data: {
          assertions: results,
        },
      });
    } else if (issuerId) {
      const results = await db
        .select()
        .from(badgeAssertions)
        .where(eq(badgeAssertions.issuerId, issuerId));

      return c.json({
        status: "success",
        data: {
          assertions: results,
        },
      });
    } else {
      const results = await db.select().from(badgeAssertions);

      return c.json({
        status: "success",
        data: {
          assertions: results,
        },
      });
    }
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
});

// Get a specific assertion
assertions.get(ASSERTION_ROUTES.GET, async (c) => {
  try {
    const assertionId = c.req.param("id");
    const format = c.req.query("format") || "default";

    if (!assertionId) {
      return c.json(
        {
          status: "error",
          error: {
            code: "VALIDATION",
            message: "Missing assertion ID",
          },
        },
        400,
      );
    }

    // Validate UUID format
    if (!isValidUuid(assertionId)) {
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

    // Get the assertion from the database
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

    // If format=ob3 is specified, return as Open Badges 3.0
    if (format === "ob3") {
      try {
        const hostUrl = new URL(c.req.url).origin;
        const credential = await credentialService.createCredential(
          hostUrl,
          assertionId,
        );

        // Include verification result
        const verificationResult =
          await verificationService.verifyAssertion(assertionId);

        // If the assertion is revoked, include that information
        if (assertion[0].revoked) {
          return c.json({
            status: "success",
            data: {
              credential,
              verification: verificationResult,
              revoked: true,
              revocationReason: assertion[0].revocationReason,
            },
          });
        }

        return c.json({
          status: "success",
          data: {
            credential,
            verification: verificationResult,
          },
        });
      } catch (error) {
        console.error("Failed to create OB3 credential:", error);
        return c.json(
          {
            status: "error",
            error: {
              code: "SERVER_ERROR",
              message: "Failed to generate Open Badges 3.0 credential",
            },
          },
          500,
        );
      }
    }

    // Default format - return original OB2.0 assertion

    // If the assertion is revoked, include that information
    if (assertion[0].revoked) {
      return c.json({
        status: "success",
        data: {
          assertion: assertion[0],
          revoked: true,
          revocationReason: assertion[0].revocationReason,
        },
      });
    }

    return c.json({
      status: "success",
      data: {
        assertion: assertion[0],
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
});

// Create (issue) a new badge assertion
assertions.post(ASSERTION_ROUTES.CREATE, async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    const { badgeId, recipient, evidence, version } = body;
    // Default to OB2 if not specified
    const badgeVersion = version || "ob2";

    if (!badgeId || !recipient || !recipient.identity || !recipient.type) {
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

    const issuerId = badge[0].issuerId;

    // Verify issuer exists
    const issuer = await db
      .select()
      .from(issuerProfiles)
      .where(eq(issuerProfiles.issuerId, issuerId))
      .limit(1);

    if (!issuer || issuer.length === 0) {
      return c.json(
        {
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: "Issuer not found",
          },
        },
        404,
      );
    }

    // Process recipient identity (hash if requested)
    const shouldHash = recipient.hashed === true;
    let recipientIdentity = recipient.identity;
    let recipientHashed = false;
    let salt = "";

    if (shouldHash) {
      // Generate a salt for hashing
      salt = crypto.randomBytes(16).toString("hex");

      // Hash the identity with the salt
      const hash = crypto.createHash("sha256");
      hash.update(recipient.identity + salt);
      const hashedIdentity = `sha256$${hash.digest("hex")}`;

      recipientIdentity = hashedIdentity;
      recipientHashed = true;
    }

    // Generate the Open Badges JSON
    const hostUrl = new URL(c.req.url).origin;
    const issuedOn = new Date();

    // Create assertion base
    const assertionBase = {
      badgeId,
      issuerId,
      recipientType: recipient.type,
      recipientIdentity,
      recipientHashed,
      issuedOn,
      evidenceUrl: evidence || null,
      revoked: false,
      revocationReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let assertionJson;
    let ob3Credential;

    // Create JSON based on requested version
    if (badgeVersion === "ob3") {
      // Ensure issuer has signing key for OB3.0
      await credentialService.ensureIssuerKeyExists(issuerId);

      // For OB3, we first create in the database with a placeholder,
      // then generate the verifiable credential after getting the ID
      assertionJson = {
        "@context": "https://w3id.org/openbadges/v2",
        type: "Assertion",
        id: `${hostUrl}/assertions/placeholder-id`,
        recipient: {
          type: recipient.type,
          identity: recipientIdentity,
          hashed: recipientHashed,
          ...(recipientHashed && { salt }),
        },
        badge: `${hostUrl}/badges/${badgeId}`,
        issuedOn: issuedOn.toISOString(),
        verification: {
          type: "HostedBadge",
        },
        ...(evidence && { evidence: evidence }),
      };
    } else {
      // Standard OB2.0 format
      assertionJson = {
        "@context": "https://w3id.org/openbadges/v2",
        type: "Assertion",
        id: `${hostUrl}/assertions/placeholder-id`,
        recipient: {
          type: recipient.type,
          identity: recipientIdentity,
          hashed: recipientHashed,
          ...(recipientHashed && { salt }),
        },
        badge: `${hostUrl}/badges/${badgeId}`,
        issuedOn: issuedOn.toISOString(),
        verification: {
          type: "HostedBadge",
        },
        ...(evidence && { evidence: evidence }),
      };
    }

    // Insert the assertion
    const result = await db
      .insert(badgeAssertions)
      .values({
        ...assertionBase,
        assertionJson,
      })
      .returning();

    if (!result || result.length === 0) {
      throw new Error("Failed to insert assertion");
    }

    // Get the inserted assertion
    const insertedAssertion = result[0];

    // If OB3.0 was requested, generate the signed credential
    if (badgeVersion === "ob3") {
      try {
        // Create OB3.0 credential with proper cryptographic proof
        ob3Credential = await credentialService.createCredential(
          hostUrl,
          insertedAssertion.assertionId,
        );

        // Save the credential to the assertionJson field
        await db
          .update(badgeAssertions)
          .set({
            assertionJson: ob3Credential,
            updatedAt: new Date(),
          })
          .where(
            eq(badgeAssertions.assertionId, insertedAssertion.assertionId),
          );

        // Also verify the credential
        const verificationResult = await verificationService.verifyOB3Assertion(
          insertedAssertion.assertionId,
        );

        // Return the credential and verification result
        return c.json(
          {
            status: "success",
            data: {
              assertionId: insertedAssertion.assertionId,
              credential: ob3Credential,
              verification: verificationResult,
            },
          },
          201,
        );
      } catch (error) {
        console.error("Failed to create OB3 credential:", error);
        // Continue with OB2.0 format as fallback
      }
    }

    // For OB2.0 or as fallback

    // Update the assertion JSON with the correct ID
    const updatedAssertionJson = insertedAssertion.assertionJson as any;
    updatedAssertionJson.id = `${hostUrl}/assertions/${insertedAssertion.assertionId}`;

    // Update the assertion with the correct ID
    await db
      .update(badgeAssertions)
      .set({
        assertionJson: updatedAssertionJson,
        updatedAt: new Date(),
      })
      .where(eq(badgeAssertions.assertionId, insertedAssertion.assertionId));

    // Return the created assertion
    return c.json(
      {
        status: "success",
        data: {
          assertionId: insertedAssertion.assertionId,
          assertion: {
            ...insertedAssertion,
            assertionJson: updatedAssertionJson,
          },
        },
      },
      201,
    );
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
});

// Revoke a badge assertion
assertions.post(ASSERTION_ROUTES.REVOKE, async (c) => {
  try {
    const assertionId = c.req.param("id");
    const body = await c.req.json();

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

    if (!assertionId) {
      return c.json(
        {
          status: "error",
          error: {
            code: "VALIDATION",
            message: "Missing assertion ID",
          },
        },
        400,
      );
    }

    // Validate UUID format
    if (!isValidUuid(assertionId)) {
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

    // Check if assertion exists
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

    // If already revoked, return success but indicate it was already revoked
    if (assertion[0].revoked) {
      return c.json({
        status: "success",
        data: {
          message: "Assertion was already revoked",
          previousReason: assertion[0].revocationReason,
          newReason: reason,
        },
      });
    }

    const assertionJson = assertion[0].assertionJson as any;
    const isOB3 = !!assertionJson.proof;
    const hostUrl = new URL(c.req.url).origin;

    if (isOB3) {
      try {
        // For OB3, we need to update the credential with revocation status
        // and possibly re-sign it or use a status list
        assertionJson.revoked = true;
        assertionJson.revocationReason = reason;

        // Update status verification field
        if (!assertionJson.credentialStatus) {
          assertionJson.credentialStatus = {
            id: `${hostUrl}/status/${assertionId}`,
            type: "RevocationList2020Status",
            revocationListIndex: assertionId,
            revocationListCredential: `${hostUrl}/status/list`,
          };
        }

        // Store the updated credential
        await db
          .update(badgeAssertions)
          .set({
            revoked: true,
            revocationReason: reason,
            assertionJson,
            updatedAt: new Date(),
          })
          .where(eq(badgeAssertions.assertionId, assertionId));

        return c.json({
          status: "success",
          data: {
            message: "Assertion revoked successfully",
            reason,
            credentialStatus: assertionJson.credentialStatus,
          },
        });
      } catch (error) {
        console.error("Failed to revoke OB3 credential:", error);
        return c.json(
          {
            status: "error",
            error: {
              code: "SERVER_ERROR",
              message: "Failed to revoke OB3 credential",
            },
          },
          500,
        );
      }
    } else {
      // Standard OB2.0 revocation
      assertionJson.revoked = true;
      assertionJson.revocationReason = reason;

      await db
        .update(badgeAssertions)
        .set({
          revoked: true,
          revocationReason: reason,
          assertionJson,
          updatedAt: new Date(),
        })
        .where(eq(badgeAssertions.assertionId, assertionId));

      return c.json({
        status: "success",
        data: {
          message: "Assertion revoked successfully",
          reason,
        },
      });
    }
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
});
export default assertions;
