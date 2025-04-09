#!/usr/bin/env node

/**
 * Test Runner Script
 *
 * This script provides a unified way to run tests in both local and CI environments.
 * It detects whether Docker Compose is available and uses the appropriate test command.
 *
 * Usage:
 *   node scripts/run-tests.js [test-type]
 *
 * Where test-type is one of:
 *   - unit
 *   - integration
 *   - e2e
 *   - file
 */

import { execSync } from 'child_process';

// Get the test type from command line arguments
const testType = process.argv[2];
if (!testType) {
  console.error('Error: Test type is required. Use one of: unit, integration, e2e, file');
  process.exit(1);
}

// Check if we're running in CI
const isCI = process.env.CI === 'true';

// Check if Docker Compose is available
function isDockerComposeAvailable() {
  try {
    if (isCI) {
      // In CI, we don't want to use Docker Compose
      return false;
    }

    // Check if docker-compose is available
    execSync('docker-compose --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Run tests based on environment
function runTests() {
  console.log(`Running ${testType} tests...`);

  try {
    // Set environment variables
    process.env.NODE_ENV = 'test';

    // For unit tests, never use Docker
    if (testType === 'unit') {
      console.log('Running unit tests directly (no Docker needed)');
      execSync('bun test tests/unit/**/*.test.ts', { stdio: 'inherit' });
    }
    // For integration and e2e tests, use Docker if available and not explicitly skipped
    else if ((testType === 'integration' || testType === 'e2e') && isDockerComposeAvailable() && process.env.SKIP_DOCKER !== 'true') {
      console.log(`Using Docker Compose for ${testType} tests`);
      process.env.INTEGRATION_TEST = testType === 'integration' ? 'true' : undefined;
      process.env.E2E_TEST = testType === 'e2e' ? 'true' : undefined;
      try {
        execSync(`npm run test:${testType}:docker`, { stdio: 'inherit' });
      } catch (error) {
        console.error(`Error running ${testType} tests with Docker. Falling back to direct execution.`);
        console.error(`If Docker is not running, you can set SKIP_DOCKER=true to skip Docker checks.`);

        // Set environment variables for direct execution
        process.env.INTEGRATION_TEST = testType === 'integration' ? 'true' : undefined;
        process.env.E2E_TEST = testType === 'e2e' ? 'true' : undefined;

        // Set database URL for local PostgreSQL if not already set
        if (!process.env.DATABASE_URL) {
          process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/bun_badges_test';
          console.log(`Set DATABASE_URL to ${process.env.DATABASE_URL}`);
          console.log('Make sure your local PostgreSQL is running and has the test database created.');
        }

        // Run the appropriate test command directly
        const testCommand = testType === 'integration'
          ? 'bun test tests/integration/**/*.test.ts'
          : 'bun test ./tests/e2e/index.ts';

        execSync(testCommand, { stdio: 'inherit' });
      }
    }
    // Direct command for all other cases
    else {
      console.log(`Using direct test command for ${testType} tests (no Docker)`);

      if (testType === 'integration') {
        process.env.INTEGRATION_TEST = 'true';
        // Set database URL for local PostgreSQL if not already set
        if (!process.env.DATABASE_URL) {
          process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/bun_badges_test';
          console.log(`Set DATABASE_URL to ${process.env.DATABASE_URL}`);
          console.log('Make sure your local PostgreSQL is running and has the test database created.');
        }
      } else if (testType === 'e2e') {
        process.env.E2E_TEST = 'true';
        // Set database URL for local PostgreSQL if not already set
        if (!process.env.DATABASE_URL) {
          process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/bun_badges_test';
          console.log(`Set DATABASE_URL to ${process.env.DATABASE_URL}`);
          console.log('Make sure your local PostgreSQL is running and has the test database created.');
        }
      }

      // Run the appropriate test command directly
      let testCommand;
      switch (testType) {
        case 'integration':
          testCommand = 'bun run src/db/migrate.ts && bun test tests/integration/**/*.test.ts';
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

      execSync(testCommand, { stdio: 'inherit' });
    }

    console.log(`${testType} tests completed successfully`);
  } catch (error) {
    console.error(`Error running ${testType} tests:`, error.message);
    process.exit(error.status || 1);
  }
}

// Run the tests
runTests();
