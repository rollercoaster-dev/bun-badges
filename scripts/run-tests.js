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
import { existsSync } from 'fs';
import { join } from 'path';

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
    if (isDockerComposeAvailable()) {
      console.log('Using Docker Compose for tests');
      // Use the Docker Compose version of the test command
      execSync(`npm run test:${testType}:docker`, { stdio: 'inherit' });
    } else {
      console.log('Using direct test command (no Docker Compose)');

      // Set environment variables
      process.env.NODE_ENV = 'test';

      if (testType === 'integration') {
        process.env.INTEGRATION_TEST = 'true';
      } else if (testType === 'e2e') {
        process.env.E2E_TEST = 'true';
      }

      // Run the appropriate test command directly
      let testCommand;
      switch (testType) {
        case 'unit':
          testCommand = 'bun test tests/unit/**/*.test.ts';
          break;
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
