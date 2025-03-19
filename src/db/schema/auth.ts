import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

// Verification codes for email-based authentication
export const verificationCodes = pgTable("verification_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 255 }).notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  attempts: text("attempts").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Revoked tokens for JWT invalidation
export const revokedTokens = pgTable("revoked_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  reason: text("reason"),
  revokedAt: timestamp("revoked_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Export types for use in services
export type NewVerificationCode = typeof verificationCodes.$inferInsert;
export type NewRevokedToken = typeof revokedTokens.$inferInsert;
