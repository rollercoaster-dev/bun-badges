import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./index";

// Roles table for storing available roles
export const roles = pgTable("roles", {
  roleId: uuid("role_id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Permissions table for storing available permissions
export const permissions = pgTable("permissions", {
  permissionId: uuid("permission_id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User-role assignments
export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .references(() => users.userId)
      .notNull(),
    roleId: uuid("role_id")
      .references(() => roles.roleId)
      .notNull(),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
    assignedBy: uuid("assigned_by").references(() => users.userId),
    expiresAt: timestamp("expires_at"),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.userId, table.roleId] }),
    };
  },
);

// Role-permission assignments
export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .references(() => roles.roleId)
      .notNull(),
    permissionId: uuid("permission_id")
      .references(() => permissions.permissionId)
      .notNull(),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
    assignedBy: uuid("assigned_by").references(() => users.userId),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
    };
  },
);

// Direct user-permission assignments (for fine-grained control)
export const userPermissions = pgTable(
  "user_permissions",
  {
    userId: uuid("user_id")
      .references(() => users.userId)
      .notNull(),
    permissionId: uuid("permission_id")
      .references(() => permissions.permissionId)
      .notNull(),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
    assignedBy: uuid("assigned_by").references(() => users.userId),
    expiresAt: timestamp("expires_at"),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.userId, table.permissionId] }),
    };
  },
);

// Export types for use in services
export type NewRole = typeof roles.$inferInsert;
export type Role = typeof roles.$inferSelect;

export type NewPermission = typeof permissions.$inferInsert;
export type Permission = typeof permissions.$inferSelect;

export type NewUserRole = typeof userRoles.$inferInsert;
export type UserRole = typeof userRoles.$inferSelect;

export type NewRolePermission = typeof rolePermissions.$inferInsert;
export type RolePermission = typeof rolePermissions.$inferSelect;

export type NewUserPermission = typeof userPermissions.$inferInsert;
export type UserPermission = typeof userPermissions.$inferSelect;
