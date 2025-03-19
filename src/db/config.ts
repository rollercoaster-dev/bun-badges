import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Set up a default database URL for testing
const DEFAULT_DATABASE_URL =
  "postgres://postgres:postgres@localhost:5432/bun_badges_test";

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
});

// Create a Drizzle instance
const db = drizzle(pool, { schema });

export { db, pool as dbPool, schema };
