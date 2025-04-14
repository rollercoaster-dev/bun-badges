#!/usr/bin/env node

/**
 * Simplified Test Runner Script
 *
 * This script provides a unified way to run tests in both local and Docker environments.
 * It automatically selects the appropriate test command based on the test type.
 *
 * Usage:
 *   node scripts/run-tests.js [test-type]
 *
 * Where test-type is one of:
 *   - unit: Run unit tests (no database required)
 *   - integration: Run integration tests (requires database)
 *   - e2e: Run end-to-end tests (requires database)
 *   - file: Run a specific test file (requires database)
 */

import { execSync } from 'child_process';

// Get the test type and optional file path from command line arguments
const testType = process.argv[2];
const testFile = process.argv[3];

if (!testType) {
  console.error('Error: Test type is required. Use one of: unit, integration, e2e, file');
  console.error('For integration tests with a specific file: node scripts/run-tests.js integration path/to/test.ts');
  process.exit(1);
}

// Check if Docker should be skipped
const skipDocker = process.env.SKIP_DOCKER === 'true';

// Check if we're running in CI
const isCI = process.env.CI === 'true';

// Helper function to set up database URL for local PostgreSQL
function setupDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/bun_badges_test';
    console.log(`Set DATABASE_URL to ${process.env.DATABASE_URL}`);
    console.log('Make sure your local PostgreSQL is running and has the test database created.');
  }
}

// Check if Docker Compose is available
function isDockerComposeAvailable() {
  try {
    // In CI or when SKIP_DOCKER is set, don't use Docker Compose
    if (isCI || skipDocker) {
      console.log('CI or SKIP_DOCKER detected, skipping Docker Compose');
      return false;
    }
    execSync('docker-compose --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.log('Docker Compose not available, using direct test command');
    return false;
  }
}

// Run tests based on environment
function runTests() {
  console.log(`Running ${testType} tests...`);

  // Set environment variables
  process.env.NODE_ENV = 'test';

  try {
    // For unit tests, never use Docker
    if (testType === 'unit') {
      console.log('Running unit tests directly (no Docker needed)');
      try {
        execSync('bun test tests/unit/**/*.test.ts', { stdio: 'inherit' });
      } catch (error) {
        console.error('Failed to run unit tests:', error.message);
        process.exit(error.status || 1);
      }
    }
    // For integration and e2e tests, use Docker if available
    else if ((testType === 'integration' || testType === 'e2e') && isDockerComposeAvailable()) {
      console.log(`Using Docker Compose for ${testType} tests`);
      try {
        if (testType === 'integration' && testFile) {
          // Run a specific integration test file
          console.log(`Running specific test file: ${testFile}`);
          execSync(`docker-compose -f docker-compose.test.yml down -v && docker-compose -f docker-compose.test.yml run --entrypoint "" --build --rm -e NODE_ENV=test -e INTEGRATION_TEST=true test_runner sh -c 'bun install --prefer-offline && bun run src/db/migrate.ts && bun test ${testFile}'`, { stdio: 'inherit' });
        } else {
          // Run all tests for the test type
          execSync(`npm run test:${testType}:docker`, { stdio: 'inherit' });
        }
      } catch (error) {
        console.error(`Failed to run ${testType} tests using Docker Compose:`, error.message);
        console.error('Please ensure Docker Compose is installed and configured correctly.');
        process.exit(error.status || 1);
      }
    }
    // Direct command for all other cases
    else {
      console.log(`Using direct test command for ${testType} tests (no Docker)`);

      // Set appropriate environment variables
      if (testType === 'integration') {
        process.env.INTEGRATION_TEST = 'true';
      } else if (testType === 'e2e') {
        process.env.E2E_TEST = 'true';
      }

      // Set database URL for local PostgreSQL if not already set
      if (testType === 'integration' || testType === 'e2e' || testType === 'file') {
        setupDatabaseUrl();
      }

      // Run the appropriate test command directly
      let testCommand;
      switch (testType) {
        case 'integration':
          if (testFile) {
            // Run a specific integration test file
            console.log(`Running specific test file: ${testFile}`);
            testCommand = `bun run src/db/migrate.ts && bun test ${testFile}`;
          } else {
            testCommand = 'bun run src/db/migrate.ts && bun test tests/integration/**/*.test.ts';
          }
          break;
        case 'e2e':
          testCommand = 'bun run src/db/migrate.ts && bun test ./tests/e2e/index.ts';
          break;
        case 'file':
          testCommand = 'bun run src/db/migrate.ts && bun test';
          break;
        default:
          console.error(`Unknown test type: ${testType}`);
          process.exit(1);
      }

      try {
        execSync(testCommand, { stdio: 'inherit' });
      } catch (error) {
        console.error(`Failed to run ${testType} tests directly:`, error.message);
        process.exit(error.status || 1);
      }
    }

    console.log(`${testType} tests completed successfully`);
  } catch (error) {
    console.error(`Error running ${testType} tests:`, error.message);
    process.exit(error.status || 1);
  }
}

// Run the tests
runTests();
