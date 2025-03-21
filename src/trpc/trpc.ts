import { initTRPC, TRPCError } from "@trpc/server";
import { Context } from "./context";
import { ZodError } from "zod";
import { Role } from "@middleware/auth";

/**
 * Initialize tRPC
 * This is the main tRPC instance used to create routers, procedures, etc.
 */
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Export reusable router and procedure helpers
 * Use these to create new routers and procedures
 */
export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure middleware
 * Only allows authenticated users to access the procedure
 */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

/**
 * Protected procedure
 * Only allows authenticated users to access the procedure
 */
export const protectedProcedure = t.procedure.use(isAuthed);

/**
 * Role-based procedure middleware
 * Only allows users with specific roles to access the procedure
 */
export const createRoleMiddleware = (allowedRoles: Role[]) => {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const userRoles = ctx.user.roles || [];
    const hasAllowedRole = allowedRoles.some((role) =>
      userRoles.includes(role),
    );

    if (!hasAllowedRole) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return next({
      ctx: {
        user: ctx.user,
      },
    });
  });
};
