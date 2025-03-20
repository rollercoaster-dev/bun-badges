# Integration Test Migration Template

This template provides a step-by-step guide for converting a unit test with database mocks to a proper integration test that uses a real database connection.

## 1. Identify Tests for Migration

Tests that should be migrated to integration tests are those that:

- Test database-dependent functionality (repositories, services with DB access)
- Need to verify complex data interactions that are difficult to mock accurately
- Test code that relies on database-specific features (PostgreSQL functions, etc.)
- Validate database query performance or behavior
- Test scenarios where the data integrity across tables matters

## 2. File Renaming and Location

When migrating a test:

1. Rename the file from `feature.test.ts` to `feature.integration.test.ts`
2. OR move the file to an `/integration/` subdirectory

Example:
```
# Before
src/services/__tests__/badge.test.ts

# After - Option 1
src/services/__tests__/badge.integration.test.ts

# After - Option 2
src/services/__tests__/integration/badge.test.ts
```

## 3. Import Changes

Update imports to use integration test setup instead of unit test mocks:

```typescript
// BEFORE - Unit test
import { describe, test, expect, mock } from "bun:test";
// OR
import "../../../utils/test/unit-setup";

// AFTER - Integration test
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { testDb, seedTestData, clearTestData } from "@/utils/test/db-helpers";
// OR
import "@/utils/test/integration-setup";
```

## 4. Database Setup and Cleanup

Add proper setup and cleanup for each test:

```typescript
describe("Feature integration tests", () => {
  // Option 1: Use global setup from integration-setup.ts
  
  // Option 2: Add test-specific setup/teardown
  beforeEach(async () => {
    await seedTestData();
    // Add any additional test-specific data
  });
  
  afterEach(async () => {
    await clearTestData();
  });
  
  test("should do something with real DB", async () => {
    // Test using real DB interactions
  });
});
```

## 5. Replace Mock Usage with Real Interactions

Find and replace mock-based code with real database interactions:

```typescript
// BEFORE - Mock approach
// With mock interactions like:
mock.module("@/db/config", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => Promise.resolve([mockData]) }) })
  }
}));

// AFTER - Real DB interaction
const results = await testDb
  .select()
  .from(table)
  .where(eq(table.id, id));
```

## 6. Update Assertions

Update assertions to match real database behavior:

```typescript
// BEFORE - Simple mock assertions
expect(result).toEqual(mockData);

// AFTER - More robust assertions that account for DB nuances
expect(result).toHaveLength(1);
expect(result[0].id).toEqual(expectedId);
expect(result[0].createdAt).toBeInstanceOf(Date);
```

## 7. Test Updates to Verify Run Mode

If the test conditionally behaves differently in integration mode:

```typescript
// Check if we're running in integration test mode
const isIntegrationTest = process.argv.some(
  (arg) => arg.includes("integration") || arg.includes("tests/integration")
);

// Skip tests that should only run in one mode
if (!isIntegrationTest) {
  console.log("Skipping test: This test requires a real database connection");
  return;
}
```

## 8. Example Integration Test

Here's a complete example of a migrated test:

```typescript
// badge.integration.test.ts
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { testDb, seedTestData, clearTestData, TestData } from "@/utils/test/db-helpers";
import { eq } from "drizzle-orm";
import { badgeClasses } from "@/db/schema";
import { BadgeService } from "@/services/badge.service";

describe("BadgeService Integration Tests", () => {
  let testData: TestData;
  let badgeService: BadgeService;
  
  beforeEach(async () => {
    // Seed the database with test data
    testData = await seedTestData();
    badgeService = new BadgeService();
  });
  
  afterEach(async () => {
    // Clean up the database after each test
    await clearTestData();
  });
  
  test("should retrieve badge by ID", async () => {
    // Use the real database to perform the test
    const result = await badgeService.getBadgeById(testData.badge.badgeId);
    
    // Assert using the actual data from the test database
    expect(result).not.toBeNull();
    expect(result?.badgeId).toEqual(testData.badge.badgeId);
    expect(result?.name).toEqual("Test Badge");
    expect(result?.issuerId).toEqual(testData.issuer.issuerId);
  });
  
  test("should create a new badge", async () => {
    // Test data for creating a new badge
    const newBadgeData = {
      name: "New Test Badge",
      description: "A new test badge for integration tests",
      imageUrl: "https://example.com/new-badge.png",
      issuerId: testData.issuer.issuerId,
      criteria: "New test criteria"
    };
    
    // Create the badge using the service
    const createdBadge = await badgeService.createBadge(newBadgeData);
    
    // Verify it was actually created in the database
    const dbBadge = await testDb.select()
      .from(badgeClasses)
      .where(eq(badgeClasses.badgeId, createdBadge.badgeId))
      .limit(1);
    
    // Assert both the returned object and the database entry
    expect(createdBadge.name).toEqual(newBadgeData.name);
    expect(dbBadge[0].name).toEqual(newBadgeData.name);
    expect(dbBadge[0].description).toEqual(newBadgeData.description);
  });
});
```

## 9. Common Challenges and Solutions

### Challenge: Test Data Dependencies

When tests depend on specific data relationships:

```typescript
// Create related test data in the correct order
const ownerUser = await createTestUser("owner@example.com");
const issuer = await createTestIssuer({ ownerUserId: ownerUser.userId });
const badge = await createTestBadge({ issuerId: issuer.issuerId });
```

### Challenge: Transaction Management

For tests that need transaction isolation:

```typescript
// Using a transaction in tests
const tx = db.transaction(async (trx) => {
  const result = await someOperationWithTransaction(trx);
  // Test assertions here
  return result;
});
await tx; // Wait for transaction to complete
```

### Challenge: Async Timing Issues

For tests with timing dependencies:

```typescript
// Helper for timeout
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// In test
await someAsyncOperation();
await wait(100); // Wait for DB operations to settle
const result = await checkResult();
```

## 10. Integration Test Checklist

Before committing migrated tests, verify:

- [ ] Test file is properly named with `.integration.test.ts` suffix or in proper directory
- [ ] All DB mocks have been removed
- [ ] Test uses proper DB setup and cleanup
- [ ] Test passes consistently with real database
- [ ] Test doesn't leave lingering data that affects other tests
- [ ] Assertions are appropriately updated for real DB behavior
- [ ] All TypeScript errors are fixed