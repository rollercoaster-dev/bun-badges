import { Hono } from "hono";
import { db } from "../db/config";
import { badgeClasses, issuerProfiles, badgeAssertions } from "../db/schema";
import { eq } from "drizzle-orm";
import { BADGE_ROUTES } from "./aliases";
import { BadgeController } from "../controllers/badge.controller";
import { bakeImage, extractImage } from "../utils/badge-baker";

const badges = new Hono();
const controller = new BadgeController();

// List all badge classes
badges.get(BADGE_ROUTES.LIST, async (c) => {
  try {
    // Get badge classes (with optional filtering by issuer)
    const issuerId = c.req.query("issuerId");

    if (issuerId) {
      const results = await db
        .select()
        .from(badgeClasses)
        .where(eq(badgeClasses.issuerId, issuerId));

      return c.json({
        status: "success",
        data: {
          badges: results,
        },
      });
    } else {
      const results = await db.select().from(badgeClasses);

      return c.json({
        status: "success",
        data: {
          badges: results,
        },
      });
    }
  } catch (error) {
    console.error("Failed to list badges:", error);
    return c.json(
      {
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Failed to retrieve badges",
        },
      },
      500,
    );
  }
});

// Get a specific badge class
badges.get(BADGE_ROUTES.GET, async (c) => {
  try {
    const badgeId = c.req.param("id");

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

    return c.json({
      status: "success",
      data: {
        badge: badge[0],
      },
    });
  } catch (error) {
    console.error("Failed to get badge:", error);
    return c.json(
      {
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Failed to retrieve badge",
        },
      },
      500,
    );
  }
});

// Create a new badge class
badges.post(BADGE_ROUTES.CREATE, async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    const { issuerId, name, description, criteria, imageUrl } = body;

    if (!issuerId || !name || !description || !criteria || !imageUrl) {
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

    // Verify the issuer exists
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

    // Generate the Open Badges 2.0 compliant JSON-LD
    const hostUrl = new URL(c.req.url).origin;

    // Create a new badge with placeholder ID (will be replaced after insert)
    const newBadge = {
      issuerId,
      name,
      description,
      criteria,
      imageUrl,
      badgeJson: {
        "@context": "https://w3id.org/openbadges/v2",
        type: "BadgeClass",
        id: `${hostUrl}/badges/placeholder-id`,
        name: name,
        description: description,
        image: imageUrl,
        criteria: {
          narrative: criteria,
        },
        issuer: `${hostUrl}/issuers/${issuerId}`,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert the badge
    const result = await db.insert(badgeClasses).values(newBadge).returning();

    if (!result || result.length === 0) {
      throw new Error("Failed to insert badge");
    }

    // Update the badge JSON with the correct ID
    const insertedBadge = result[0];
    const badgeJson = insertedBadge.badgeJson as any;
    badgeJson.id = `${hostUrl}/badges/${insertedBadge.badgeId}`;

    // Update the badge with the correct ID
    await db
      .update(badgeClasses)
      .set({ badgeJson })
      .where(eq(badgeClasses.badgeId, insertedBadge.badgeId));

    // Return the created badge
    return c.json(
      {
        status: "success",
        data: {
          badgeId: insertedBadge.badgeId,
          badge: {
            ...insertedBadge,
            badgeJson,
          },
        },
      },
      201,
    );
  } catch (error) {
    console.error("Failed to create badge:", error);
    return c.json(
      {
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Failed to create badge",
        },
      },
      500,
    );
  }
});

// Update a badge class
badges.put(BADGE_ROUTES.UPDATE, async (c) => {
  try {
    const badgeId = c.req.param("id");
    const body = await c.req.json();

    // Get the existing badge
    const existingBadge = await db
      .select()
      .from(badgeClasses)
      .where(eq(badgeClasses.badgeId, badgeId))
      .limit(1);

    if (!existingBadge || existingBadge.length === 0) {
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

    // Extract fields to update
    const { name, description, criteria, imageUrl } = body;
    const updates: any = { updatedAt: new Date() };

    if (name) updates.name = name;
    if (description) updates.description = description;
    if (criteria) updates.criteria = criteria;
    if (imageUrl) updates.imageUrl = imageUrl;

    // Update the badge JSON as well
    const badgeJson = { ...(existingBadge[0].badgeJson as any) };
    if (name) badgeJson.name = name;
    if (description) badgeJson.description = description;
    if (criteria) badgeJson.criteria = { narrative: criteria };
    if (imageUrl) badgeJson.image = imageUrl;

    updates.badgeJson = badgeJson;

    // Update the badge
    const result = await db
      .update(badgeClasses)
      .set(updates)
      .where(eq(badgeClasses.badgeId, badgeId))
      .returning();

    return c.json({
      status: "success",
      data: {
        badge: result[0],
      },
    });
  } catch (error) {
    console.error("Failed to update badge:", error);
    return c.json(
      {
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Failed to update badge",
        },
      },
      500,
    );
  }
});

