import { eq, and } from "drizzle-orm";
import { db } from "../db/config";
import {
  roles,
  permissions,
  userRoles,
  rolePermissions,
  userPermissions,
} from "../db/schema/roles.schema";
import { Permission as PermissionEnum } from "../models/auth/roles";
import { users } from "../db/schema";
import logger from "../utils/logger";

// Cache for storing user roles and permissions
// This is a simple in-memory cache for now
// In production, consider using Redis or another distributed cache
interface PermissionCache {
  [userId: string]: {
    roles: string[];
    permissions: string[];
    expiresAt: number; // Timestamp when the cache expires
  };
}

const permissionCache: PermissionCache = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Authorization service for managing roles and permissions
 */
export class AuthorizationService {
  /**
   * Assign a role to a user
   * @param userId User ID
   * @param roleName Role name
   * @param assignedBy User ID of the assigner (optional)
   * @param expiresAt Expiration date (optional)
   * @returns True if successful
   */
  async assignRoleToUser(
    userId: string,
    roleName: string,
    assignedBy?: string,
    expiresAt?: Date,
  ): Promise<boolean> {
    try {
      // Get the role ID
      const roleResult = await db
        .select({ roleId: roles.roleId })
        .from(roles)
        .where(eq(roles.name, roleName))
        .limit(1);

      if (roleResult.length === 0) {
        logger.error(`Role not found: ${roleName}`);
        return false;
      }

      const roleId = roleResult[0].roleId;

      // Check if the user exists
      const userResult = await db
        .select({ userId: users.userId })
        .from(users)
        .where(eq(users.userId, userId))
        .limit(1);

      if (userResult.length === 0) {
        logger.error(`User not found: ${userId}`);
        return false;
      }

      // Assign the role to the user
      await db
        .insert(userRoles)
        .values({
          userId,
          roleId,
          assignedBy,
          expiresAt,
        })
        .onConflictDoUpdate({
          target: [userRoles.userId, userRoles.roleId],
          set: {
            assignedBy,
            expiresAt,
            assignedAt: new Date(),
          },
        });

      // Invalidate the cache for this user
      this.invalidateCache(userId);

      return true;
    } catch (error) {
      logger.error("Error assigning role to user", { error });
      return false;
    }
  }

  /**
   * Remove a role from a user
   * @param userId User ID
   * @param roleName Role name
   * @returns True if successful
   */
  async removeRoleFromUser(userId: string, roleName: string): Promise<boolean> {
    try {
      // Get the role ID
      const roleResult = await db
        .select({ roleId: roles.roleId })
        .from(roles)
        .where(eq(roles.name, roleName))
        .limit(1);

      if (roleResult.length === 0) {
        logger.error(`Role not found: ${roleName}`);
        return false;
      }

      const roleId = roleResult[0].roleId;

      // Remove the role from the user
      await db
        .delete(userRoles)
        .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));

      // Invalidate the cache for this user
      this.invalidateCache(userId);

