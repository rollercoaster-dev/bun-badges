# Task: Restore Test Database in Integration Tests

## Priority: High
## Due Date: Immediate
## Assigned: Developer Team

## Description
We need to restore the proper test database connection in our integration tests instead of using mocks. The recent refactoring of the tests moved from using a real test database to using mocks, which has caused multiple test failures and doesn't properly test the integration between components.

## Prerequisites
- PostgreSQL database setup
- Test database schema and migrations
- Existing test utilities in `src/utils/test`

## Task Breakdown
- [ ] Review the original database connection setup in test files
- [ ] Examine `db-helpers.ts` to understand test data seeding and cleanup
- [ ] Remove database mocking from integration tests
- [ ] Ensure proper test data isolation between test runs
- [ ] Update assertion controller tests to use the real test database
- [ ] Fix any type errors related to database interactions
- [ ] Ensure proper cleanup after tests

## Files to Modify
- `tests/integration/integration/assertions.integration.test.ts`
- `src/utils/test/db-helpers.ts`
- `src/utils/test/assertion-test-utils.ts`
- Any other test files with db mocks

## Technical Details

### Database Connection
The test database connection should be configured to:
- Use a separate test database (not production)
- Have proper isolation between test runs
- Support seeding and cleanup operations

### Test Data Management
For proper integration tests:
1. Each test should start with a clean database state
2. Test data should be seeded before tests run
3. Test data should be cleaned up after tests complete
4. Tests should be isolated from each other

### Key Areas to Restore
1. **Database Connection**: Ensure tests use a real database connection to the test database
2. **Data Seeding**: Properly seed test data using `db-helpers.ts` utilities
3. **Data Cleanup**: Ensure proper cleanup after tests to prevent test pollution
4. **Error Handling**: Add proper error handling for database operations in tests

## Implementation Notes
- DO NOT mock the database for integration tests
- Use the existing test utilities for database operations
- Ensure tests properly clean up after themselves
- Consider using transactions for test isolation

## Acceptance Criteria
- [ ] All integration tests pass when run against the test database
- [ ] No database mocking is used in integration tests
- [ ] Test database is properly cleaned after tests run
- [ ] Test data is properly isolated between test runs
- [ ] No type errors related to database operations

## References
- Original test implementation before mocking
- Database configuration in the project
- Test utilities in `src/utils/test` 