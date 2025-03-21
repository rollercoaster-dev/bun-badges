# E2E Test Environment Setup Plan

## Overview

This document outlines the plan for setting up a robust, isolated end-to-end (E2E) test environment using Docker. Our goal is to use the production-ready Dockerfile (which is working well) and create a dedicated test environment with Docker Compose and a unified test runner script.

## Objectives

- Leverage the existing main Dockerfile without modifications (since it has been proven to work).
- Create a dedicated Docker Compose configuration (`docker-compose.test.yml`) that defines a test database, a test runner container, and any auxiliary services needed (e.g., Redis, test reporter).
- Develop a unified test runner script (`run-e2e.sh`) that supports running all tests or a specific test file and can operate in both Docker mode and local mode.
- Update package.json to simplify the E2E test commands, removing individual test scripts in favor of a centralized command.
- Validate the E2E environment and ensure proper connectivity (e.g., between the test runner and the test database), migration, and test execution.

## Plan and Steps

1. **Review Existing Setup**
   - Verify the working main Dockerfile and the build/start commands from package.json.
   - Ensure that the current Dockerfile is unmodified since it works as intended.
   - *Time estimate:* 0.5 day

2. **Design the E2E Test Environment**
   - Create a `docker-compose.test.yml` file that includes:
     - A `db_test` service: a Postgres container with test-optimized settings (e.g., nosync, fsync off).
     - A `test_runner` service: a container built from the main Dockerfile with test-specific environment variables (NODE_ENV=test, E2E_TEST, DATABASE_URL, JWT_SECRET, etc.).
     - Optional services if required: e.g., a Redis container (`redis_test`) and a test report viewing container (`test_reporter`).
   - *Time estimate:* 0.5 day

3. **Develop the Unified Test Runner Script**
   - Create a `run-e2e.sh` script that:
     - Accepts parameters to run all tests or a specific test file.
     - Supports Docker mode (set via the DOCKER_MODE environment variable) and local mode.
     - Coordinates: ensuring the test DB is up, running migrations, then executing tests.
   - *Time estimate:* 0.5 day

4. **Update Package.json Scripts**
   - Remove multiple individual E2E test scripts related to specific test files.
   - Add unified commands:
     - `test:e2e` – Runs the unified test runner script locally.
     - `test:e2e:docker` – Runs the unified test runner script in Docker mode.
   - Set a `pretest` script to ensure E2E tests run first.
   - *Time estimate:* 0.25 day

5. **Validate and Iterate**
   - Build Docker images using the main Dockerfile and the new `docker-compose.test.yml`.
   - Run E2E tests both locally and in Docker mode.
   - Check connectivity between test_runner and db_test, verify migrations run successfully, and assess test output.
   - Iterate fixes as necessary.
   - *Time estimate:* 1 day

6. **Documentation and Best Practices**
   - Update README files to document the new unified test commands.
   - Provide troubleshooting tips for developers running the tests.
   - *Time estimate:* 0.25 day

## Expected Outcome

- A fully functional, isolated E2E test environment that leverages the existing production Dockerfile without modification.
- A unified testing command (via `run-e2e.sh`) to run all or specific E2E tests in both Docker and local modes.
- Simplified package.json scripts that reduce clutter and centralize configuration.
- Clear documentation outlining the process for running and troubleshooting E2E tests.

## Next Steps

1. Implement and verify `docker-compose.test.yml` and `run-e2e.sh` based on best practices.
2. Update and simplify package.json scripts to point to the unified test runner.
3. Validate the end-to-end test environment through iterative testing and debugging.
4. Document the process and update the README with instructions for new developers.

**Status:** Not started
**Priority:** High
**Time Estimate:** Approximately 2 days total 