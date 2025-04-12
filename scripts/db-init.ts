#!/usr/bin/env bun
/**
 * Database Initialization Helper
 *
 * This script provides a unified interface for initializing the database
 * across different environments (development, test, production).
 *
 * Usage:
 *   bun run scripts/db-init.ts [--env=<environment>] [--verbose] [--help]
 *
 * Options:
 *   --env=<environment>  Specify the environment (development, test, production)
 *   --verbose            Enable verbose logging
 *   --help               Show this help message
 *
 * Examples:
 *   bun run scripts/db-init.ts --env=development
 *   bun run scripts/db-init.ts --env=test --verbose
 */

import arg from "arg";
import { ensureSchemaComplete } from "../src/db/schema/ensure-schema";
import * as dotenv from "dotenv";
import * as path from "path";
import logger from "../src/utils/logger";

// Parse command line arguments
const args = arg({
  "--env": String,
  "--verbose": Boolean,
  "--help": Boolean,

  // Aliases
  "-e": "--env",
  "-v": "--verbose",
  "-h": "--help",
});

// Show help if requested
if (args["--help"]) {
  console.log(`
Database Initialization Helper

This script provides a unified interface for initializing the database
across different environments (development, test, production).

Usage:
  bun run scripts/db-init.ts [--env=<environment>] [--verbose] [--help]

Options:
  --env=<environment>  Specify the environment (development, test, production)
  --verbose            Enable verbose logging
  --help               Show this help message

Examples:
  bun run scripts/db-init.ts --env=development
  bun run scripts/db-init.ts --env=test --verbose
  `);
  process.exit(0);
}

// Set log level based on verbose flag
if (args["--verbose"]) {
  process.env.LOG_LEVEL = "debug";
} else {
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || "info";
}

// Determine environment
const env = args["--env"] || process.env.NODE_ENV || "development";

// Load environment-specific .env file
if (env === "development") {
  dotenv.config({
    path: path.resolve(process.cwd(), ".env.development"),
    override: true,
  });
} else if (env === "test") {
  dotenv.config({
    path: path.resolve(process.cwd(), ".env.test"),
    override: true,
  });
} else if (env === "production") {
  dotenv.config({
    path: path.resolve(process.cwd(), ".env.production"),
    override: true,
  });
} else {
  // In other environments, load from .env file if it exists
  dotenv.config();
}

// Create a logger instance
const baseLogger = logger.child({ context: "db-init" });

// Run the database initialization
async function initializeDatabase() {
  try {
    baseLogger.info(`Initializing database for ${env} environment`);

    // Run the schema validation
    await ensureSchemaComplete(true);

    baseLogger.info(
      `Database initialization completed successfully for ${env} environment`,
    );
    process.exit(0);
  } catch (error) {
    baseLogger.error(
      { err: error },
      `Database initialization failed for ${env} environment`,
    );
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase();
