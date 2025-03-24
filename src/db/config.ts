import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Default DB URL based on environment
const DEFAULT_DB_URL =
  process.env.NODE_ENV === "test"
    ? "postgres://postgres:postgres@localhost:5434/bun_badges_test"
    : "postgres://postgres:postgres@localhost:5432/bun_badges_test";

const DATABASE_URL = process.env.DATABASE_URL || DEFAULT_DB_URL;

// Create a PostgreSQL connection pool
export const dbPool = new Pool({
  connectionString: DATABASE_URL,
});

// Create a Drizzle instance with the pool and schema
export const db = drizzle(dbPool, { schema });

// Export schema for use in other files
export { schema };

export { DATABASE_URL };
