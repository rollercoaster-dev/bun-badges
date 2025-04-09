import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
  roleId: uuid("role_id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const permissions = pgTable("permissions", {
  permissionId: uuid("permission_id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id").notNull(),
    roleId: uuid("role_id").notNull(),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
    assignedBy: uuid("assigned_by"),
    expiresAt: timestamp("expires_at"),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.userId, table.roleId] }),
    };
  },
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id").notNull(),
    permissionId: uuid("permission_id").notNull(),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
    assignedBy: uuid("assigned_by"),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
    };
  },
);

export const userPermissions = pgTable(
  "user_permissions",
  {
    userId: uuid("user_id").notNull(),
    permissionId: uuid("permission_id").notNull(),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
    assignedBy: uuid("assigned_by"),
    expiresAt: timestamp("expires_at"),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.userId, table.permissionId] }),
    };
  },
);

// Add foreign key constraints
export const addForeignKeys = sql`
  ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE;
  ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE CASCADE;
  ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("user_id") ON DELETE SET NULL;

  ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE CASCADE;
  ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("permission_id") ON DELETE CASCADE;
  ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("user_id") ON DELETE SET NULL;

  ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE;
  ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("permission_id") ON DELETE CASCADE;
  ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("user_id") ON DELETE SET NULL;
`;

// Drop foreign key constraints
export const dropForeignKeys = sql`
  ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_user_id_fkey";
  ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_role_id_fkey";
  ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_assigned_by_fkey";

  ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_role_id_fkey";
  ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_permission_id_fkey";
  ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_assigned_by_fkey";

  ALTER TABLE "user_permissions" DROP CONSTRAINT IF EXISTS "user_permissions_user_id_fkey";
  ALTER TABLE "user_permissions" DROP CONSTRAINT IF EXISTS "user_permissions_permission_id_fkey";
  ALTER TABLE "user_permissions" DROP CONSTRAINT IF EXISTS "user_permissions_assigned_by_fkey";
`;

// Seed default roles and permissions
export const seedDefaultData = sql`
  -- Insert default roles
  INSERT INTO "roles" ("name", "description")
  VALUES
    ('admin', 'Administrator with full system access'),
    ('issuer', 'Can issue and manage badges'),
    ('recipient', 'Can receive and manage their badges'),
    ('verifier', 'Can verify badges')
  ON CONFLICT (name) DO NOTHING;

  -- Insert default permissions
  INSERT INTO "permissions" ("name", "description")
  VALUES
    ('read:credentials', 'Can read credentials'),
    ('create:credentials', 'Can create credentials'),
    ('update:credentials', 'Can update credentials'),
    ('delete:credentials', 'Can delete credentials'),
    ('verify:credentials', 'Can verify credentials'),
    ('read:profile', 'Can read profile information'),
    ('update:profile', 'Can update profile information'),
    ('read:users', 'Can read user information'),
    ('create:users', 'Can create users'),
    ('update:users', 'Can update users'),
    ('delete:users', 'Can delete users'),
    ('read:issuers', 'Can read issuer information'),
    ('create:issuers', 'Can create issuers'),
    ('update:issuers', 'Can update issuers'),
    ('delete:issuers', 'Can delete issuers'),
    ('manage:system', 'Can manage system settings')
  ON CONFLICT (name) DO NOTHING;

  -- Assign permissions to admin role
  WITH admin_role AS (SELECT "role_id" FROM "roles" WHERE "name" = 'admin'),
       all_permissions AS (SELECT "permission_id" FROM "permissions")
  INSERT INTO "role_permissions" ("role_id", "permission_id")
  SELECT admin_role.role_id, all_permissions.permission_id
  FROM admin_role, all_permissions
  ON CONFLICT DO NOTHING;

  -- Assign permissions to issuer role
  WITH issuer_role AS (SELECT "role_id" FROM "roles" WHERE "name" = 'issuer'),
       issuer_permissions AS (
         SELECT "permission_id" FROM "permissions"
         WHERE "name" IN (
           'read:credentials', 'create:credentials', 'update:credentials',
           'delete:credentials', 'read:profile', 'update:profile', 'read:issuers'
         )
       )
  INSERT INTO "role_permissions" ("role_id", "permission_id")
  SELECT issuer_role.role_id, issuer_permissions.permission_id
  FROM issuer_role, issuer_permissions
  ON CONFLICT DO NOTHING;

  -- Assign permissions to recipient role
  WITH recipient_role AS (SELECT "role_id" FROM "roles" WHERE "name" = 'recipient'),
       recipient_permissions AS (
         SELECT "permission_id" FROM "permissions"
         WHERE "name" IN ('read:credentials', 'read:profile', 'update:profile')
       )
  INSERT INTO "role_permissions" ("role_id", "permission_id")
  SELECT recipient_role.role_id, recipient_permissions.permission_id
  FROM recipient_role, recipient_permissions
  ON CONFLICT DO NOTHING;

  -- Assign permissions to verifier role
  WITH verifier_role AS (SELECT "role_id" FROM "roles" WHERE "name" = 'verifier'),
       verifier_permissions AS (
         SELECT "permission_id" FROM "permissions"
         WHERE "name" IN ('read:credentials', 'verify:credentials', 'read:profile')
       )
  INSERT INTO "role_permissions" ("role_id", "permission_id")
  SELECT verifier_role.role_id, verifier_permissions.permission_id
  FROM verifier_role, verifier_permissions
  ON CONFLICT DO NOTHING;
`;

export async function up(db: any) {
  await db.schema.createTable(roles).execute();
  await db.schema.createTable(permissions).execute();
  await db.schema.createTable(userRoles).execute();
  await db.schema.createTable(rolePermissions).execute();
  await db.schema.createTable(userPermissions).execute();
  await db.execute(addForeignKeys);
  await db.execute(seedDefaultData);
}

export async function down(db: any) {
  await db.execute(dropForeignKeys);
  await db.schema.dropTable(userPermissions).execute();
  await db.schema.dropTable(rolePermissions).execute();
  await db.schema.dropTable(userRoles).execute();
  await db.schema.dropTable(permissions).execute();
  await db.schema.dropTable(roles).execute();
}
