import { sql } from "drizzle-orm";

export async function up(db: any): Promise<void> {
  await db.execute(sql`
    ALTER TABLE issuer_profiles
    ADD COLUMN public_key jsonb;
  `);
}

export async function down(db: any): Promise<void> {
  await db.execute(sql`
    ALTER TABLE issuer_profiles
    DROP COLUMN public_key;
  `);
}
