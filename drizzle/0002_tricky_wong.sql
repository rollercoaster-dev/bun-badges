CREATE TABLE "oauth_authorization_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"scope" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"code_challenge" text,
	"code_challenge_method" varchar(6),
	"state" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	CONSTRAINT "oauth_authorization_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "oauth_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text NOT NULL,
	"client_name" text NOT NULL,
	"client_uri" text NOT NULL,
	"logo_uri" text,
	"tos_uri" text,
	"policy_uri" text,
	"software_id" text,
	"software_version" text,
	"redirect_uris" text[] NOT NULL,
	"token_endpoint_auth_method" varchar(32) NOT NULL,
	"grant_types" text[] NOT NULL,
	"response_types" text[] NOT NULL,
	"scope" text NOT NULL,
	"contacts" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "oauth_clients_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_client_id_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("id") ON DELETE no action ON UPDATE no action;