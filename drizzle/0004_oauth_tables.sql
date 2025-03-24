-- Migration to add OAuth-related tables

-- First create the oauth_clients table
CREATE TABLE IF NOT EXISTS "oauth_clients" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id" TEXT NOT NULL UNIQUE,
  "client_secret" TEXT NOT NULL,
  "client_name" VARCHAR(255) NOT NULL,
  "client_uri" TEXT,
  "redirect_uris" TEXT[] NOT NULL,
  "scope" TEXT NOT NULL,
  "grant_types" TEXT[] NOT NULL,
  "response_types" TEXT[] NOT NULL,
  "token_endpoint_auth_method" VARCHAR(50) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Then create the authorization_codes table that references oauth_clients
CREATE TABLE IF NOT EXISTS "authorization_codes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL UNIQUE,
  "client_id" UUID NOT NULL REFERENCES "oauth_clients"("id"),
  "user_id" TEXT NOT NULL,
  "redirect_uri" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "expires_at" TIMESTAMP NOT NULL,
  "is_used" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indices for faster lookups
CREATE INDEX idx_oauth_clients_client_id ON "oauth_clients"("client_id");
CREATE INDEX idx_authorization_codes_code ON "authorization_codes"("code");
CREATE INDEX idx_authorization_codes_client_id ON "authorization_codes"("client_id"); 