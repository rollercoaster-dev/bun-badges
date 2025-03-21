import { z } from "zod";
import {
  router,
  publicProcedure,
  protectedProcedure,
  createRoleMiddleware,
} from "../trpc";
import { TRPCError } from "@trpc/server";
import { Role } from "@middleware/auth";
import { db } from "@/db/config";
import { badgeClasses, badgeAssertions } from "@/db/schema/badges";
import { eq, count } from "drizzle-orm";

// Schema for badge validation
const badgeSchema = z.object({
  badgeId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  description: z.string().min(1),
  imageUrl: z.string().url(),
  criteria: z.string().min(1),
  issuerId: z.string().uuid(),
  badgeJson: z.record(z.any()).optional(),
});

// Role-based procedure for issuer access
const issuerProcedure = protectedProcedure.use(
  createRoleMiddleware([Role.ISSUER_ADMIN, Role.ISSUER_OWNER]),
);

export const badgesRouter = router({
  // Get all badges (public)
  getAll: publicProcedure
    .input(
      z.object({
        issuerId: z.string().uuid().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.number().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const { issuerId, limit, cursor } = input;

        // Get badges from the database using direct db access
        let queryBuilder = db.select().from(badgeClasses);

        // Add issuerId filter if provided
        if (issuerId) {
          queryBuilder = queryBuilder.where(
            eq(badgeClasses.issuerId, issuerId),
          );
        }

        // Execute query with pagination
        const badges = await queryBuilder.limit(limit).offset(cursor);

        const nextCursor = badges.length === limit ? cursor + limit : undefined;

        return {
          badges,
          nextCursor,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch badges",
          cause: error,
        });
      }
    }),

  // Get a single badge by ID (public)
  getById: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const { id } = input;

        // Get badge from the database using direct db access
        const [badge] = await db
          .select()
          .from(badgeClasses)
          .where(eq(badgeClasses.badgeId, id));

        if (!badge) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Badge with ID ${id} not found`,
          });
        }

        return badge;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch badge",
          cause: error,
        });
      }
    }),

  // Create a new badge (protected)
  create: issuerProcedure
    .input(badgeSchema.omit({ badgeId: true }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = ctx;

        // Prepare the badge data
        const badgeData = {
          ...input,
          badgeJson: input.badgeJson || {},
        };

        // Create badge using direct db access
        const [badge] = await db
          .insert(badgeClasses)
          .values(badgeData)
          .returning();

        return badge;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create badge",
          cause: error,
        });
      }
    }),

  // Update a badge (protected)
  update: issuerProcedure
    .input(
      badgeSchema.partial().extend({
        badgeId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = ctx;
        const { badgeId, ...data } = input;

        // First check if badge exists and user has permissions
        const [existingBadge] = await db
          .select()
          .from(badgeClasses)
          .where(eq(badgeClasses.badgeId, badgeId));

        if (!existingBadge) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Badge with ID ${badgeId} not found`,
          });
        }

        // Check if user is admin or badge belongs to user's issuer
        const isAdmin = user.roles.includes(Role.ISSUER_ADMIN);
        const isOwner =
          user.roles.includes(Role.ISSUER_OWNER) &&
          existingBadge.issuerId === user.organizationId;

        if (!isAdmin && !isOwner) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to update this badge",
          });
        }

        // Don't allow changing the issuer ID
        if (input.issuerId && existingBadge.issuerId !== input.issuerId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot change the issuer of a badge",
          });
        }

        // Update badge using direct db access
        const [updatedBadge] = await db
          .update(badgeClasses)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(badgeClasses.badgeId, badgeId))
          .returning();

        return updatedBadge;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update badge",
          cause: error,
        });
      }
    }),

  // Delete a badge (protected)
  delete: issuerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = ctx;
        const { id } = input;

        // First check if badge exists and user has permissions
        const [existingBadge] = await db
          .select()
          .from(badgeClasses)
          .where(eq(badgeClasses.badgeId, id));

        if (!existingBadge) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Badge with ID ${id} not found`,
          });
        }

        // Check if user is admin or badge belongs to user's issuer
        const isAdmin = user.roles.includes(Role.ISSUER_ADMIN);
        const isOwner =
          user.roles.includes(Role.ISSUER_OWNER) &&
          existingBadge.issuerId === user.organizationId;

        if (!isAdmin && !isOwner) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to delete this badge",
          });
        }

        // Check if badge has assertions
        const [assertionCount] = await db
          .select({ count: count() })
          .from(badgeAssertions)
          .where(eq(badgeAssertions.badgeId, id));

        if (assertionCount.count > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete a badge that has assertions",
          });
        }

        // Delete badge using direct db access
        await db.delete(badgeClasses).where(eq(badgeClasses.badgeId, id));

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete badge",
          cause: error,
        });
      }
    }),
});
