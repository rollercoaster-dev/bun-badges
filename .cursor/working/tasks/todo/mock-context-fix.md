# Task: Fix Mock Context Query Parameter Implementation

## Problem Statement
The current mock context implementation in our test suite has issues when handling query parameters:

1. Controllers expect query parameters to be accessed as function calls: `c.req.query("page")` or as a no-argument function call to get all parameters: `c.req.query()`
2. Our mock implementation attempted to use a JavaScript Proxy to handle both property access and function calls, but it's not working correctly for all test cases
3. This is causing integration tests to fail with errors like `TypeError: c.req.query is not a function`
4. Additionally, there's an issue with database access in integration tests - `testDb` is undefined in many tests

## Current Investigation Results

1. The mock context issue was partially fixed by replacing the Proxy with a dual-purpose function in `src/utils/test/mock-context.ts`
2. However, there are still failures in some integration tests
3. There seems to be a problem with database access in many tests (`testDb` is undefined)
4. Integration tests should be using our Docker test database, but the connection isn't properly set up in all test files
5. We've created tests for the mock context implementation that confirm our fix works

## Tasks

1. **Fix the main createMockContext implementation (COMPLETED)**
   - Replace the JavaScript Proxy with a simpler dual-purpose function approach
   - Ensure function maintains all properties but can also be called as a function
   - Test with basic unit tests to verify both access patterns work

2. **Fix test database access in integration tests**
   - Investigate why `testDb` is undefined in some tests
   - Ensure proper import of `testDb` from `src/utils/test/integration-setup.ts` in all integration tests
   - Configure integration tests to use the Docker test database (postgres:postgres@localhost:5434/bun_badges_test)
   - Fix database connection pooling and ensure connections are properly managed
   - Add better error handling for database connection failures

3. **Create tests for the mock context implementation (COMPLETED)**
   - Created `src/utils/test/mock-context.test.ts` to verify our implementation
   - Tests confirm that all three access patterns work correctly:
     - Function calls: `c.req.query("page")`
     - Property access: `c.req.query.page` (using type assertion)
     - No-argument calls: `c.req.query()`
   - Tests confirm other context functionality works as expected

4. **Update individual test mocks**
   - Some tests have local mock implementations (like _createMockContext) that need to be updated
   - Identify all test files with custom mock implementations
   - Update them to be consistent with the central implementation
   - Ensure they all use the proper import paths

5. **Standardize query parameter usage in controllers**
   - Consider standardizing how controllers access query parameters (either all function calls or all property access)
   - Document the preferred approach in comments and README
   - Update any inconsistent controller code

6. **Update tests that use direct assertions**
   - Some tests may have hardcoded expectations that need updating
   - Fix any test assertion mismatches (like expecting "https://example.org" when actual is "https://test-issuer.example.com")

## Database Connection Strategy

For the Docker test database connection:

1. **Environment Configuration**
   - Ensure the DATABASE_URL environment variable is set correctly for tests
   - Default to `postgres://postgres:postgres@localhost:5434/bun_badges_test` for integration tests (UPDATED)
   - Add clear environment variable documentation in README and comments

2. **Connection Management**
   - Use a single, centralized database connection pool for all integration tests
   - Export `testDb` from `src/utils/test/integration-setup.ts` and ensure it's properly imported everywhere
   - Handle connection retries with exponential backoff for robustness
   - Add proper error handling and logging for database connection issues

3. **Test Data Management**
   - Use the `seedTestData` and `clearTestData` functions consistently
   - Ensure test data is properly isolated between test runs
   - Add consistent beforeEach/afterEach patterns across all integration tests

## Implementation Details

For the query parameter implementation, we're using a simpler approach that's now confirmed with tests:

```typescript
// Create a function that also has properties
const queryFn = function(key?: string) {
  if (key === undefined) {
    return query;
  }
  return query[key];
};

// Add all properties from query to the function
Object.assign(queryFn, query);
```

This approach:
1. Handles function calls with `c.req.query("page")` syntax
2. Handles no-argument calls with `c.req.query()` syntax
3. Allows property access with `c.req.query.param` syntax
4. Is easier to understand and maintain

## Testing Plan

1. Run unit tests with the new implementation ✅
2. Run integration tests with Docker test database connection
3. Add specific tests for the mock context itself to verify it works as expected ✅
4. Test database connection edge cases (connection failures, retries)

## Time Estimate
- Fix mock context implementation: 1 hour (COMPLETED)
- Create tests for mock context: 1 hour (COMPLETED)
- Fix database access issues: 3 hours
- Update individual test mocks: 2 hours
- Standardize query parameter usage: 2 hours
- Update tests with direct assertions: 1 hour
- Testing and verification: 2 hours

Total: ~12 hours

## Priority
HIGH - This is blocking all integration tests and should be fixed before other feature work

## Notes
- The fix should maintain backward compatibility with existing tests
- We should consider adding more robust type definitions to prevent similar issues in the future
- This is a good opportunity to improve overall test infrastructure consistency
- Docker test database should be running during integration tests (confirmed with docker ps)
- We've updated the test.env file to use port 5434 for the test database 