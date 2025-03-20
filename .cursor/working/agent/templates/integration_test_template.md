# Integration Test Template

This is a recommended template for integration tests in the bun-badges project.

## File Naming
- Name files with `.integration.test.ts` suffix
- Place integration tests in `/integration/` subdirectories

## Basic Template

```typescript
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { testDb } from "@/utils/test/integration-setup";
import { seedTestData, clearTestData } from "@/utils/test/db-helpers";

// Import the components to test
import { YourController } from "@/path/to/controller";

describe("Component Name - Feature Name", () => {
  // Create test instance(s)
  const controller = new YourController();
  
  // Setup before each test
  beforeEach(async () => {
    // Ensure clean state before each test
    await seedTestData();
  });

  // Clean up after each test
  afterEach(async () => {
    await clearTestData();
  });

  test("should do something specific", async () => {
    // Arrange - setup test data
    const testData = {
      // Your test data here
    };
    
    // Act - call the function/method being tested
    const result = await controller.someMethod(testData);
    
    // Assert - verify the result
    expect(result).toBeDefined();
    expect(result.someProperty).toBe(expectedValue);
  });
  
  // Additional tests...
});
```

## Complex Template (Database Isolation)

For tests that need complete database isolation:

```typescript
import { describe, expect, test, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { createTestPool, createTestDb } from "@/utils/test/integration-setup";
import { seedTestData, clearTestData } from "@/utils/test/db-helpers";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// Import the components to test
import { YourController } from "@/path/to/controller";

describe("Component Name - Feature Name (Isolated)", () => {
  // Setup isolated database connection
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;
  const controller = new YourController();
  
  // Create isolated pool before all tests
  beforeAll(async () => {
    pool = createTestPool();
    db = createTestDb(pool);
  });
  
  // Close the pool after all tests
  afterAll(async () => {
    await pool.end();
  });
  
  // Setup before each test
  beforeEach(async () => {
    await seedTestData();
  });
  
  // Clean up after each test
  afterEach(async () => {
    await clearTestData();
  });

  test("should do something with database isolation", async () => {
    // Your test here using the isolated db
  });
  
  // Additional tests...
});
```

## API Integration Tests

For testing API endpoints:

```typescript
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { testDb } from "@/utils/test/integration-setup";
import { seedTestData, clearTestData } from "@/utils/test/db-helpers";
import { Hono } from "hono";

// Import the routes to test
import yourRoutes from "@/routes/your.routes";

describe("API Integration - Feature Name", () => {
  // Setup app and test client
  const app = new Hono();
  const apiBase = "/api";
  
  // Mount routes
  app.route(`${apiBase}/your-endpoint`, yourRoutes);
  
  // Setup before each test
  beforeEach(async () => {
    await seedTestData();
  });
  
  // Clean up after each test
  afterEach(async () => {
    await clearTestData();
  });

  test("should handle API request correctly", async () => {
    // Create request
    const req = new Request(`http://localhost${apiBase}/your-endpoint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Request body
      }),
    });
    
    // Send request
    const res = await app.fetch(req);
    
    // Verify response
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("success");
    // Additional assertions...
  });
  
  // Additional tests...
});
```

## Best Practices

1. **Use the global testDb when possible**
   - The global testDb instance is already configured and shared
   - Most tests don't need their own isolated pool

2. **Seed and clear data for each test**
   - Always ensure a clean database state before and after tests
   - Use seedTestData() and clearTestData() helpers

3. **Keep tests independent**
   - Don't rely on data created by other tests
   - Each test should set up its own test data when needed

4. **Test real database interactions**
   - Integration tests should verify actual database behavior
   - Use mocks for non-database dependencies (HTTP, crypto, etc.)

5. **Group related tests**
   - Organize tests by feature or component
   - Use nested describe blocks for better organization

6. **Descriptive test names**
   - Use "should" statements that clearly describe expected behavior
   - Name tests based on requirements, not implementation details 