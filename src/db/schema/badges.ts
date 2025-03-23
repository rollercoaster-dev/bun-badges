import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { issuerProfiles } from "./issuers";

// Badge classes for creating assertions
export const badgeClasses = pgTable("badge_classes", {
  badgeId: uuid("badge_id").primaryKey().defaultRandom(),
  issuerId: uuid("issuer_id")
    .references(() => issuerProfiles.issuerId)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  criteria: text("criteria").notNull(),
  badgeJson: jsonb("badge_json").notNull(), // Full Open Badges badge class JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Badge assertions for issued badges
export const badgeAssertions = pgTable("badge_assertions", {
  assertionId: uuid("assertion_id").primaryKey().defaultRandom(),
  badgeId: uuid("badge_id")
    .references(() => badgeClasses.badgeId)
    .notNull(),
  issuerId: uuid("issuer_id")
    .references(() => issuerProfiles.issuerId)
    .notNull(),
  recipientIdentity: text("recipient_identity").notNull(),
  recipientType: varchar("recipient_type", { length: 50 }).notNull(),
  recipientHashed: boolean("recipient_hashed").default(false).notNull(),
  issuedOn: timestamp("issued_on").defaultNow().notNull(),
  evidenceUrl: text("evidence_url"),
  revoked: boolean("revoked").default(false).notNull(),
  revocationReason: text("revocation_reason"),
  assertionJson: jsonb("assertion_json").notNull(), // Full Open Badges assertion JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Export types for use in services
export type NewBadgeClass = typeof badgeClasses.$inferInsert;
export type BadgeClass = typeof badgeClasses.$inferSelect;

export type NewBadgeAssertion = typeof badgeAssertions.$inferInsert;
export type BadgeAssertion = typeof badgeAssertions.$inferSelect;