// Delete a badge class
badges.delete(BADGE_ROUTES.DELETE, async (c) => {
  try {
    const badgeId = c.req.param("id");

    // Check if badge exists
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

    // Check if badge has been issued (has assertions)
    const hasAssertions = await controller.hasBadgeAssertions(badgeId);
    if (hasAssertions) {
      return c.json(
        {
          status: "error",
          error: {
            code: "CONFLICT",
            message: "Cannot delete a badge that has been issued",
          },
        },
        409,
      );
    }

    // Delete the badge
    await db.delete(badgeClasses).where(eq(badgeClasses.badgeId, badgeId));

    return c.json({
      status: "success",
      data: {
        message: "Badge deleted successfully",
      },
    });
  } catch (error) {
    console.error("Failed to delete badge:", error);
    return c.json(
      {
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Failed to delete badge",
        },
      },
      500,
    );
  }
});

// Add badge baking endpoints
badges.get(BADGE_ROUTES.BAKE_BADGE, async (c) => {
  try {
    const { badgeId, assertionId } = c.req.param();

    if (!badgeId || !assertionId) {
      return c.json(
        {
          status: "error",
          error: {
            code: "VALIDATION",
            message: "Missing badge ID or assertion ID",
          },
        },
        400,
      );
    }

    // Get the badge assertion
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

    // Get the badge class
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

    // Get the image data from URL - this would typically fetch from your storage
    // For demonstration, we'll fetch from the badge's imageUrl
    const imageUrl = badge[0].imageUrl;
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      return c.json(
        {
          status: "error",
          error: {
            code: "FETCH_ERROR",
            message: "Failed to fetch badge image",
          },
        },
        500,
      );
    }

    // Get image data as buffer
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);

    // Bake the assertion into the image
    const assertionJson = assertion[0].assertionJson;
    const bakedImage = await bakeImage(imageBuffer, assertionJson);

    // Set content type based on image type
    const contentType = imageUrl.toLowerCase().endsWith(".svg")
      ? "image/svg+xml"
      : "image/png";

    // Send the image back to the client
    c.header("Content-Type", contentType);
    c.header(
      "Content-Disposition",
      `attachment; filename="badge-${badgeId}.${contentType.includes("svg") ? "svg" : "png"}"`,
    );

    return new Response(bakedImage);
  } catch (error) {
    console.error("Error baking badge:", error);

    return c.json(
      {
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to bake badge",
        },
      },
      500,
    );
  }
});

// Add endpoint to extract badge data
badges.post(BADGE_ROUTES.EXTRACT_BADGE, async (c) => {
  try {
    // Get the uploaded badge image
    const formData = await c.req.formData();
    const file = formData.get("badge");

    if (!file || !(file instanceof File)) {
      return c.json(
        {
          status: "error",
          error: {
            code: "VALIDATION",
            message: "No badge file uploaded or invalid file",
          },
        },
        400,
      );
    }

    // Get file data as buffer
    const fileArrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);

    // Extract assertion from image
    const assertion = await extractImage(fileBuffer);

    if (!assertion) {
      return c.json(
        {
          status: "error",
          error: {
            code: "EXTRACTION_ERROR",
            message: "No badge data found in the image",
          },
        },
        400,
      );
    }

    return c.json({
      status: "success",
      data: {
        assertion,
        format: assertion._note ? "PNG (limited extraction)" : "SVG",
      },
    });
  } catch (error) {
    console.error("Error extracting badge data:", error);

    return c.json(
      {
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to extract badge data",
        },
      },
      500,
    );
  }
});

export default badges;
