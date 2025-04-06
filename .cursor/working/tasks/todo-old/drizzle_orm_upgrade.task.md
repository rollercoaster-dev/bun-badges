# Task: Upgrade drizzle-orm to Latest Version to Fix JSONB Type Export Issue

## Context
Currently, the app uses drizzle-orm version 0.40.0, which doesn't properly export the `jsonb` type from the pg-core module. This causes test failures when trying to import `jsonb` in schema files. The database correctly uses JSONB columns (binary-formatted JSON with indexing capabilities), but the ORM doesn't properly support importing this type.

## Problem Statement
- Tests are failing with error: `Export named 'jsonb' not found in module '/Users/joeczarnecki/Code/rollercoaster.dev/bun-badges/node_modules/drizzle-orm/pg-core/index.js'`
- We need to maintain JSONB column types for optimal performance with Open Badges 3.0 data
- The current version of drizzle-orm (0.40.0) lacks proper export for the `jsonb` type

## Solution: Upgrade drizzle-orm
Upgrading to the latest version of drizzle-orm will provide proper export of the `jsonb` type and fix the issue at its source, rather than using a temporary workaround.

## Implementation Plan

### Phase 1: Research and Preparation
- [x] Identify the root cause of the issue (missing jsonb export)
- [ ] Check the latest version of drizzle-orm for proper jsonb support
- [ ] Review release notes and breaking changes between 0.40.0 and latest version
- [ ] Create a test environment to validate the upgrade

### Phase 2: Dependency Upgrade
- [ ] Update package.json with the latest drizzle-orm version
- [ ] Also update drizzle-kit if necessary to maintain compatibility
- [ ] Run `bun install` to apply the changes
- [ ] Fix any immediate breaking changes identified

### Phase 3: Testing and Validation
- [ ] Run unit tests to verify the jsonb type is now properly exported
- [ ] Run integration tests to validate database operations still work correctly
- [ ] Run e2e tests to ensure full application functionality
- [ ] Check performance to ensure no regressions

### Phase 4: Schema Updates (if needed)
- [ ] Update schema files if the new version requires changes
- [ ] Verify that migrations still work correctly
- [ ] Check that existing JSONB columns in the database remain compatible

## Risks and Mitigation
1. **Breaking Changes**: The new version might have breaking changes that affect the codebase.
   - *Mitigation*: Review release notes carefully, create a test environment first, update incrementally
   
2. **Schema Migration Issues**: Changes to the ORM might affect schema management.
   - *Mitigation*: Test with a copy of the production database, validate migrations before deploying

3. **Performance Regression**: New version could have different performance characteristics.
   - *Mitigation*: Include performance testing in the validation phase

## Acceptance Criteria
- All tests pass successfully, including the previously failing tests
- No new errors or warnings are introduced
- JSONB columns continue to work correctly with the database
- Application functionality remains unchanged

## Time Estimate
- Research and preparation: 1-2 hours
- Dependency upgrade: 0.5-1 hour
- Testing and validation: 2-4 hours
- Schema updates (if needed): 1-2 hours
- Total: 4.5-9 hours

## Resources
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Drizzle ORM PostgreSQL Types](https://orm.drizzle.team/docs/column-types/pg)
- [PostgreSQL JSONB Documentation](https://www.postgresql.org/docs/current/datatype-json.html) 