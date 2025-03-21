import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

// Signing keys for digital signatures
export const signingKeys = pgTable("signing_keys", {
  keyId: uuid("key_id").primaryKey().defaultRandom(),
  issuerId: uuid("issuer_id")
    // Using any is necessary due to circular dependency issues in Drizzle ORM
    // This is documented in Drizzle issues: https://github.com/drizzle-team/drizzle-orm/issues/638
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .references((): any => ({ table: "issuer_profiles", column: "issuer_id" }))
    .notNull(),
  publicKeyMultibase: text("public_key_multibase").notNull(), // Base58-encoded public key
  privateKeyMultibase: text("private_key_multibase").notNull(), // Base58-encoded private key
  controller: text("controller").notNull(), // DID of the key controller
  type: varchar("type", { length: 50 })
    .notNull()
    .default("Ed25519VerificationKey2020"),
  keyInfo: jsonb("key_info").notNull(), // Public key information in JSON-LD format
  revoked: boolean("revoked").default(false).notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Export types for use in services
export type NewSigningKey = typeof signingKeys.$inferInsert;
