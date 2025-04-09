import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  text,
} from "drizzle-orm/pg-core";
import { users } from "./index";

// Issuer profiles for credential issuance
export const issuerProfiles = pgTable("issuer_profiles", {
  issuerId: uuid("issuer_id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  url: varchar("url", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  description: varchar("description", { length: 1000 }),
  ownerUserId: uuid("owner_user_id")
    .references(() => users.userId)
    .notNull(),
  issuerJson: jsonb("issuer_json").notNull(), // Full Open Badges issuer JSON
  publicKey: jsonb("public_key"),
  signingPublicKey: text("signing_public_key"),
  encryptedPrivateKey: text("encrypted_private_key"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Export types for use in services
export type NewIssuer = typeof issuerProfiles.$inferInsert;
export type Issuer = typeof issuerProfiles.$inferSelect;
