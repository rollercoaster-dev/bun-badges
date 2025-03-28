import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

// Users table for authentication and profile management
export const users = pgTable("users", {
  userId: uuid("user_id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }),
  passwordHash: text("password_hash"),
  oauthProvider: varchar("oauth_provider", { length: 50 }),
  oauthSubject: varchar("oauth_subject", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// WebAuthn credentials for passwordless authentication
export const webAuthnCredentials = pgTable("webauthn_credentials", {
  credentialId: text("credential_id").primaryKey(),
  userId: uuid("user_id")
    .references(() => users.userId)
    .notNull(),
  publicKey: text("public_key").notNull(),
  signCount: text("sign_count").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Login tokens for email-based authentication
export const loginTokens = pgTable("login_tokens", {
  tokenId: uuid("token_id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.userId)
    .notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Export the base modules that don't have circular dependencies
export * from "./auth";
export * from "./oauth";
export * from "./badges";
export * from "./issuers";
export * from "./status";

// Import and re-export signing last to avoid circular dependencies
import { signingKeys } from "./signing";
export { signingKeys };

// Explicitly re-export specific schemas to fix circular/export issues
import { revokedTokens } from "./auth";
// Import the correct table names from ./oauth
import { oauthAccessTokens, consentRecords, oauthRefreshTokens } from "./oauth";
import { statusLists } from "./status";
// Add the imported tables to the explicit export
export {
  revokedTokens,
  oauthAccessTokens,
  consentRecords,
  oauthRefreshTokens,
  statusLists,
};
