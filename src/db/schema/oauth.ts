import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

// OAuth clients for application registration
export const oauthClients = pgTable("oauth_clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: text("client_id").notNull().unique(),
  clientSecret: text("client_secret").notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientUri: text("client_uri"),
  logoUri: text("logo_uri"),
  redirectUris: text("redirect_uris").array().notNull(),
  scope: text("scope").notNull(),
  grantTypes: text("grant_types").array().notNull(),
  responseTypes: text("response_types").array().notNull(),
  tokenEndpointAuthMethod: varchar("token_endpoint_auth_method", {
    length: 50,
  }).notNull(),
  jwks: jsonb("jwks"),
  jwksUri: text("jwks_uri"),
  requestObjectSigningAlg: varchar("request_object_signing_alg", {
    length: 50,
  }),
  isActive: boolean("is_active").default(true).notNull(),
  isHeadless: boolean("is_headless").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Authorization codes for OAuth flow
export const authorizationCodes = pgTable("authorization_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  clientId: uuid("client_id")
    .references(() => oauthClients.id)
    .notNull(),
  userId: text("user_id").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  scope: text("scope").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
  // PKCE support fields
  codeChallenge: text("code_challenge"),
  codeChallengeMethod: varchar("code_challenge_method", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Access tokens for OAuth
export const oauthAccessTokens = pgTable("oauth_access_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(),
  clientId: uuid("client_id")
    .references(() => oauthClients.id)
    .notNull(),
  userId: text("user_id").notNull(),
  scope: text("scope").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isRevoked: boolean("is_revoked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Refresh tokens for OAuth
export const oauthRefreshTokens = pgTable("oauth_refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(),
  clientId: uuid("client_id")
    .references(() => oauthClients.id)
    .notNull(),
  userId: text("user_id").notNull(),
  scope: text("scope").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isRevoked: boolean("is_revoked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Token mappings between OAuth and JWT tokens
export const tokenMappings = pgTable("token_mappings", {
  id: uuid("id").primaryKey().defaultRandom(),
  oauthToken: text("oauth_token").notNull().unique(),
  jwtToken: text("jwt_token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Programmatic consent records
export const consentRecords = pgTable("consent_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  clientId: uuid("client_id")
    .references(() => oauthClients.id)
    .notNull(),
  scope: text("scope").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Export types for use in services
export type NewOAuthClient = typeof oauthClients.$inferInsert;
export type NewAuthorizationCode = typeof authorizationCodes.$inferInsert;
export type NewOAuthAccessToken = typeof oauthAccessTokens.$inferInsert;
export type NewOAuthRefreshToken = typeof oauthRefreshTokens.$inferInsert;
export type NewTokenMapping = typeof tokenMappings.$inferInsert;
export type NewConsentRecord = typeof consentRecords.$inferInsert;
