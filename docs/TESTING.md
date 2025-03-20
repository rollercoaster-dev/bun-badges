# Testing Strategy for Bun Badges

This project uses a comprehensive testing approach with both unit tests and integration tests to ensure code reliability.

## Test Types

### Unit Tests

Unit tests are focused on testing individual functions and components in isolation. They use mocks to avoid external dependencies like databases.

- **Location**: Files named `*.test.ts` (excluding `*.integration.test.ts`)
- **Run Command**: `npm run test:unit`
- **Mock Strategy**: Mocks for Drizzle ORM and database operations are provided via `src/utils/test/setup.ts`
- **Best For**: Testing pure logic, utility functions, and components without external dependencies

### Integration Tests

Integration tests check that components work together correctly. They use a real PostgreSQL database to test actual database interactions.

- **Location**: Files named `*.integration.test.ts` or in `*/integration/` directories
- **Run Command**: `npm run test:integration`
- **Database Strategy**: A Docker container with PostgreSQL is started for tests and migrations are run
- **Best For**: Testing database interactions, controllers, routes, and other components that rely on external services

## Test Organization

```
src/
├── __tests__/             # Top-level tests
│   ├── controllers/       # Controller tests
│   │   ├── integration/   # Controller integration tests
│   │   └── ...            # Regular controller unit tests
│   ├── middleware/        # Middleware tests
│   └── routes/            # Route tests
│       ├── integration/   # Route integration tests
│       └── ...            # Route unit tests
└── utils/
    └── test/              # Test utilities
        ├── db-helpers.ts  # Database helpers for seeding and cleanup
        ├── setup.ts       # Main test setup file
        └── ...            # Other test utilities
```

## Running Tests

- **Run All Tests**: `npm run test:all`
- **Run Unit Tests Only**: `npm run test:unit`
- **Run Integration Tests Only**: `npm run test:integration`

## Testing Infrastructure

### Unit Testing Setup (`src/utils/test/setup.ts`)

The unit test setup provides mocks for:
- Drizzle ORM operations (queries, filters, tables)
- Database connections and services
- Cryptographic operations for deterministic results

### Integration Testing Setup

Integration tests use:
- A real PostgreSQL database via Docker
- Real Drizzle ORM operations against this database
- Migrations to create actual tables
- Helper functions for seeding test data in `src/utils/test/db-helpers.ts`
- Deterministic cryptographic operations

#### Integration Test Flow

1. Start PostgreSQL Docker container
2. Run database migrations
3. Execute tests with database seeding before each test
4. Clean up and stop Docker container

## When to Use Integration vs. Unit Tests

### Use Integration Tests For:

- **Database-Dependent Code**: Controllers, services, or utilities that interact with the database
- **Route Handlers**: API endpoints that need to be tested with real data flow
- **Authentication Tests**: Where you need to verify token generation and validation
- **Complex Data Flows**: Tests that need to verify entire workflows across components

### Use Unit Tests For:

- **Pure Utility Functions**: Functions without external dependencies
- **Isolated Components**: Components that can be tested with mocks
- **Business Logic**: Core logic that doesn't depend on external systems
- **Edge Cases**: Testing various input combinations for specific functions

## Writing New Tests

### New Unit Tests

1. Create a file named `yourfeature.test.ts`
2. Import from `bun:test`
3. Use mocks for external dependencies

Example:

```typescript
import { describe, test, expect } from "bun:test";
import { YourUtility } from "@/utils/your-utility";

describe("YourUtility", () => {
  test("should do something", () => {
    const result = YourUtility.doSomething();
    expect(result).toBe(expectedValue);
  });
});
```

### New Integration Tests

1. Create a file named `yourfeature.integration.test.ts` or place it in an `integration/` directory
2. Import test helpers from `@/utils/test/db-helpers`
3. Use `beforeEach` to seed test data and `afterEach` to clean up

Example:

```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { YourController } from "@/controllers/your-controller";
import { seedTestData, clearTestData } from "@/utils/test/db-helpers";
import { testDb } from "@/utils/test/integration-setup";

describe("YourController Integration Tests", () => {
  beforeEach(async () => {
    await seedTestData();
  });
  
  afterEach(async () => {
    await clearTestData();
  });

  test("should interact with the database", async () => {
    const controller = new YourController();
    // Test with real database interaction
  });
});
```

## Addressing Common Issues

### Unit Test Mocking Issues

If you're trying to test database-dependent code as a unit test and experiencing mocking issues:

1. Consider converting the test to an integration test
2. Review the mocking approach in `src/utils/test/setup.ts`
3. Add additional mocks if needed, but be careful of complexity

### Integration Testing Database

Integration tests require a running PostgreSQL instance. If you encounter database connection issues:

1. Make sure Docker is running
2. Check the `docker-compose.test.yml` configuration
3. Verify that the `DATABASE_URL` environment variable is correct
4. Run migrations manually: `BUN_ENV=test npm run db:migrate`

### Cryptographic Testing

Cryptography is mocked to provide deterministic results in both unit and integration tests. This ensures that signatures and keys are consistent across test runs.
