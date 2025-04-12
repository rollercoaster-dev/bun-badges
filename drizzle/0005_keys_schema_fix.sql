-- Drop the existing keys table
DROP TABLE IF EXISTS "keys";

-- Create the keys table with the correct schema
CREATE TABLE "keys" (
  "id" text PRIMARY KEY NOT NULL,
  "type" text NOT NULL,
  "algorithm" text NOT NULL,
  "public_key" text NOT NULL,
  "private_key" text,
  "name" text,
  "description" text,
  "version" text,
  "previous_key_id" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "expires_at" timestamp,
  "revoked_at" timestamp,
  "revocation_reason" text,
  "is_active" boolean NOT NULL DEFAULT true
);
