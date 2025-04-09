import { Context, Next } from "hono";
import { Permission, scopesToPermissions } from "../models/auth/roles";
import { Role } from "./auth";
import { UnauthorizedError, ForbiddenError } from "../utils/errors";
import logger from "../utils/logger";
import { authorizationService } from "../services/authorization.service";

/**
 * Authorization middleware for role-based access control
 *
 * This middleware checks if the authenticated user has the required role
 * to access the protected resource.
 *
 * @param requiredRole Required role to access the resource
 * @returns Middleware function
 */
export function requireRole(requiredRole: Role) {
  return async (c: Context, next: Next) => {
    try {
      // Get the user from the context (set by the authentication middleware)
      const user = c.get("user");

      if (!user) {
        throw new UnauthorizedError("Authentication required");
      }

      // Check if the user has the required role using the database service
      const hasRole = await authorizationService.userHasRole(
        user.id,
        requiredRole,
      );
      const isAdmin = await authorizationService.userHasRole(
        user.id,
        Role.ADMIN,
      );

      // Check if the user has the required role
      if (!hasRole && !isAdmin) {
        throw new ForbiddenError(`Required role: ${requiredRole}`);
      }

      // User has the required role, proceed to the next middleware
      await next();
    } catch (error) {
      logger.error("Authorization error", { error });

      if (
        error instanceof UnauthorizedError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }

      throw new ForbiddenError("Access denied");
    }
  };
}

/**
 * Authorization middleware for permission-based access control
 *
 * This middleware checks if the authenticated user has the required permission
 * to access the protected resource.
 *
 * @param requiredPermission Required permission to access the resource
 * @returns Middleware function
 */
export function requirePermission(requiredPermission: Permission) {
  return async (c: Context, next: Next) => {
    try {
      // Get the user from the context (set by the authentication middleware)
      const user = c.get("user");

      if (!user) {
        throw new UnauthorizedError("Authentication required");
      }

      // Check if the user has the required permission using the database service
      const hasPermission = await authorizationService.userHasPermission(
        user.id,
        requiredPermission,
      );

      // Check if the user has the required permission
      if (!hasPermission) {
        throw new ForbiddenError(`Required permission: ${requiredPermission}`);
      }

      // User has the required permission, proceed to the next middleware
      await next();
    } catch (error) {
      logger.error("Authorization error", { error });

      if (
        error instanceof UnauthorizedError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }

      throw new ForbiddenError("Access denied");
    }
  };
}

/**
 * Authorization middleware for scope-based access control
 *
 * This middleware checks if the authenticated user's token has the required scope
 * to access the protected resource.
 *
 * @param requiredScope Required OAuth scope to access the resource
 * @returns Middleware function
 */
export function requireScope(requiredScope: string) {
  return async (c: Context, next: Next) => {
    try {
      // Get the token payload from the context (set by the authentication middleware)
      const tokenPayload = c.get("tokenPayload");

      if (!tokenPayload) {
        throw new UnauthorizedError("Authentication required");
      }

      // Get the token's scope
      const scope = tokenPayload.scope as string;

      // Check if the token has the required scope
      if (!scope || !scope.split(" ").includes(requiredScope)) {
        throw new ForbiddenError(`Required scope: ${requiredScope}`);
      }

      // Token has the required scope, proceed to the next middleware
      await next();
    } catch (error) {
      logger.error("Authorization error", { error });

      if (
        error instanceof UnauthorizedError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }

      throw new ForbiddenError("Access denied");
    }
  };
}

/**
 * Authorization middleware for permission-based access control using OAuth scopes
 *
 * This middleware checks if the authenticated user's token has a scope that grants
 * the required permission to access the protected resource.
 *
 * @param requiredPermission Required permission to access the resource
 * @returns Middleware function
 */
export function requireScopePermission(requiredPermission: Permission) {
  return async (c: Context, next: Next) => {
    try {
      // Get the token payload from the context (set by the authentication middleware)
      const tokenPayload = c.get("tokenPayload");

      if (!tokenPayload) {
        throw new UnauthorizedError("Authentication required");
      }

      // Get the token's scope
      const scope = tokenPayload.scope as string;

      // Convert scopes to permissions
      const permissions = scopesToPermissions(scope);

      // Check if the token has the required permission
      if (!permissions.includes(requiredPermission)) {
        throw new ForbiddenError(`Required permission: ${requiredPermission}`);
      }

      // Token has the required permission, proceed to the next middleware
      await next();
    } catch (error) {
      logger.error("Authorization error", { error });

      if (
        error instanceof UnauthorizedError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }

      throw new ForbiddenError("Access denied");
    }
  };
}
