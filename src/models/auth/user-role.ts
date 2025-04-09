import { Role } from "./roles";

/**
 * User Role Model
 *
 * This model represents the relationship between users and roles.
 */
export interface UserRole {
  id: string;
  userId: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new user role
 * @param userId User ID
 * @param role Role
 * @returns User role
 */
export function createUserRole(
  userId: string,
  role: Role,
): Omit<UserRole, "id"> {
  return {
    userId,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
