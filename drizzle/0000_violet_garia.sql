CREATE TABLE "badge_assertions" (
	"assertion_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"badge_id" uuid NOT NULL,
	"issuer_id" uuid NOT NULL,
	"recipient_type" varchar(50) NOT NULL,
	"recipient_identity" text NOT NULL,
	"recipient_hashed" boolean DEFAULT true NOT NULL,
	"issued_on" timestamp DEFAULT now() NOT NULL,
	"evidence_url" text,
	"revoked" boolean DEFAULT false NOT NULL,
	"revocation_reason" text,
	"assertion_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badge_classes" (
	"badge_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issuer_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"criteria" text NOT NULL,
	"image_url" text NOT NULL,
	"badge_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issuer_profiles" (
	"issuer_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"email" varchar(255),
	"owner_user_id" uuid NOT NULL,
	"issuer_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_tokens" (
	"token_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"password_hash" text,
	"oauth_provider" varchar(50),
	"oauth_subject" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webauthn_credentials" (
	"credential_id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"public_key" text NOT NULL,
	"sign_count" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "badge_assertions" ADD CONSTRAINT "badge_assertions_badge_id_badge_classes_badge_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badge_classes"("badge_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_assertions" ADD CONSTRAINT "badge_assertions_issuer_id_issuer_profiles_issuer_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."issuer_profiles"("issuer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_classes" ADD CONSTRAINT "badge_classes_issuer_id_issuer_profiles_issuer_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."issuer_profiles"("issuer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuer_profiles" ADD CONSTRAINT "issuer_profiles_owner_user_id_users_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_tokens" ADD CONSTRAINT "login_tokens_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;