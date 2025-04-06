# Database Migration System Debug

## Context

**Date**: April 7th, 2025
**Status**: Blocked

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
   - [ ] Review how migrations are applied in development vs test environments
   - [ ] Understand the role of `drizzle-kit` and our custom migration scripts
   - [ ] Verify how Docker test containers are initialized

2. **Database State Validation**:
   - [ ] Check if migrations are actually running in test environment
   - [ ] Examine test database schema directly
   - [ ] Compare development and test database schemas

3. **Fix Strategy Options**:
   - [ ] Update migration scripts to properly apply all migrations
   - [ ] Create a pre-test hook to ensure migrations are complete
   - [ ] Consider implementing schema validation before tests run

## Next Steps

1. Run tests with DEBUG=true to gather more information about database initialization
2. Connect directly to test database to inspect schema
3. Review Docker-compose and test setup scripts to understand database initialization process

## Notes

- All changes were reverted to maintain a stable codebase
- Integration tests will continue to fail until this is resolved
- This might also affect future migrations if not properly addressed 