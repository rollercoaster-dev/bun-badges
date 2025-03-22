# Fix Database Integration Errors

## Priority: High
## Due Date: Immediate

## Current Issues
1. **dbPool.query errors** in issuer controller tests
2. **Database uniqueness constraint violations** causing test failures
3. **404 errors** in route integration tests
4. **Assertion errors** in credential service tests

## Root Causes
1. Improper test data cleanup between test runs
2. Missing environment variables or configuration for test database
3. Attempting to mock database operations instead of using the test database
4. Issues with database connection pool management in tests

## Action Plan

### Step 1: Fix Test Database Connection
- [ ] Check database connection string and configuration
- [ ] Verify environment variables are set correctly for tests
- [ ] Ensure database pool is properly initialized and closed in tests
- [ ] Add proper error handling for database connections

```typescript
// Proper database connection setup for tests
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/badges_test';

// Create pool with proper error handling
const pool = new Pool({
  connectionString: TEST_DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

// Listen for errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});
```

### Step 2: Fix dbPool.query Errors
- [ ] Update db-helpers.ts to handle test mode properly
- [ ] Ensure clearTestData function works correctly
- [ ] Add transaction support for better test isolation

```typescript
// Updated clearTestData function
export async function clearTestData() {
  try {
    // Use transaction for consistency
    await db.transaction(async (tx) => {
      // Delete in reverse dependency order
      await tx.delete(badgeAssertions).execute();
      await tx.delete(badgeClasses).execute();
      await tx.delete(issuerProfiles).execute();
      await tx.delete(users).where(sql`email LIKE 'test-%'`).execute();
    });
    console.log('Test data cleanup successful');
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    throw error;
  }
}
```

### Step 3: Fix Uniqueness Constraint Violations
- [ ] Ensure each test uses unique identifiers
- [ ] Add proper cleanup between test runs
- [ ] Use random identifiers for test data

```typescript
// Using random identifiers for test data
const testEmail = `test-${nanoid(8)}@example.com`;
const testName = `Test User ${nanoid(4)}`;
```

### Step 4: Fix 404 Errors in Route Tests
- [ ] Check route definitions match test expectations
- [ ] Verify URL parameters in test requests
- [ ] Ensure controllers are properly registered with the server

### Step 5: Fix Assertion Controller Tests
- [ ] Restore test database connection (remove mocks)
- [ ] Update test assertions to match controller behavior
- [ ] Fix credential service integration

### Debugging Approach
When fixing errors:
1. Add `console.log` statements to see what's happening
2. Check database state before and after operations
3. Verify error messages for root cause analysis
4. Test each component separately before integration
5. Use SQL logging for complex queries

## Sample Test Implementation

```typescript
describe("Integration Test", () => {
  // Setup test data
  beforeAll(async () => {
    try {
      // Clean existing data
      await clearTestData();
      
      // Create fresh test data with unique identifiers
      const uniqueEmail = `test-${nanoid(8)}@example.com`;
      const userId = crypto.randomUUID();
      
      await db.insert(users).values({
        userId,
        email: uniqueEmail,
        name: "Test User",
      }).execute();
      
      // Store for tests
      testData.set("userId", userId);
      testData.set("email", uniqueEmail);
      
      // Log success
      console.log("Test setup complete with user:", userId);
    } catch (error) {
      console.error("Test setup failed:", error);
      throw error;
    }
  });
  
  // Clean up after tests
  afterAll(async () => {
    try {
      await clearTestData();
    } catch (error) {
      console.error("Test cleanup failed:", error);
    }
  });
  
  // Test cases...
});
```

## Expected Outcomes
- [ ] All database-related errors in tests are resolved
- [ ] Tests run consistently without uniqueness violations
- [ ] Route tests find the correct endpoints
- [ ] Assertion controller tests work with real database operations

## Test Validation
After making changes, run tests in this order:
1. Individual controller tests in isolation
2. Full integration test suite
3. End-to-end tests with API 