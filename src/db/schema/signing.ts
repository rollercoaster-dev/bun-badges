import { pgTable, uuid, text, timestamp, json } from "drizzle-orm/pg-core";
import { issuerProfiles } from "./issuers";

// Signing keys for credential issuance
export const signingKeys = pgTable("signing_keys", {
  keyId: uuid("key_id").primaryKey().defaultRandom(),
  issuerId: uuid("issuer_id")
    .references(() => issuerProfiles.issuerId)
    .notNull(),
  publicKeyMultibase: text("public_key_multibase").notNull(),
  privateKeyMultibase: text("private_key_multibase").notNull(),
  controller: text("controller").notNull(),
  type: text("type").notNull().default("Ed25519VerificationKey2020"),
  keyInfo: json("key_info").notNull(), // Public key information in JSON-LD format
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Export types for use in services
export type NewSigningKey = typeof signingKeys.$inferInsert;
export type SigningKey = typeof signingKeys.$inferSelect;
