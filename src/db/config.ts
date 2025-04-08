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

// Extract credentials from environment variables or DATABASE_URL
const dbUser = process.env.DB_USER || process.env.POSTGRES_USER || "postgres";
const dbPassword =
  process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || "postgres";
const dbHost = process.env.DB_HOST || "localhost";
const dbPort = process.env.DB_PORT || "5432";

// Get database name and sanitize it to prevent SQL injection
let dbName =
  process.env.DB_NAME || process.env.POSTGRES_DB || "bun_badges_test";
// Remove any characters that aren't alphanumeric or underscores
dbName = dbName.replace(/[^a-zA-Z0-9_]/g, "_");

// Log the sanitized database name
logger.info(`Using sanitized database name: '${dbName}'`);

// Create a PostgreSQL connection pool with explicit credentials
export const dbPool = new Pool({
  connectionString: DATABASE_URL,
  user: dbUser,
  password: dbPassword,
  host: dbHost,
  port: parseInt(dbPort),
  database: dbName,
  // Consider adding pool configuration options here (e.g., max connections, connectionTimeoutMillis)
});

// Add listener for pool errors
dbPool.on("error", (err, _client) => {
  logger.error("Unexpected error on idle client", err);
  // Depending on the severity, you might want to implement more robust handling
  // like attempting to reconnect or shutting down gracefully.
});

// Create a Drizzle instance with the pool and schema
export const db = drizzle(dbPool, { schema });

// Export schema for use in other files
export { schema };

export { DATABASE_URL };
