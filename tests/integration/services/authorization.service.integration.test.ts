import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { authorizationService } from "../../../src/services/authorization.service";
import { db } from "../../../src/db/config";
import { users } from "../../../src/db/schema";
// Role enum is not needed as we're using string literals
import { Permission } from "../../../src/models/auth/roles";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

describe("AuthorizationService Integration Tests", () => {
  let testUserId: string;

  // Create a test user before all tests
  beforeAll(async () => {
    // Create a test user
    const result = await db
      .insert(users)
      .values({
        email: `test-auth-${randomUUID()}@example.com`,
        name: "Test Auth User",
      })
      .returning({ userId: users.userId });

    testUserId = result[0].userId;
  });

  // Clean up after all tests
  afterAll(async () => {
    // Delete the test user
    if (testUserId) {
      await db.delete(users).where(eq(users.userId, testUserId));
    }
  });

  describe("Role Management", () => {
    it("should assign a role to a user", async () => {
      // Assign the ISSUER role to the test user
      const result = await authorizationService.assignRoleToUser(
        testUserId,
        "issuer",
      );
      expect(result).toBe(true);

      // Verify the user has the role
      const hasRole = await authorizationService.userHasRole(
        testUserId,
        "issuer",
      );
      expect(hasRole).toBe(true);
    });

    it("should get all roles for a user", async () => {
      // Get the user's roles
      const roles = await authorizationService.getUserRoles(testUserId);
      expect(roles).toContain("issuer");
    });

    it("should remove a role from a user", async () => {
      // Remove the ISSUER role from the test user
      const result = await authorizationService.removeRoleFromUser(
        testUserId,
        "issuer",
      );
      expect(result).toBe(true);

      // Verify the user no longer has the role
      const hasRole = await authorizationService.userHasRole(
        testUserId,
        "issuer",
      );
      expect(hasRole).toBe(false);
    });
  });

  describe("Permission Management", () => {
    it("should assign a permission directly to a user", async () => {
      // Assign the READ_CREDENTIALS permission to the test user
      const result = await authorizationService.assignPermissionToUser(
        testUserId,
        Permission.READ_CREDENTIALS,
      );
      expect(result).toBe(true);

      // Verify the user has the permission
      const hasPermission = await authorizationService.userHasPermission(
        testUserId,
        Permission.READ_CREDENTIALS,
      );
      expect(hasPermission).toBe(true);
    });

    it("should get all permissions for a user", async () => {
      // Get the user's permissions
      const permissions =
        await authorizationService.getUserPermissions(testUserId);
      expect(permissions).toContain(Permission.READ_CREDENTIALS);
    });

    it("should check if a user has specific permissions", async () => {
      // Check if the user has the READ_CREDENTIALS permission
      const hasPermission = await authorizationService.userHasPermission(
        testUserId,
        Permission.READ_CREDENTIALS,
      );
      expect(hasPermission).toBe(true);

      // Check if the user has the CREATE_CREDENTIALS permission (should not have it)
      const hasOtherPermission = await authorizationService.userHasPermission(
        testUserId,
        Permission.CREATE_CREDENTIALS,
      );
      expect(hasOtherPermission).toBe(false);
    });

    it("should check if a user has all of the specified permissions", async () => {
      // Assign another permission to the test user
      await authorizationService.assignPermissionToUser(
        testUserId,
        Permission.READ_PROFILE,
      );

      // Check if the user has both permissions
      const hasAllPermissions =
        await authorizationService.userHasAllPermissions(testUserId, [
          Permission.READ_CREDENTIALS,
          Permission.READ_PROFILE,
        ]);
      expect(hasAllPermissions).toBe(true);

      // Check if the user has permissions they don't have
      const hasAllOtherPermissions =
        await authorizationService.userHasAllPermissions(testUserId, [
          Permission.READ_CREDENTIALS,
          Permission.CREATE_CREDENTIALS,
        ]);
      expect(hasAllOtherPermissions).toBe(false);
    });

    it("should check if a user has any of the specified permissions", async () => {
      // Check if the user has any of the permissions
      const hasAnyPermission = await authorizationService.userHasAnyPermission(
        testUserId,
        [Permission.READ_CREDENTIALS, Permission.CREATE_CREDENTIALS],
      );
      expect(hasAnyPermission).toBe(true);

      // Check if the user has any permissions they don't have
      const hasAnyOtherPermission =
        await authorizationService.userHasAnyPermission(testUserId, [
          Permission.CREATE_CREDENTIALS,
          Permission.DELETE_CREDENTIALS,
        ]);
      expect(hasAnyOtherPermission).toBe(false);
    });

    it("should remove a permission from a user", async () => {
      // Remove the READ_CREDENTIALS permission from the test user
      const result = await authorizationService.removePermissionFromUser(
        testUserId,
        Permission.READ_CREDENTIALS,
      );
      expect(result).toBe(true);

      // Verify the user no longer has the permission
      const hasPermission = await authorizationService.userHasPermission(
        testUserId,
        Permission.READ_CREDENTIALS,
      );
      expect(hasPermission).toBe(false);
    });
  });

  describe("Role-Permission Relationship", () => {
    it("should assign a permission to a role and check user permissions", async () => {
      // Assign the ISSUER role to the test user
      await authorizationService.assignRoleToUser(testUserId, "issuer");

      // Assign the CREATE_CREDENTIALS permission to the ISSUER role
      const result = await authorizationService.assignPermissionToRole(
        "issuer",
        Permission.CREATE_CREDENTIALS,
      );
      expect(result).toBe(true);

      // Verify the user has the permission through the role
      const hasPermission = await authorizationService.userHasPermission(
        testUserId,
        Permission.CREATE_CREDENTIALS,
      );
      expect(hasPermission).toBe(true);
    });

    it("should remove a permission from a role and check user permissions", async () => {
      // Remove the CREATE_CREDENTIALS permission from the ISSUER role
      const result = await authorizationService.removePermissionFromRole(
        "issuer",
        Permission.CREATE_CREDENTIALS,
      );
      expect(result).toBe(true);

      // Verify the user no longer has the permission through the role
      const hasPermission = await authorizationService.userHasPermission(
        testUserId,
        Permission.CREATE_CREDENTIALS,
      );
      expect(hasPermission).toBe(false);
    });
  });
});
