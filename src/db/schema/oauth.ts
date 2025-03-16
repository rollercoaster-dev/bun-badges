import { pgTable, text, varchar, timestamp, uuid, boolean, jsonb } from 'drizzle-orm/pg-core';

// OAuth Client Registration
export const oauthClients = pgTable('oauth_clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: text('client_id').notNull().unique(), // Generated during registration
  clientSecret: text('client_secret').notNull(), // Hashed secret
  clientName: text('client_name').notNull(),
  clientUri: text('client_uri').notNull(),
  logoUri: text('logo_uri'),
  tosUri: text('tos_uri'),
  policyUri: text('policy_uri'),
  softwareId: text('software_id'),
  softwareVersion: text('software_version'),
  redirectUris: text('redirect_uris').array().notNull(),
  tokenEndpointAuthMethod: varchar('token_endpoint_auth_method', { length: 32 }).notNull(),
  grantTypes: text('grant_types').array().notNull(),
  responseTypes: text('response_types').array().notNull(),
  scope: text('scope').notNull(),
  contacts: text('contacts').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

// OAuth Authorization Codes
export const authorizationCodes = pgTable('oauth_authorization_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  clientId: uuid('client_id').notNull().references(() => oauthClients.id),
  userId: text('user_id').notNull(), // References the username
  scope: text('scope').notNull(),
  redirectUri: text('redirect_uri').notNull(),
  codeChallenge: text('code_challenge'), // For PKCE
  codeChallengeMethod: varchar('code_challenge_method', { length: 6 }), // 'S256' or 'plain'
  state: text('state'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  isUsed: boolean('is_used').default(false).notNull(),
});

// Types for Drizzle
export type OAuthClient = typeof oauthClients.$inferSelect;
export type NewOAuthClient = typeof oauthClients.$inferInsert;
export type AuthorizationCode = typeof authorizationCodes.$inferSelect;
export type NewAuthorizationCode = typeof authorizationCodes.$inferInsert; 