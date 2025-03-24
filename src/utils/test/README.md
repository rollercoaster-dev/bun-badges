# Test Database Management

This directory contains utilities for managing database connections in tests. The main issue these utilities solve is preventing "Cannot use a pool after calling end on the pool" errors that can occur in CI when multiple test files try to share the same database connection pool.

## Key Files

- `pool-manager.ts` - Core pool management system that creates isolated pools per test file
- `db-test-utils.ts` - Utilities to work with the pool manager and set up test databases

## How to Use in Tests

```typescript
// Import in your test file
import { createTestDatabaseConnection } from "@/utils/test/db-test-utils";

// Create a database connection specific to this test file
const { pool, db, cleanup, runMigrations } = createTestDatabaseConnection(
  "your-test-file-name.ts"
);

describe("Your Test Suite", () => {
  // Set up before tests
  beforeAll(async () => {
    // Run migrations if needed 
    await runMigrations();
    
    // Seed test data
    // ...
  });
  
  // Clean up after tests
  afterAll(async () => {
    // Always call cleanup to properly close the connection pool
    await cleanup();
  });
  
  // Your tests...
  test("should do something with the database", async () => {
    const result = await pool.query("SELECT 1 as test");
    expect(result.rows[0].test).toBe(1);
  });
});
```

## How It Works

The pool management system works by:

1. Creating an isolated connection pool for each test file
2. Tracking the pool's lifecycle (creation, usage, cleanup)
3. Adding safeguards to prevent using closed pools
4. Automatically cleaning up unused pools

This ensures that even if multiple test files run in parallel, they won't interfere with each other's database connections.

## Environment Variables

These utilities respect the following environment variables:

- `DATABASE_URL` - Connection string for the test database
- `USE_POOL_MANAGER` - Set to "true" to enable the pool management system
- `DB_CONNECTION_TIMEOUT` - Timeout for database connections (default: 5000ms)
- `DB_MAX_RETRIES` - Max retries for database connections (default: 5)
- `DB_RETRY_DELAY` - Delay between connection retries (default: 1000ms)

## CI Configuration

In CI environments, you should:

1. Set `USE_POOL_MANAGER=true` to enable the pool management system
2. Ensure each test gets its own isolated pool
3. Make sure tests properly clean up with `afterAll`

See the `.github/workflows/ci-tests.yml` file for an example configuration. 