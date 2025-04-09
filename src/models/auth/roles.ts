/**
 * Role and Permission Model for Open Badges 3.0
 *
 * This file defines the roles and permissions used in the authorization system.
 * It follows the Open Badges 3.0 specification requirements for access control.
 */

/**
 * Permission types for the Open Badges system
 */
export enum Permission {
  // Credential permissions
  READ_CREDENTIALS = "read:credentials",
  CREATE_CREDENTIALS = "create:credentials",
  UPDATE_CREDENTIALS = "update:credentials",
  DELETE_CREDENTIALS = "delete:credentials",
  VERIFY_CREDENTIALS = "verify:credentials",

  // Profile permissions
  READ_PROFILE = "read:profile",
  UPDATE_PROFILE = "update:profile",

  // User management permissions
  READ_USERS = "read:users",
  CREATE_USERS = "create:users",
  UPDATE_USERS = "update:users",
  DELETE_USERS = "delete:users",

  // Issuer management permissions
  READ_ISSUERS = "read:issuers",
  CREATE_ISSUERS = "create:issuers",
  UPDATE_ISSUERS = "update:issuers",
  DELETE_ISSUERS = "delete:issuers",

  // System permissions
  MANAGE_SYSTEM = "manage:system",
}

/**
 * Role types for the Open Badges system
 */
export enum Role {
  ADMIN = "admin",
  ISSUER = "issuer",
  RECIPIENT = "recipient",
  VERIFIER = "verifier",
  GUEST = "guest",
}

/**
 * Role to permissions mapping
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    // Admins have all permissions
    ...Object.values(Permission),
  ],

  [Role.ISSUER]: [
    // Issuers can manage credentials and their own profile
    Permission.READ_CREDENTIALS,
    Permission.CREATE_CREDENTIALS,
    Permission.UPDATE_CREDENTIALS,
    Permission.DELETE_CREDENTIALS,
    Permission.READ_PROFILE,
    Permission.UPDATE_PROFILE,
    Permission.READ_ISSUERS,
  ],

  [Role.RECIPIENT]: [
    // Recipients can view credentials and manage their own profile
    Permission.READ_CREDENTIALS,
    Permission.READ_PROFILE,
    Permission.UPDATE_PROFILE,
  ],

  [Role.VERIFIER]: [
    // Verifiers can read and verify credentials
    Permission.READ_CREDENTIALS,
    Permission.VERIFY_CREDENTIALS,
    Permission.READ_PROFILE,
  ],

  [Role.GUEST]: [
    // Guests have minimal permissions
    Permission.READ_PROFILE,
  ],
};

/**
 * Check if a role has a specific permission
 * @param role Role to check
 * @param permission Permission to check
 * @returns True if the role has the permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Check if a role has all of the specified permissions
 * @param role Role to check
 * @param permissions Permissions to check
 * @returns True if the role has all the permissions
 */
export function hasAllPermissions(
  role: Role,
  permissions: Permission[],
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has any of the specified permissions
 * @param role Role to check
 * @param permissions Permissions to check
 * @returns True if the role has any of the permissions
 */
export function hasAnyPermission(
  role: Role,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Map Open Badges scopes to permissions
 */
export const SCOPE_TO_PERMISSION_MAP: Record<string, Permission[]> = {
  "ob:credentials:read": [Permission.READ_CREDENTIALS],
  "ob:credentials:create": [Permission.CREATE_CREDENTIALS],
  "ob:profile:read": [Permission.READ_PROFILE],
  "ob:profile:write": [Permission.UPDATE_PROFILE],
};

/**
 * Convert OAuth scopes to permissions
 * @param scopes OAuth scopes
 * @returns Permissions
 */
export function scopesToPermissions(scopes: string): Permission[] {
  const scopeList = scopes.split(" ");
  return scopeList.flatMap((scope) => SCOPE_TO_PERMISSION_MAP[scope] || []);
}
