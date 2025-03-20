import { sql } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../schema";

export async function up(db: NodePgDatabase<typeof schema>): Promise<void> {
  await db.execute(sql`
    ALTER TABLE issuer_profiles
    ADD COLUMN public_key jsonb;
  `);
}

export async function down(db: NodePgDatabase<typeof schema>): Promise<void> {
  await db.execute(sql`
    ALTER TABLE issuer_profiles
    DROP COLUMN public_key;
  `);
}
