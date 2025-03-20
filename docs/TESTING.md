# Testing Guide

This document describes the testing approach and infrastructure for the bun-badges project.

## Test Types

1. **Unit Tests**: Tests that verify individual components in isolation, using mocks for dependencies like the database.
2. **Integration Tests**: Tests that verify components working together with real infrastructure such as a database.

## Test Organization

Tests are organized in the following structure:

- `src/__tests__` - Top-level tests for core functionality
- `src/services/__tests__` - Tests for services
- `src/routes/__tests__/integration` - API route integration tests
- `src/utils/test` - Test utilities and helpers

Integration tests are identified by:
- File naming: `*.integration.test.ts`
- Directory paths: `integration/` subdirectories

## Running Tests

### Running All Tests

```bash
# Run all tests (unit and integration)
npm run test:all

# Run only unit tests (much faster)
npm run test:unit

# Run all integration tests
npm run test:integration

# Run integration tests with Docker (includes setup/teardown)
npm run test:docker
```

### Running Individual Tests

We provide several ways to run individual test files:

#### Automatic Test Type Detection

```bash
# Automatically detect test type and run appropriate command
./test-file.sh path/to/test/file.ts
```

This script will:
1. Check if the file exists
2. Automatically detect if it's an integration or unit test based on the filename
3. Run the appropriate test command

#### Manual Test Type Specification

```bash
# Run a specific unit test
npm run test:unit:file path/to/unit/test.ts

# Run a specific integration test
npm run test:integration:file path/to/integration/test.ts
```

## Test Setup

### Unit Tests

Unit tests use mock database implementations found in `src/utils/test/unit-setup.ts`. These tests are fast but don't verify actual database behavior.

### Integration Tests

Integration tests use a real PostgreSQL database running in Docker. The `test-integration.sh` script handles:

1. Starting the test database container
2. Running migrations
3. Running tests with the correct database URL
4. Stopping the database container

## Test Data

For integration tests, test data is managed through helpers in `src/utils/test/db-helpers.ts`:

- `seedTestData()` - Creates test users, issuers, badges, and assertions
- `clearTestData()` - Cleans up the database between tests

## Troubleshooting

### Database Connection Issues

- Ensure Docker is running
- Verify that port 5434 is not in use by another application
- Check if the database container is already running: `docker ps | grep bun-badges-test-db`

### Test Failures

- Integration tests should handle their own cleanup in beforeEach/afterEach hooks
- Check the test logs for specific errors
- Verify the database schema matches what tests expect
