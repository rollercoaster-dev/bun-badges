import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  json,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "./index";

// Issuer profiles for credential issuance
export const issuerProfiles = pgTable("issuer_profiles", {
  issuerId: uuid("issuer_id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  url: varchar("url", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  description: varchar("description", { length: 1000 }),
  verified: boolean("verified").default(false),
  ownerUserId: uuid("owner_user_id")
    .references(() => users.userId)
    .notNull(),
  issuerJson: json("issuer_json").notNull(), // Full Open Badges issuer JSON
  publicKey: json("public_key"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Export types for use in services
export type NewIssuer = typeof issuerProfiles.$inferInsert;
export type Issuer = typeof issuerProfiles.$inferSelect;
