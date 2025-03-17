import { Hono } from "hono";
import { db } from "../db/config";
import { badgeAssertions, badgeClasses, issuerProfiles } from "../db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const ASSERTION_ROUTES = {
  CREATE: "/assertions",
  GET: "/assertions/:id",
  LIST: "/assertions",
  REVOKE: "/assertions/:id/revoke",
};

const assertions = new Hono();

// List all assertions (with optional filters)
assertions.get(ASSERTION_ROUTES.LIST, async (c) => {
  try {
    const badgeId = c.req.query("badgeId");
    const issuerId = c.req.query("issuerId");

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
    const { badgeId, recipient, evidence } = body;

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

    // Generate the Open Badges 2.0 compliant JSON-LD
    const hostUrl = new URL(c.req.url).origin;
    const issuedOn = new Date();

    // Create a new assertion with placeholder ID (will be replaced after insert)
    const newAssertion = {
      badgeId,
      issuerId,
      recipientType: recipient.type,
      recipientIdentity,
      recipientHashed,
      issuedOn,
      evidenceUrl: evidence || null,
      revoked: false,
      revocationReason: null,
      assertionJson: {
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
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert the assertion
    const result = await db
      .insert(badgeAssertions)
      .values(newAssertion)
      .returning();

    if (!result || result.length === 0) {
      throw new Error("Failed to insert assertion");
    }

    // Update the assertion JSON with the correct ID
    const insertedAssertion = result[0];
    const assertionJson = insertedAssertion.assertionJson as any;
    assertionJson.id = `${hostUrl}/assertions/${insertedAssertion.assertionId}`;

    // Update the assertion with the correct ID
    await db
      .update(badgeAssertions)
      .set({ assertionJson })
      .where(eq(badgeAssertions.assertionId, insertedAssertion.assertionId));

    // Return the created assertion
    return c.json(
      {
        status: "success",
        data: {
          assertionId: insertedAssertion.assertionId,
          assertion: {
            ...insertedAssertion,
            assertionJson,
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

    // Update the assertion to mark it as revoked
    const assertionJson = assertion[0].assertionJson as any;
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