      return true;
    } catch (error) {
      logger.error("Error removing role from user", { error });
      return false;
    }
  }

  /**
   * Get all roles for a user
   * @param userId User ID
   * @returns Array of role names
   */
  async getUserRoles(userId: string): Promise<string[]> {
    try {
      // Check cache first
      if (
        permissionCache[userId] &&
        permissionCache[userId].expiresAt > Date.now()
      ) {
        return permissionCache[userId].roles;
      }

      // Get roles from database
      const result = await db
        .select({ roleName: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.roleId))
        .where(eq(userRoles.userId, userId));

      const roleNames = result.map((r) => r.roleName);

      // Update cache
      this.updateCache(userId, roleNames, []);

      return roleNames;
    } catch (error) {
      logger.error("Error getting user roles", { error });
      return [];
    }
  }

  /**
   * Check if a user has a specific role
   * @param userId User ID
   * @param roleName Role name
   * @returns True if the user has the role
   */
  async userHasRole(userId: string, roleName: string): Promise<boolean> {
    try {
      const userRoles = await this.getUserRoles(userId);
      return userRoles.includes(roleName);
    } catch (error) {
      logger.error("Error checking if user has role", { error });
      return false;
    }
  }

  /**
   * Get all permissions for a user
   * @param userId User ID
   * @returns Array of permission names
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      // Check cache first
      if (
        permissionCache[userId] &&
        permissionCache[userId].expiresAt > Date.now()
      ) {
        return permissionCache[userId].permissions;
      }

      // Get permissions from role assignments
      const rolePermissionsResult = await db
        .select({ permissionName: permissions.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.roleId))
        .innerJoin(
          rolePermissions,
          eq(userRoles.roleId, rolePermissions.roleId),
        )
        .innerJoin(
          permissions,
          eq(rolePermissions.permissionId, permissions.permissionId),
        )
        .where(eq(userRoles.userId, userId));

      // Get direct permission assignments
      const directPermissionsResult = await db
        .select({ permissionName: permissions.name })
        .from(userPermissions)
        .innerJoin(
          permissions,
          eq(userPermissions.permissionId, permissions.permissionId),
        )
        .where(eq(userPermissions.userId, userId));

      // Combine and deduplicate permissions
      const allPermissions = [
        ...rolePermissionsResult,
        ...directPermissionsResult,
      ].map((p) => p.permissionName);
      const uniquePermissions = [...new Set(allPermissions)];

      // Update cache
      this.updateCache(userId, [], uniquePermissions);

      return uniquePermissions;
    } catch (error) {
      logger.error("Error getting user permissions", { error });
      return [];
    }
  }

  /**
   * Check if a user has a specific permission
   * @param userId User ID
   * @param permissionName Permission name
   * @returns True if the user has the permission
   */
  async userHasPermission(
    userId: string,
    permissionName: PermissionEnum,
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return userPermissions.includes(permissionName);
    } catch (error) {
      logger.error("Error checking if user has permission", { error });
      return false;
    }
  }

  /**
   * Check if a user has all of the specified permissions
   * @param userId User ID
   * @param permissionNames Permission names
   * @returns True if the user has all permissions
   */
  async userHasAllPermissions(
    userId: string,
    permissionNames: PermissionEnum[],
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return permissionNames.every((p) => userPermissions.includes(p));
    } catch (error) {
      logger.error("Error checking if user has all permissions", { error });
      return false;
    }
  }

  /**
   * Check if a user has any of the specified permissions
   * @param userId User ID
   * @param permissionNames Permission names
   * @returns True if the user has any permission
   */
  async userHasAnyPermission(
    userId: string,
    permissionNames: PermissionEnum[],
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return permissionNames.some((p) => userPermissions.includes(p));
    } catch (error) {
      logger.error("Error checking if user has any permission", { error });
      return false;
    }
  }

  /**
   * Create a new role
   * @param name Role name
   * @param description Role description
   * @returns Role ID if successful, null otherwise
   */
  async createRole(name: string, description?: string): Promise<string | null> {
    try {
      const result = await db
        .insert(roles)
        .values({
          name,
          description,
        })
        .returning({ roleId: roles.roleId });

      if (result.length === 0) {
        return null;
      }

      return result[0].roleId;
    } catch (error) {
      logger.error("Error creating role", { error });
      return null;
    }
  }

  /**
   * Create a new permission
   * @param name Permission name
   * @param description Permission description
   * @returns Permission ID if successful, null otherwise
   */
  async createPermission(
    name: string,
    description?: string,
  ): Promise<string | null> {
    try {
      const result = await db
        .insert(permissions)
        .values({
          name,
          description,
        })
        .returning({ permissionId: permissions.permissionId });

      if (result.length === 0) {
        return null;
      }

      return result[0].permissionId;
    } catch (error) {
      logger.error("Error creating permission", { error });
      return null;
    }
  }

  /**
   * Assign a permission to a role
   * @param roleName Role name
   * @param permissionName Permission name
   * @param assignedBy User ID of the assigner (optional)
   * @returns True if successful
   */
  async assignPermissionToRole(
    roleName: string,
    permissionName: string,
    assignedBy?: string,
  ): Promise<boolean> {
    try {
      // Get the role ID
      const roleResult = await db
        .select({ roleId: roles.roleId })
        .from(roles)
        .where(eq(roles.name, roleName))
        .limit(1);

      if (roleResult.length === 0) {
        logger.error(`Role not found: ${roleName}`);
        return false;
      }

      const roleId = roleResult[0].roleId;

      // Get the permission ID
      const permissionResult = await db
        .select({ permissionId: permissions.permissionId })
        .from(permissions)
        .where(eq(permissions.name, permissionName))
        .limit(1);

      if (permissionResult.length === 0) {
        logger.error(`Permission not found: ${permissionName}`);
        return false;
      }

      const permissionId = permissionResult[0].permissionId;

      // Assign the permission to the role
      await db
        .insert(rolePermissions)
        .values({
          roleId,
          permissionId,
          assignedBy,
        })
        .onConflictDoUpdate({
          target: [rolePermissions.roleId, rolePermissions.permissionId],
          set: {
            assignedBy,
            assignedAt: new Date(),
          },
        });

      // Invalidate cache for all users with this role
      await this.invalidateCacheForRole(roleId);

      return true;
    } catch (error) {
      logger.error("Error assigning permission to role", { error });
      return false;
    }
  }

  /**
   * Remove a permission from a role
   * @param roleName Role name
   * @param permissionName Permission name
   * @returns True if successful
   */
  async removePermissionFromRole(
    roleName: string,
    permissionName: string,
  ): Promise<boolean> {
    try {
      // Get the role ID
      const roleResult = await db
        .select({ roleId: roles.roleId })
        .from(roles)
        .where(eq(roles.name, roleName))
        .limit(1);

      if (roleResult.length === 0) {
        logger.error(`Role not found: ${roleName}`);
        return false;
      }

      const roleId = roleResult[0].roleId;

      // Get the permission ID
      const permissionResult = await db
        .select({ permissionId: permissions.permissionId })
        .from(permissions)
        .where(eq(permissions.name, permissionName))
        .limit(1);

      if (permissionResult.length === 0) {
        logger.error(`Permission not found: ${permissionName}`);
        return false;
      }

      const permissionId = permissionResult[0].permissionId;

      // Remove the permission from the role
      await db
        .delete(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, roleId),
            eq(rolePermissions.permissionId, permissionId),
          ),
        );

      // Invalidate cache for all users with this role
      await this.invalidateCacheForRole(roleId);

      return true;
    } catch (error) {
      logger.error("Error removing permission from role", { error });
      return false;
    }
  }

  /**
   * Assign a permission directly to a user
   * @param userId User ID
   * @param permissionName Permission name
   * @param assignedBy User ID of the assigner (optional)
   * @param expiresAt Expiration date (optional)
   * @returns True if successful
   */
  async assignPermissionToUser(
    userId: string,
    permissionName: string,
    assignedBy?: string,
    expiresAt?: Date,
  ): Promise<boolean> {
    try {
      // Get the permission ID
      const permissionResult = await db
        .select({ permissionId: permissions.permissionId })
        .from(permissions)
        .where(eq(permissions.name, permissionName))
        .limit(1);

      if (permissionResult.length === 0) {
        logger.error(`Permission not found: ${permissionName}`);
        return false;
      }

      const permissionId = permissionResult[0].permissionId;

      // Check if the user exists
      const userResult = await db
        .select({ userId: users.userId })
        .from(users)
        .where(eq(users.userId, userId))
        .limit(1);

      if (userResult.length === 0) {
        logger.error(`User not found: ${userId}`);
        return false;
      }

      // Assign the permission to the user
      await db
        .insert(userPermissions)
        .values({
          userId,
          permissionId,
          assignedBy,
          expiresAt,
        })
        .onConflictDoUpdate({
          target: [userPermissions.userId, userPermissions.permissionId],
          set: {
            assignedBy,
            expiresAt,
            assignedAt: new Date(),
          },
        });

      // Invalidate the cache for this user
      this.invalidateCache(userId);

      return true;
    } catch (error) {
      logger.error("Error assigning permission to user", { error });
      return false;
    }
  }

  /**
   * Remove a permission from a user
   * @param userId User ID
   * @param permissionName Permission name
   * @returns True if successful
   */
  async removePermissionFromUser(
    userId: string,
    permissionName: string,
  ): Promise<boolean> {
    try {
      // Get the permission ID
      const permissionResult = await db
        .select({ permissionId: permissions.permissionId })
        .from(permissions)
        .where(eq(permissions.name, permissionName))
        .limit(1);

      if (permissionResult.length === 0) {
        logger.error(`Permission not found: ${permissionName}`);
        return false;
      }

      const permissionId = permissionResult[0].permissionId;

      // Remove the permission from the user
      await db
        .delete(userPermissions)
        .where(
          and(
            eq(userPermissions.userId, userId),
            eq(userPermissions.permissionId, permissionId),
          ),
        );

      // Invalidate the cache for this user
      this.invalidateCache(userId);

      return true;
    } catch (error) {
      logger.error("Error removing permission from user", { error });
      return false;
    }
  }

  /**
   * Update the cache with user roles and permissions
   * @param userId User ID
   * @param roles Role names
   * @param permissions Permission names
   */
  private updateCache(
    userId: string,
    roles: string[],
    permissions: string[],
  ): void {
    // If both roles and permissions are empty, don't update the cache
    if (roles.length === 0 && permissions.length === 0) {
      return;
    }

    // Initialize cache entry if it doesn't exist
    if (!permissionCache[userId]) {
      permissionCache[userId] = {
        roles: [],
        permissions: [],
        expiresAt: 0,
      };
    }

    // Update roles if provided
    if (roles.length > 0) {
      permissionCache[userId].roles = roles;
    }

    // Update permissions if provided
    if (permissions.length > 0) {
      permissionCache[userId].permissions = permissions;
    }

    // Set expiration time
    permissionCache[userId].expiresAt = Date.now() + CACHE_TTL_MS;
  }

  /**
   * Invalidate the cache for a user
   * @param userId User ID
   */
  private invalidateCache(userId: string): void {
    delete permissionCache[userId];
  }

  /**
   * Invalidate cache for all users with a specific role
   * @param roleId Role ID
   */
  private async invalidateCacheForRole(roleId: string): Promise<void> {
    try {
      // Get all users with this role
      const result = await db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(eq(userRoles.roleId, roleId));

      // Invalidate cache for each user
      result.forEach((r) => {
        this.invalidateCache(r.userId);
      });
    } catch (error) {
      logger.error("Error invalidating cache for role", { error });
    }
  }
}

// Export a singleton instance
export const authorizationService = new AuthorizationService();
