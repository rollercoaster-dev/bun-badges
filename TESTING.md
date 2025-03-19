# Testing Strategy for Bun Badges

This project uses a comprehensive testing approach with both unit tests and integration tests to ensure code reliability.

## Test Types

### Unit Tests

Unit tests are focused on testing individual functions and components in isolation. They use mocks to avoid external dependencies like databases.

- **Location**: Files named `*.test.ts` (excluding `*.integration.test.ts`)
- **Run Command**: `npm run test:unit`
- **Mock Strategy**: Mocks for Drizzle ORM and database operations are provided via `src/utils/test/setup.ts`

### Integration Tests

Integration tests check that components work together correctly. They use a real PostgreSQL database to test actual database interactions.

- **Location**: Files named `*.integration.test.ts`
- **Run Command**: `npm run test:integration`
- **Database Strategy**: A Docker container with PostgreSQL is started for tests and migrations are run

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
- Deterministic cryptographic operations

#### Integration Test Flow

1. Start PostgreSQL Docker container
2. Run database migrations
3. Execute tests with `integration-preload.ts` (no Drizzle mocks)
4. Clean up and stop Docker container

## Writing New Tests

### New Unit Tests

1. Create a file named `yourfeature.test.ts`
2. Import from `bun:test`
3. Use mocks for external dependencies

Example:

```typescript
import { describe, test, expect } from "bun:test";
import { YourService } from "@/services/your.service";

describe("YourService", () => {
  test("should do something", () => {
    const service = new YourService();
    const result = service.doSomething();
    expect(result).toBe(expectedValue);
  });
});
```

### New Integration Tests

1. Create a file named `yourfeature.integration.test.ts`
2. Import `testDb` from `@/utils/test/integration-setup`
3. Use real database operations

Example:

```typescript
import { describe, test, expect } from "bun:test";
import { YourService } from "@/services/your.service";
import { testDb } from "@/utils/test/integration-setup";
import { yourTable } from "@/db/schema/your-schema";

describe("YourService Integration Tests", () => {
  test("should interact with the database", async () => {
    // Use testDb for real database operations
    const [record] = await testDb.insert(yourTable).values({
      // values
    }).returning();
    
    // Test service with real data
    const service = new YourService();
    const result = await service.processRecord(record.id);
    expect(result).toBeDefined();
  });
});
```

## Addressing Common Issues

### Mocking Drizzle ORM

The Drizzle ORM mocking approach allows for unit testing database-dependent code without a real database. If you encounter import errors with Drizzle modules, check if you need to add additional mocks in `setup.ts`.

### Integration Testing Database

Integration tests require a running PostgreSQL instance. If you encounter database connection issues:

1. Make sure Docker is running
2. Check the `docker-compose.test.yml` configuration
3. Verify that the `DATABASE_URL` environment variable is correct
4. Run migrations manually: `BUN_ENV=test npm run db:migrate`

### Cryptographic Testing

Cryptography is mocked to provide deterministic results in both unit and integration tests. This ensures that signatures and keys are consistent across test runs. 