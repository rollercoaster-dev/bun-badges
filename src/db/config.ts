import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/auth";

// In production, these should be loaded from environment variables
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/bun_badges";

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
});

// Create a Drizzle instance
export const db = drizzle(pool, { schema });

// Export the pool for use in migrations and cleanup
export const dbPool = pool;
