# Integration Test Overhaul

## Priority: High
## Due Date: This Week
## Assignees: Developer Team

## Background
Our integration tests were originally designed to use a real test database, but recent refactoring introduced database mocking which has led to test failures and incomplete testing. This plan outlines how to restore proper integration testing across all test suites.

## Objectives
1. Restore all integration tests to use the real test database
2. Ensure proper test isolation between test runs
3. Standardize test data management approach
4. Fix all failing integration tests

## Test Database Requirements
- PostgreSQL database (isolated from production)
- Test database should be created before tests run
- Schema migrations should be applied before tests run
- Test data should be isolated between test runs

## Implementation Plan

### Phase 1: Database Infrastructure (1 day)
- [ ] Review current test database configuration
- [ ] Create a dedicated test database setup script
- [ ] Update DB connection utilities to support test environment
- [ ] Implement improved error handling for database connections
- [ ] Update schema migrations to support test database

### Phase 2: Test Utilities (1 day)
- [ ] Enhance db-helpers.ts to provide better test data management
- [ ] Create standardized test data seeding functions
- [ ] Improve test data cleanup to prevent test pollution
- [ ] Implement transaction support for test isolation
- [ ] Add debugging utilities for database state inspection

### Phase 3: Assertion Controller Tests (1 day)
- [ ] Remove database mocks from assertion controller tests
- [ ] Restore proper test data seeding and cleanup
- [ ] Fix test expectations to match actual controller behavior
- [ ] Update test structure to follow best practices
- [ ] Add proper error handling and debugging

### Phase 4: Verification Controller Tests (1 day)
- [ ] Remove database mocks from verification controller tests
- [ ] Standardize test data management approach
- [ ] Improve test isolation
- [ ] Fix verification logic and credential validation

### Phase 5: Issuer Controller Tests (1 day)
- [ ] Fix dbPool.query errors in issuer controller tests
- [ ] Standardize database operations
- [ ] Ensure proper cleanup of test data
- [ ] Update test expectations to match controller behavior

### Phase 6: Route Integration Tests (1 day)
- [ ] Fix 404 errors in route integration tests
- [ ] Update route handling and URL parameters
- [ ] Ensure proper request validation
- [ ] Update expectations to match API contract

## Standardized Test Structure
All integration tests should follow this structure:

```typescript
describe('Controller Integration Tests', () => {
  // Test data storage
  const testData = new Map<string, string>();

  // Setup before all tests
  beforeAll(async () => {
    try {
      // Clean existing test data
      await clearTestData();
      
      // Create fresh test data
      const { userId, issuerId, badgeId } = await seedTestData();
      
      // Store for use in tests
      testData.set('userId', userId);
      testData.set('issuerId', issuerId);
      testData.set('badgeId', badgeId);
    } catch (error) {
      console.error('Setup error:', error);
      throw error;
    }
  });

  // Cleanup after all tests
  afterAll(async () => {
    try {
      await clearTestData();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  // Individual tests
  test('should perform operation', async () => {
    // Setup test context
    const ctx = createMockContext({...});
    
    // Execute controller method
    const result = await controller.method(ctx);
    
    // Parse and verify response
    const data = await result.json();
    expect(data.status).toBe('success');
    // Additional assertions...
  });
});
```

## Test Data Management
- Each test should start with a clean state
- Test data should be created as needed
- IDs should be stored for reference in later tests
- All test data should be cleaned up after tests run
- Use unique identifiers for test data to prevent conflicts

## Debugging Guidelines
If tests are failing:
1. Check database connection and configuration
2. Verify test data is properly created
3. Examine controller methods and database operations
4. Check response structure and status codes
5. Add console.log statements for request/response data
6. Verify database state before and after operations

## Success Criteria
- [ ] All integration tests pass
- [ ] No database mocks in integration tests
- [ ] Proper test data management
- [ ] Test isolation between runs
- [ ] No type errors related to database operations
- [ ] Clear error messages for test failures

## Risk Mitigation
- Create database snapshots before major changes
- Run tests in isolation to identify specific failures
- Commit frequently with descriptive messages
- Document any workarounds or special handling 