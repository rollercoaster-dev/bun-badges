import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// Issuer profiles for badge issuance
export const issuerProfiles = pgTable("issuer_profiles", {
  issuerId: uuid("issuer_id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  description: text("description"),
  email: varchar("email", { length: 255 }),
  ownerUserId: uuid("owner_user_id")
    // Use function reference with any type to avoid circular dependency
    .references((): any => ({ table: "users", column: "user_id" }))
    .notNull(),
  issuerJson: jsonb("issuer_json").notNull(), // Full Open Badges issuer JSON
  publicKey: jsonb("public_key"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Export types for use in services
export type NewIssuerProfile = typeof issuerProfiles.$inferInsert;
