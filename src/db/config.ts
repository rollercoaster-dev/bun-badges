import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Default to test database URL for testing
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/bun_badges_test";

// Create a PostgreSQL connection pool
export const dbPool = new Pool({
  connectionString: DATABASE_URL,
});

// Create a Drizzle instance with the pool and schema
export const db = drizzle(dbPool, { schema });

// Export schema for use in other files
export { schema };
