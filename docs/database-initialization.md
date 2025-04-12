# Database Initialization

This document explains the database initialization process for the bun-badges project.

## Overview

The bun-badges project uses a standardized approach to database initialization across all environments (development, test, production). This ensures consistency and reliability when working with the database.

## Key Components

### 1. Schema Validation Utility

The core of our database initialization is the schema validation utility located at `src/db/schema/ensure-schema.ts`. This utility:

- Checks if the database exists and creates it if needed
- Runs standard migrations
- Verifies and adds special columns if needed
- Verifies other critical columns

### 2. Database Initialization Helper

We provide a convenient helper script at `scripts/db-init.ts` that wraps the schema validation utility and provides options for different environments:

```bash
# Basic usage
bun run scripts/db-init.ts

# Specify environment
bun run scripts/db-init.ts --env=development
bun run scripts/db-init.ts --env=test
bun run scripts/db-init.ts --env=production

# Enable verbose logging
bun run scripts/db-init.ts --verbose
```

### 3. NPM Scripts

Several NPM scripts are available for database operations:

```bash
# Initialize database (auto-detects environment)
bun run db:init

# Initialize for specific environment
bun run db:init:dev
bun run db:init:test
bun run db:init:prod

# Legacy scripts (use db:init instead)
bun run db:migrate
bun run db:validate
```

## Docker Integration

In Docker environments, database initialization is handled automatically:

1. The `start-dev.sh` script runs database initialization during container startup
2. Test scripts run database initialization before running tests
3. All Docker Compose files include the necessary environment variables for database connection

## Troubleshooting

If you encounter database-related issues:

1. Check that the database server is running
2. Verify that the database connection variables are set correctly
3. Run `bun run db:init --verbose` to see detailed logs
4. Check the database logs for any errors

## Best Practices

1. Always use the `db:init` script for database initialization
2. Include database initialization in your CI/CD pipelines
3. Use environment-specific configuration for different environments
4. Keep the schema validation utility up to date with schema changes
