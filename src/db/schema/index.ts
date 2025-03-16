import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

// Users table for authentication and profile management
export const users = pgTable('users', {
  userId: uuid('user_id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }),
  passwordHash: text('password_hash'),
  oauthProvider: varchar('oauth_provider', { length: 50 }),
  oauthSubject: varchar('oauth_subject', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// WebAuthn credentials for passwordless authentication
export const webAuthnCredentials = pgTable('webauthn_credentials', {
  credentialId: text('credential_id').primaryKey(),
  userId: uuid('user_id').references(() => users.userId).notNull(),
  publicKey: text('public_key').notNull(),
  signCount: text('sign_count').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Login tokens for email-based authentication
export const loginTokens = pgTable('login_tokens', {
  tokenId: uuid('token_id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.userId).notNull(),
  code: text('code').notNull(),
  expiresAt: timestamp('expires_at').notNull()
});

// Issuer profiles for badge issuance
export const issuerProfiles = pgTable('issuer_profiles', {
  issuerId: uuid('issuer_id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  url: text('url').notNull(),
  description: text('description'),
  email: varchar('email', { length: 255 }),
  ownerUserId: uuid('owner_user_id').references(() => users.userId).notNull(),
  issuerJson: jsonb('issuer_json').notNull(), // Full Open Badges issuer JSON
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Badge classes (badge definitions)
export const badgeClasses = pgTable('badge_classes', {
  badgeId: uuid('badge_id').primaryKey().defaultRandom(),
  issuerId: uuid('issuer_id').references(() => issuerProfiles.issuerId).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  criteria: text('criteria').notNull(),
  imageUrl: text('image_url').notNull(),
  badgeJson: jsonb('badge_json').notNull(), // Full Open Badges badge class JSON
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Badge assertions (awarded badges)
export const badgeAssertions = pgTable('badge_assertions', {
  assertionId: uuid('assertion_id').primaryKey().defaultRandom(),
  badgeId: uuid('badge_id').references(() => badgeClasses.badgeId).notNull(),
  issuerId: uuid('issuer_id').references(() => issuerProfiles.issuerId).notNull(),
  recipientType: varchar('recipient_type', { length: 50 }).notNull(),
  recipientIdentity: text('recipient_identity').notNull(),
  recipientHashed: boolean('recipient_hashed').default(true).notNull(),
  issuedOn: timestamp('issued_on').defaultNow().notNull(),
  evidenceUrl: text('evidence_url'),
  revoked: boolean('revoked').default(false).notNull(),
  revocationReason: text('revocation_reason'),
  assertionJson: jsonb('assertion_json').notNull(), // Full Open Badges assertion JSON
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}); 