# Test Scripts

This directory contains scripts used by the test setup process.

## Files

### `run-migration.js`
Database migration script used by the test setup to ensure the test database has the correct schema. This script:
- Creates status list tables if they don't exist
- Sets up necessary indices
- Handles database connection cleanup

## Test Commands

All test commands are now handled directly by Bun's test runner through npm scripts in `package.json`:

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch

# Run unit tests
bun test:unit

# Run integration tests
bun test:integration

# Run E2E tests
bun test:e2e

# Run a specific test file
bun test:file path/to/file.test.ts
```

## Test Setup

Test setup is handled by `tests/setup.ts`, which is preloaded for all test runs. This setup:
1. Configures the test environment
2. Sets up database connections
3. Runs necessary migrations
4. Provides cleanup hooks

## Environment Variables

- `NODE_ENV=test`: Used for integration and E2E tests
- `E2E_TEST=true`: Specifically for E2E tests
- Database configuration is handled through the setup script 