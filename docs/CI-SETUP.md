# CI Database Configuration Guide

This document explains how the CI database setup works for the Bun Badges project, especially focusing on the enhanced reliability changes made to resolve connection issues.

## Overview of Changes

We improved the database handling in CI environments to solve two main problems:

1. **Migration Issues**: Ensuring that tables are properly created before running tests
2. **Pool Connection Problems**: Preventing "Cannot use a pool after calling end" errors

The solution includes:

- Transaction-based database setup that creates all tables in one go
- Registry-based pool management to prevent premature closing of database connections
- More resilient error handling for database operations
- Sequential test execution to avoid test interference

## Key Components

### 1. CI Database Setup Script

Located at `src/utils/test/ci-database-setup.ts`, this script:

- Creates a transaction that sets up all required database tables
- Verifies the database schema after creation
- Uses more reliable raw SQL instead of ORM migrations
- Provides detailed logging for debugging

### 2. Pool Management System

Located in `src/utils/test/integration-preload.ts`, this system:

- Maintains a registry of all database pools
- Handles graceful cleanup on process exit
- Prevents pools from being closed prematurely
- Avoids the "Cannot use a pool after calling end" errors 

### 3. Resilient Test Data Cleanup

The `clearTestData()` function in `src/utils/test/db-helpers.ts` now:

- Safely handles cases where the pool might already be closed
- Uses a dedicated client connection in CI mode
- Continues gracefully when errors occur rather than crashing tests
- Properly handles transaction management

### 4. Migration Improvements

The `runMigrations()` function in `src/db/migrate.ts` now:

- Accepts a parameter to control whether the pool is closed
- Won't close the pool in test environments
- Provides better error handling

## CI Workflow Configuration

The GitHub Actions workflow in `.github/workflows/ci-tests.yml`:

- Sets up the database environment before running tests
- Uses our improved setup script to ensure reliable table creation
- Runs tests in a defined sequence to prevent interference
- Uses proper timeouts to prevent hanging tests

## Environment Variables

Important environment variables for the CI database:

- `CI=true`: Indicates we're running in CI environment
- `USE_CI_DATABASE_SETUP=true`: Enables our transaction-based setup
- `DB_POOL_PER_FILE=false`: Uses a shared pool across test files
- `SKIP_DOCKER=true`: Skips Docker container setup (uses GitHub service container)

## Troubleshooting

If you encounter database issues in CI:

1. Check the CI logs for errors in the database setup stage
2. Verify tables were created using the table list output
3. Look for "Cannot use a pool after calling end" errors which indicate premature pool closure
4. Check for transaction conflicts between parallel tests

## How to run locally

To run tests locally with the CI setup:

```bash
# Run with CI database setup enabled
CI=true USE_CI_DATABASE_SETUP=true bun test
```

This will use the same reliable database setup as the CI environment.
