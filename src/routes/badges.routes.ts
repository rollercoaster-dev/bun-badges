import { Hono } from 'hono';
import { db } from '../db/config';
import { badgeClasses, issuerProfiles } from '../db/schema';
import { eq } from 'drizzle-orm';
import { BADGE_ROUTES } from './aliases';
import { BadgeController } from '../controllers/badge.controller';

const badges = new Hono();
const controller = new BadgeController();

// List all badge classes
badges.get(BADGE_ROUTES.LIST, async (c) => {
  try {
    // Get badge classes (with optional filtering by issuer)
    const issuerId = c.req.query('issuerId');
    
    if (issuerId) {
      const results = await db.select()
        .from(badgeClasses)
        .where(eq(badgeClasses.issuerId, issuerId));
      
      return c.json({
        status: 'success',
        data: {
          badges: results
        }
      });
    } else {
      const results = await db.select().from(badgeClasses);
      
      return c.json({
        status: 'success',
        data: {
          badges: results
        }
      });
    }
  } catch (error) {
    console.error('Failed to list badges:', error);
    return c.json(
      {
        status: 'error',
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to retrieve badges'
        }
      },
      500
    );
  }
});

// Get a specific badge class
badges.get(BADGE_ROUTES.GET, async (c) => {
  try {
    const badgeId = c.req.param('id');
    
    const badge = await db.select()
      .from(badgeClasses)
      .where(eq(badgeClasses.badgeId, badgeId))
      .limit(1);
    
    if (!badge || badge.length === 0) {
      return c.json(
        {
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            message: 'Badge not found'
          }
        },
        404
      );
    }
    
    return c.json({
      status: 'success',
      data: {
        badge: badge[0]
      }
    });
  } catch (error) {
    console.error('Failed to get badge:', error);
    return c.json(
      {
        status: 'error',
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to retrieve badge'
        }
      },
      500
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
          status: 'error',
          error: {
            code: 'VALIDATION',
            message: 'Missing required fields'
          }
        },
        400
      );
    }
    
    // Verify the issuer exists
    const issuer = await db.select()
      .from(issuerProfiles)
      .where(eq(issuerProfiles.issuerId, issuerId))
      .limit(1);
    
    if (!issuer || issuer.length === 0) {
      return c.json(
        {
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            message: 'Issuer not found'
          }
        },
        404
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
        "type": "BadgeClass",
        "id": `${hostUrl}/badges/placeholder-id`,
        "name": name,
        "description": description,
        "image": imageUrl,
        "criteria": {
          "narrative": criteria
        },
        "issuer": `${hostUrl}/issuers/${issuerId}`
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Insert the badge
    const result = await db.insert(badgeClasses).values(newBadge).returning();
    
    if (!result || result.length === 0) {
      throw new Error('Failed to insert badge');
    }
    
    // Update the badge JSON with the correct ID
    const insertedBadge = result[0];
    const badgeJson = insertedBadge.badgeJson as any;
    badgeJson.id = `${hostUrl}/badges/${insertedBadge.badgeId}`;
    
    // Update the badge with the correct ID
    await db.update(badgeClasses)
      .set({ badgeJson })
      .where(eq(badgeClasses.badgeId, insertedBadge.badgeId));
    
    // Return the created badge
    return c.json(
      {
        status: 'success',
        data: {
          badgeId: insertedBadge.badgeId,
          badge: {
            ...insertedBadge,
            badgeJson
          }
        }
      },
      201
    );
  } catch (error) {
    console.error('Failed to create badge:', error);
    return c.json(
      {
        status: 'error',
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to create badge'
        }
      },
      500
    );
  }
});

// Update a badge class
badges.put(BADGE_ROUTES.UPDATE, async (c) => {
  try {
    const badgeId = c.req.param('id');
    const body = await c.req.json();
    
    // Get the existing badge
    const existingBadge = await db.select()
      .from(badgeClasses)
      .where(eq(badgeClasses.badgeId, badgeId))
      .limit(1);
    
    if (!existingBadge || existingBadge.length === 0) {
      return c.json(
        {
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            message: 'Badge not found'
          }
        },
        404
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
    const badgeJson = { ...existingBadge[0].badgeJson as any };
    if (name) badgeJson.name = name;
    if (description) badgeJson.description = description;
    if (criteria) badgeJson.criteria = { narrative: criteria };
    if (imageUrl) badgeJson.image = imageUrl;
    
    updates.badgeJson = badgeJson;
    
    // Update the badge
    const result = await db.update(badgeClasses)
      .set(updates)
      .where(eq(badgeClasses.badgeId, badgeId))
      .returning();
    
    return c.json({
      status: 'success',
      data: {
        badge: result[0]
      }
    });
  } catch (error) {
    console.error('Failed to update badge:', error);
    return c.json(
      {
        status: 'error',
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to update badge'
        }
      },
      500
    );
  }
});

// Delete a badge class
badges.delete(BADGE_ROUTES.DELETE, async (c) => {
  try {
    const badgeId = c.req.param('id');
    
    // Check if badge exists
    const badge = await db.select()
      .from(badgeClasses)
      .where(eq(badgeClasses.badgeId, badgeId))
      .limit(1);
    
    if (!badge || badge.length === 0) {
      return c.json(
        {
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            message: 'Badge not found'
          }
        },
        404
      );
    }
    
    // Check if badge has been issued (has assertions)
    const hasAssertions = await controller.hasBadgeAssertions(badgeId);
    if (hasAssertions) {
      return c.json(
        {
          status: 'error',
          error: {
            code: 'CONFLICT',
            message: 'Cannot delete a badge that has been issued'
          }
        },
        409
      );
    }
    
    // Delete the badge
    await db.delete(badgeClasses)
      .where(eq(badgeClasses.badgeId, badgeId));
    
    return c.json({
      status: 'success',
      data: {
        message: 'Badge deleted successfully'
      }
    });
  } catch (error) {
    console.error('Failed to delete badge:', error);
    return c.json(
      {
        status: 'error',
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to delete badge'
        }
      },
      500
    );
  }
});

export default badges; 