# [COMPLETED] Database Migration System Debug & Test Stabilization

## Context

**Date**: April 7th, 2025  
**Status**: Completed - April 9th, 2025

We're currently blocked by issues with the database migration system. When running integration tests, we're encountering errors related to missing database columns that should have been added by migrations:

- Error message: `error: column "signing_public_key" of relation "issuer_profiles" does not exist`
- Error message: `error: column "encrypted_private_key" of relation "issuer_profiles" does not exist`

These columns appear to be defined in `drizzle/0005_worried_magus.sql` but are not present in the test database when running tests.

## Current Understanding

1. **Schema Definition**: The `issuer_profiles` table schema in `src/db/schema/issuers.ts` includes `signingPublicKey` and `encryptedPrivateKey` columns.

2. **Migration Files**: The migration file `drizzle/0005_worried_magus.sql` includes SQL to add these columns:
   ```sql
   ALTER TABLE "issuer_profiles" ADD COLUMN "signing_public_key" text;
   ALTER TABLE "issuer_profiles" ADD COLUMN "encrypted_private_key" text;
   ```

3. **Migration Process**: Our test setup appears to use Docker containers with a test database, and runs migrations via the `db:migrate` script.

4. **Migration Script**: The `tests/scripts/run-migration.js` script is called by `db:migrate` but doesn't actually apply all migrations - it only checks if tables exist.

## Investigation Plan

1. **Analyze Migration System**:
   - [x] Review how migrations are applied in development vs test environments
   - [x] Understand the role of `drizzle-kit` and our custom migration scripts
   - [x] Verify how Docker test containers are initialized

2. **Database State Validation**:
   - [x] Check if migrations are actually running in test environment (They are not)
   - [x] Examine test database schema directly
   - [x] Compare development and test database schemas

3. **Fix Strategy Options**:
   - [x] Update migration scripts to properly apply all migrations (Selected - Use existing `src/db/migrate.ts`)
   - [x] Create a pre-test hook to ensure migrations are complete (Selected - Created schema validation utility)
   - [x] Consider implementing schema validation before tests run (Completed)

## Investigation Findings

*   **`package.json` Review**: 
    *   The `db:migrate` script (`bun run tests/scripts/run-migration.js`) is misnamed. It **does not** run actual migrations; it only checks for the existence of `issuer_profiles` and `status_lists` tables.
    *   The `db:push` script (`drizzle-kit push:pg`) applies the current schema directly, bypassing the SQL migration files in `/drizzle`.
    *   The `test:integration` script uses `NODE_ENV=test` and preloads `tests/setup.ts`. It does not explicitly call any migration script.
*   **`tests/scripts/run-migration.js` Analysis**: Confirmed this script only performs basic table existence checks and does not execute any `ALTER TABLE` or other migration SQL.
*   **`tests/setup.ts` Analysis**: 
    *   This script correctly identifies integration/E2E tests requiring a database.
    *   It uses `docker-compose -f docker-compose.test.yml up -d --wait` to start the test database container.
    *   It waits for the DB connection using a retry mechanism.
    *   **Crucially, it does NOT run any migrations after the container starts.** This is the root cause of the missing columns.
*   **`src/db/migrate.ts` Analysis**: 
    *   This script **correctly** implements database migrations using `drizzle-orm/node-postgres/migrator` and targets the `./drizzle` folder containing the SQL files.
    *   It exports a `runMigrations` function suitable for programmatic use.

## Implemented Solution

We implemented a comprehensive solution with the following components:

1. **Enhanced CI Database Setup**:
   - Modified `src/utils/test/ci-database-setup.ts` to check if tables exist before trying to create them
   - Refactored with explicit existence checks for each table using PostgreSQL's information schema
   - Made all table creation operations truly idempotent with proper error handling

2. **New Schema Validation Utility**:
   - Created `src/db/schema/ensure-schema.ts` as a comprehensive schema management tool that:
     - Runs standard Drizzle migrations
     - Handles special case migrations (like evidence_url column)
     - Verifies critical columns exist in important tables
     - Provides detailed logging of schema status

3. **Updated CI Workflow**:
   - Modified `.github/workflows/ci.yml` to run both CI setup and schema validation
   - Replaced the redundant evidence URL migration script with the comprehensive validation
   - Improved workflow reliability for handling schema conflicts

4. **Added Convenience Scripts**:
   - Added `db:validate` script to package.json for easy access to schema validation

This solution follows PostgreSQL best practices by:
- Using proper versioned migrations 
- Implementing idempotent operations
- Adding explicit schema validation to catch issues early
- Maintaining compatibility between development, test, and CI environments

## Test Results

The CI workflow now successfully:
1. Sets up the base database structure with the CI setup script
2. Applies all migrations through the schema validation utility
3. Runs all tests without database-related failures

## Next Steps

- [x] Remove dependency on the legacy `tests/scripts/run-evidence-url-migration.js` script
- [ ] Monitor CI runs to ensure continued stability
- [ ] Consider consolidating database setup scripts for better maintainability

## Notes

- The solution maintains compatibility with existing development workflows
- The schema validation utility provides a solid foundation for future schema changes
- The implementation aligns with the PostgreSQL guidelines (Rule 003) by emphasizing versioned migrations and flexible schemas 