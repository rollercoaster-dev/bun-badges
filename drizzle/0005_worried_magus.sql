CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"client_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"scope" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_access_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "oauth_refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"scope" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "signing_keys" (
	"key_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issuer_id" uuid NOT NULL,
	"public_key_multibase" text NOT NULL,
	"private_key_multibase" text NOT NULL,
	"controller" text NOT NULL,
	"type" text DEFAULT 'Ed25519VerificationKey2020' NOT NULL,
	"key_info" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_lists" (
	"status_list_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issuer_id" uuid NOT NULL,
	"status_list_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authorization_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"scope" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"code_challenge" text,
	"code_challenge_method" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "authorization_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "token_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oauth_token" text NOT NULL,
	"jwt_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "token_mappings_oauth_token_unique" UNIQUE("oauth_token"),
	CONSTRAINT "token_mappings_jwt_token_unique" UNIQUE("jwt_token")
);
--> statement-breakpoint
CREATE TABLE "status_list_indices" (
	"mapping_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assertion_id" uuid NOT NULL,
	"status_list_id" uuid NOT NULL,
	"status_index" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "oauth_authorization_codes" CASCADE;--> statement-breakpoint
ALTER TABLE "revoked_tokens" DROP CONSTRAINT "revoked_tokens_token_unique";--> statement-breakpoint
ALTER TABLE "revoked_tokens" ALTER COLUMN "type" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "revoked_tokens" ALTER COLUMN "username" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "verification_codes" ALTER COLUMN "code" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "verification_codes" ALTER COLUMN "username" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "verification_codes" ALTER COLUMN "attempts" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "badge_assertions" ALTER COLUMN "recipient_hashed" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "issuer_profiles" ALTER COLUMN "url" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "issuer_profiles" ALTER COLUMN "description" SET DATA TYPE varchar(1000);--> statement-breakpoint
ALTER TABLE "oauth_clients" ALTER COLUMN "client_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "oauth_clients" ALTER COLUMN "client_uri" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "oauth_clients" ALTER COLUMN "token_endpoint_auth_method" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "issuer_profiles" ADD COLUMN "public_key" jsonb;--> statement-breakpoint
ALTER TABLE "issuer_profiles" ADD COLUMN "signing_public_key" text;--> statement-breakpoint
ALTER TABLE "issuer_profiles" ADD COLUMN "encrypted_private_key" text;--> statement-breakpoint
ALTER TABLE "oauth_clients" ADD COLUMN "jwks" jsonb;--> statement-breakpoint
ALTER TABLE "oauth_clients" ADD COLUMN "jwks_uri" text;--> statement-breakpoint
ALTER TABLE "oauth_clients" ADD COLUMN "request_object_signing_alg" varchar(50);--> statement-breakpoint
ALTER TABLE "oauth_clients" ADD COLUMN "is_headless" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_client_id_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_client_id_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_client_id_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signing_keys" ADD CONSTRAINT "signing_keys_issuer_id_issuer_profiles_issuer_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."issuer_profiles"("issuer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_lists" ADD CONSTRAINT "status_lists_issuer_id_issuer_profiles_issuer_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."issuer_profiles"("issuer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorization_codes" ADD CONSTRAINT "authorization_codes_client_id_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_list_indices" ADD CONSTRAINT "status_list_indices_status_list_id_status_lists_status_list_id_fk" FOREIGN KEY ("status_list_id") REFERENCES "public"."status_lists"("status_list_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_codes" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "oauth_clients" DROP COLUMN "tos_uri";--> statement-breakpoint
ALTER TABLE "oauth_clients" DROP COLUMN "policy_uri";--> statement-breakpoint
ALTER TABLE "oauth_clients" DROP COLUMN "software_id";--> statement-breakpoint
ALTER TABLE "oauth_clients" DROP COLUMN "software_version";--> statement-breakpoint
ALTER TABLE "oauth_clients" DROP COLUMN "contacts";