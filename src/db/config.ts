import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import logger from "@utils/logger"; // Use default import for logger

// Rely solely on the DATABASE_URL environment variable
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  logger.error(
    "DATABASE_URL environment variable is not set. Application cannot connect to the database.",
  );
  // Optionally, throw an error or exit if the DB connection is critical for startup
  throw new Error("DATABASE_URL environment variable is required.");
}

// Create a PostgreSQL connection pool
export const dbPool = new Pool({
  connectionString: DATABASE_URL,
  // Consider adding pool configuration options here (e.g., max connections)
});

// Create a Drizzle instance with the pool and schema
export const db = drizzle(dbPool, { schema });

// Export schema for use in other files
export { schema };

export { DATABASE_URL };
