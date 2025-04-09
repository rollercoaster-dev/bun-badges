/**
 * Keys Schema
 *
 * This module defines the database schema for cryptographic keys used in the application.
 * Keys are used for signing and verifying credentials, tokens, and other security-related operations.
 */

import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

/**
 * Keys table schema
 */
export const keys = pgTable("keys", {
  // Primary key (CUID)
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),

  // Key type (signing, verification)
  type: text("type").notNull(),

  // Key algorithm (RS256, ES256, EdDSA)
  algorithm: text("algorithm").notNull(),

  // Public key (PEM format)
  publicKey: text("public_key").notNull(),

  // Private key (PEM format, encrypted)
  privateKey: text("private_key"),

  // Key name (for identification)
  name: text("name"),

  // Key description
  description: text("description"),

  // Key version (for rotation)
  version: text("version"),

  // Previous key ID (for rotation)
  previousKeyId: text("previous_key_id"),

  // Creation timestamp
  createdAt: timestamp("created_at").notNull().defaultNow(),

  // Expiration timestamp
  expiresAt: timestamp("expires_at"),

  // Revocation timestamp
  revokedAt: timestamp("revoked_at"),

  // Revocation reason
  revocationReason: text("revocation_reason"),

  // Is the key active
  isActive: boolean("is_active").notNull().default(true),
});
