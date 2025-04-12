CREATE TABLE IF NOT EXISTS "keys" (
  "key_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "issuer_id" uuid NOT NULL,
  "type" varchar(50) NOT NULL,
  "algorithm" varchar(50) NOT NULL,
  "public_key" text NOT NULL,
  "private_key" text,
  "status" varchar(20) NOT NULL DEFAULT 'active',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp,
  "revoked_at" timestamp,
  "revocation_reason" text
);

ALTER TABLE "keys" ADD CONSTRAINT "keys_issuer_id_issuer_profiles_issuer_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "issuer_profiles"("issuer_id") ON DELETE CASCADE ON UPDATE NO ACTION;
