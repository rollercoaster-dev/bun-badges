# Testing Framework

This directory contains the test infrastructure for the Open Badges server. The tests are organized into three categories:

1. **Unit Tests** - Test individual functions and components in isolation
2. **Integration Tests** - Test component interactions with mocked external dependencies
3. **End-to-End Tests** - Test complete user flows through the API

## Test Environment Setup

The test environment is configured in `tests/setup.ts`, which provides:

- Path aliases for test files
- Environment variable loading
- Database connection and mock handling
- Docker container setup for test databases
- Cleanup of test resources

## Environment Variables

The testing framework supports the following environment flags:

- `CI=true` - Indicates tests are running in a CI environment
- `FORCE_MOCK_DB=true` - Forces the use of mock database for all tests
- `SKIP_DOCKER=true` - Skips Docker setup for test databases
- `NODE_ENV=test` - Sets the environment to test mode
- `INTEGRATION_TEST=true` - Indicates integration tests are being run
- `E2E_TEST=true` - Indicates end-to-end tests are being run

## Running Tests

### Unit Tests

Unit tests don't require a database and always use mocks.

```bash
bun test:unit
# or
bun test --preload ./tests/setup.ts tests/unit/**/*.test.ts
```

### Integration Tests

Integration tests can use either a real database (run in Docker) or a mock database.

With Docker (default):
```bash
bun test:integration
# or
NODE_ENV=test bun test --preload ./tests/setup.ts tests/integration/**/*.test.ts
```

With mock database (no Docker required):
```bash
FORCE_MOCK_DB=true SKIP_DOCKER=true NODE_ENV=test bun test --preload ./tests/setup.ts tests/integration/**/*.test.ts
```

### End-to-End Tests

End-to-end tests also support both real and mocked database modes.

With Docker (default):
```bash
bun test:e2e
# or
NODE_ENV=test E2E_TEST=true bun test --preload ./tests/setup.ts ./tests/e2e/index.ts
```

With mock database:
```bash
FORCE_MOCK_DB=true SKIP_DOCKER=true NODE_ENV=test E2E_TEST=true bun test --preload ./tests/setup.ts ./tests/e2e/index.ts
```

## CI Environment

In CI environments, tests automatically run with mocked databases by checking for the `CI=true` environment variable. This is managed by the `.env.ci` file and the GitHub Actions workflow.

## Test Database

When using a real database, the tests will:

1. Spin up a PostgreSQL container using Docker
2. Run migrations to create the necessary tables
3. Clean up the container after tests complete

The Docker setup is skipped in CI environments or when `SKIP_DOCKER=true` is set.

## Mocking Strategy

The testing framework provides comprehensive mocks for:

1. **Database Interactions** - Both raw SQL queries and Drizzle ORM
2. **Cryptographic Operations** - For deterministic testing
3. **HTTP Requests** - For API endpoint testing

## Troubleshooting

If tests fail with database connection errors:

1. Check if Docker is running
2. Verify that port 5434 is available (used by the test database)
3. Try running with `FORCE_MOCK_DB=true SKIP_DOCKER=true` to bypass Docker

## Adding New Tests

When adding new tests:

1. Place unit tests in `tests/unit/`
2. Place integration tests in `tests/integration/`
3. Place e2e tests in `tests/e2e/`
4. Ensure your tests can run with both real and mocked databases 