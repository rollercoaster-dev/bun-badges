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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"revocation_reason" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"token_hash" text NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text NOT NULL,
	"scope" text,
	"jwt_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"revocation_reason" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"issuer_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"credential_hash" text NOT NULL,
	"data" jsonb NOT NULL,
	"proof" jsonb,
	"key_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"revocation_reason" text,
	"is_active" boolean DEFAULT true NOT NULL
);
