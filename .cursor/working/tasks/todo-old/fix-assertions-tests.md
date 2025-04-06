# Fix Assertion Controller Tests

## Priority: High
## Due Date: Immediate

## Summary
The Assertion Controller tests in `tests/integration/integration/assertions.integration.test.ts` are failing due to improper database mocking. We need to revert to using the actual test database to properly validate the integration between components.

## Step-by-Step Plan

### 1. Examine Original Test Implementation
- [x] Review how the assertion controller tests were originally set up
- [x] Identify the database seeding and cleanup patterns
- [x] Understand where and how the tests were mocking the database

### 2. Remove Database Mocks
- [ ] Remove all database mocks from the test file
- [ ] Remove mock implementations of the CredentialService and VerificationService
- [ ] Remove global.db modifications

### 3. Restore Test Database Connection
- [ ] Ensure proper database connection to the test database
- [ ] Add proper error handling for database operations

### 4. Implement Proper Test Data Management
- [ ] Set up beforeAll function to seed the database with test data:
  - [ ] Create test user
  - [ ] Create test issuer profile
  - [ ] Create test badge class
- [ ] Ensure afterAll function cleans up all test data
- [ ] Add proper error handling for test data management

### 5. Fix Test Cases
- [ ] Update createAssertion test to use real database
- [ ] Update getAssertion test to retrieve from real database
- [ ] Update revokeAssertion test to modify data in real database
- [ ] Update assertions for proper response checking

### 6. Implementation Details

#### Before/After Test Configuration
```typescript
// In beforeAll:
// 1. Clear existing test data
await db.delete(badgeAssertions).execute();
await db.delete(badgeClasses).execute();
await db.delete(issuerProfiles).execute();
await db.delete(users).where(sql`email LIKE 'test-%'`).execute();

// 2. Create test data (user, issuer, badge)
// 3. Store IDs in testData map for later use

// In afterAll:
// 1. Clean up all test data
await db.delete(badgeAssertions).execute();
await db.delete(badgeClasses).execute();
await db.delete(issuerProfiles).execute();
await db.delete(users).where(sql`email LIKE 'test-%'`).execute();
```

#### Test Case Structure
Each test should:
1. Set up test context with appropriate params/body
2. Call controller method
3. Verify response status and data
4. Store generated IDs for subsequent tests
5. Clean up any specific test data if needed

### 7. Debugging Approach
If tests are still failing after these changes:
1. Add console.log statements to see request/response data
2. Check database state before and after operations
3. Examine controller methods to ensure they're correctly interacting with the database
4. Verify test data is being properly created and is valid

## Files to Modify
- `tests/integration/integration/assertions.integration.test.ts` (primary focus)
- `src/utils/test/db-helpers.ts` (if needed for improvements)

## Test Command
Once changes are implemented, run:
```bash
bun test tests/integration/integration/assertions.integration.test.ts
```

## Acceptance Criteria
- [ ] All 5 assertion controller tests pass
- [ ] No database mocking is used
- [ ] Test data is properly created and cleaned up
- [ ] No type errors related to database operations 