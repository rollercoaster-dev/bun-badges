# CI/CD Improvement: Integrating Docker Test Database

## Overview
The current CI/CD pipeline is failing because it attempts to use Docker for database testing, but either Docker is not available in the GitHub Actions environment or the commands are not properly configured. This task involves researching best practices and implementing a solution that allows our tests to run successfully in CI environments with proper database access.

## Current Issues
1. Tests are failing in CI with errors related to `docker-compose` command not being found
2. The test setup tries to use Docker but doesn't have proper fallbacks for CI environments
3. There's no dedicated service for PostgreSQL in the GitHub Actions workflow
4. Integration and E2E tests require a database but can't access one in CI

## Initial Assessment Phase

### 1. Current Environment Configuration
#### Existing Environment Files
- `.env.example` - Template with base configuration including:
  - Server configuration (PORT, NODE_ENV)
  - Database configuration (DB_HOST, DB_PORT, DB_NAME, etc.)
  - Docker configuration (POSTGRES_* variables)
  - JWT configuration
  - HTTPS configuration
- `.env.test` - Minimal test configuration:
  - NODE_ENV=test
  - DATABASE_URL for test database
  - JWT_SECRET for testing
- `.env.docker` - Docker-specific settings:
  - Custom port (6669)
  - Database configuration for Docker environment
  - DOCKER_CONTAINER flag
  - Docker-specific paths
- `.env.github` - CI environment configuration:
  - Database credentials for CI
  - Test JWT secret
  - CI-specific flags (SKIP_DOCKER=true)

#### Current Issues Identified
- No service container configuration in GitHub Actions workflow
- Inconsistent database connection settings between environments
- Missing retry and timeout configurations
- No explicit environment variable validation
- Hardcoded test database port (5434) in .env.test

#### Variables to Add/Standardize
- Database connection retry settings
- Connection pool configuration
- Explicit CI environment flags
- Docker compose configuration
- Test setup specific variables

### 2. Test Setup Analysis
#### Current Implementation (`tests/setup.ts`)
- Environment Detection:
  - Uses command-line arguments and env vars to detect test type
  - Supports unit, integration, and E2E tests
  - Loads `.env.test` configuration

- Database Handling:
  - Mocks database for unit tests
  - Uses real database for integration/E2E tests
  - Manages connection pool lifecycle
  - No explicit retry logic for connections
  - No Docker health checks

- Docker Integration:
  - Multiple docker-compose files present:
    - `docker-compose.yml` (main)
    - `docker-compose.dev.yml` (development)
    - `docker-compose.test.yml` (testing)
    - `docker-compose.light.yml` (minimal setup)
  - No explicit Docker availability check
  - Missing graceful fallback when Docker unavailable

#### Key Issues
1. No distinction between CI and local test environments
2. Hardcoded database configuration
3. Missing connection retry mechanism
4. No Docker health check integration
5. Lack of error handling for Docker unavailability

#### Required Changes
1. Add CI environment detection
2. Implement connection retry logic
3. Add Docker availability check
4. Create service container fallback for CI
5. Improve error handling and logging

### 3. CI Configuration Review
#### Current CI Workflow
- Basic GitHub Actions setup with two jobs:
  - `test`: Runs all test suites
  - `build`: Creates production build

- Test Steps:
  1. Checkout code
  2. Setup Bun runtime
  3. Install dependencies
  4. Run type checks
  5. Run linter
  6. Run unit tests
  7. Run integration tests
  8. Run E2E tests

#### Missing Components
1. No PostgreSQL service container
2. No database initialization step
3. No environment variable setup
4. No Docker configuration
5. No test database cleanup

#### Required Changes
1. Add PostgreSQL service container:
   ```yaml
   services:
     postgres:
       image: postgres:16-alpine
       env:
         POSTGRES_USER: ${{ vars.DB_USER }}
         POSTGRES_PASSWORD: ${{ secrets.DB_PASSWORD }}
         POSTGRES_DB: ${{ vars.DB_NAME }}
       ports:
         - 5432:5432
       options: >-
         --health-cmd pg_isready
         --health-interval 10s
         --health-timeout 5s
         --health-retries 5
   ```

2. Add environment setup step
3. Add database initialization
4. Add cleanup steps
5. Configure test-specific settings

### 4. Docker Configuration Assessment
#### Current Docker Setup
- Multiple Docker Compose configurations:
  - `docker-compose.test.yml`: Test environment setup
    - PostgreSQL 16 (Alpine) with optimized test settings
    - Separate test runner services for integration and E2E
    - Redis service for caching
    - Test reporter service for viewing results
  - Health checks implemented for database
  - Volume management for persistence
  - Network isolation via test_network

#### Test Database Configuration
- Current Settings:
  - Port: 5434 (mapped from 5432)
  - User: postgres
  - Password: postgres
  - Database: bun_badges_test
  - Optimized for testing:
    - Disabled fsync
    - Disabled synchronous commits
    - Disabled full page writes
    - Optimized random page cost

#### Key Issues
1. Port mismatch between Docker (5434) and CI (5432)
2. Hardcoded credentials in Docker Compose
3. No environment variable substitution
4. Complex setup not suitable for CI
5. Missing cleanup procedures

#### Required Changes
1. Standardize port usage
2. Use environment variables for configuration
3. Simplify setup for CI environment
4. Add cleanup procedures
5. Improve health check integration

### 5. Dependencies and Integration Points
#### Test Suite Organization
- Unit Tests: `tests/unit/`
  - Mocked database connections
  - No direct database dependencies
  - Focus on isolated functionality

- Integration Tests: `tests/integration/`
  - Direct database interaction
  - Schema validation
  - CRUD operations testing
  - Connection pool usage

- E2E Tests: `tests/e2e/`
  - Full system testing
  - Database state management
  - API endpoint testing

#### Database Dependencies
- Connection Pool Management:
  - Shared pool across integration tests
  - Lifecycle managed in `tests/setup.ts`
  - No explicit connection retry logic

- Schema Management:
  - Tables created/dropped per test suite
  - Migration handling in Docker setup
  - No explicit schema validation

#### Test Setup Flow
1. Environment configuration loading
2. Database connection establishment
3. Test suite execution
4. Database cleanup
5. Connection pool closure

#### Required Improvements
1. Add connection retry mechanism
2. Implement proper test isolation
3. Add schema validation step
4. Improve cleanup procedures
5. Add health checks

## Research Findings
After researching CI/CD best practices for database testing, we've identified several approaches:

### Approach 1: Use GitHub Actions Service Containers
GitHub Actions supports [service containers](https://docs.github.com/en/actions/using-containerized-services/about-service-containers) which can run alongside your workflow jobs. This is the recommended approach as it:
- Runs in the same network as the job container
- Doesn't require Docker Compose
- Is fully managed by GitHub Actions
- Has easy access via localhost

### Approach 2: Use Docker Compose in GitHub Actions
If we need more complex setups, we can:
- Install Docker Compose in the workflow
- Run our existing docker-compose.test.yml
- Configure tests to connect to the containers

### Approach 3: Use In-Memory Database Mocks
For simple tests:
- Use in-memory database mocks (SQLite, etc.)
- Configure tests to use mocks in CI environments

## Recommended Solution
We should implement a hybrid approach:

1. Use GitHub Actions service containers for PostgreSQL for basic database tests
2. Enhance our test setup to gracefully handle environments without Docker
3. Keep our Docker Compose setup for local development and testing
4. Add environment detection to automatically switch between modes

## Task Breakdown

### 1. Update GitHub Workflows (Priority: High)

- [x] Update `.github/workflows/ci.yml` to add PostgreSQL service container
- [x] Configure environment variables for database connection
- [x] Ensure proper wait time for database initialization
- [x] Add database schema initialization step

**Implementation Details:**
```yaml
# Example service container configuration
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: ${{ vars.DB_USER }}
      POSTGRES_PASSWORD: ${{ secrets.DB_PASSWORD }}
      POSTGRES_DB: ${{ vars.DB_NAME }}
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

### 2. Improve Test Setup Script (Priority: High)

- [x] Update `tests/setup.ts` to better handle environments without Docker
- [x] Add support for both "docker compose" and "docker-compose" commands
- [x] Add explicit checks for CI environment (process.env.CI)
- [x] Use environment variables to switch between Docker and direct DB connection
- [x] Improve database connection retry logic
- [x] Add more detailed logging for troubleshooting

### 3. Update Database Connection Logic (Priority: Medium)

- [x] Modify connection logic to prioritize direct connection in CI
- [x] Implement more robust connection pooling
- [x] Add explicit database cleanup between test runs
- [x] Create database schema validation script

### 4. Enhance Test Environment Configuration (Priority: Medium)

- [x] Create separate `.env.ci` file for CI-specific settings
- [x] Update test scripts to handle different environments
- [x] Improve documentation around environment setup
- [x] Add schema initialization scripts for test database

### 5. Documentation and Knowledge Sharing (Priority: Low)

- [x] Document the new CI/CD setup in the project wiki/README
- [x] Create troubleshooting guide for common CI issues
- [x] Add comments in workflow files explaining key choices
- [x] Update developer onboarding docs with testing information

## Implementation Plan

### Phase 1: CI Environment Setup
1. [x] Add PostgreSQL service container to GitHub workflows
2. [x] Update environment variables for CI
3. [x] Test basic database connection

### Phase 2: Test Setup Improvements
1. [x] Enhance test setup script with better environment detection
2. [x] Add CI-specific logic to bypass Docker when running in GitHub Actions
3. [x] Update database connection handling

### Phase 3: Validation and Optimization
1. [x] Add schema validation steps
2. [x] Optimize test performance in CI
3. [x] Implement comprehensive logging
4. [x] Add automatic cleanup steps

## Environment Variables Configuration

### Required Variables
- [x] `DATABASE_URL`: Connection string for PostgreSQL (default: "postgres://postgres:postgres@localhost:5432/bun_badges_test")
- [x] `TEST_DB_HOST`: Database host (default: "localhost")
- [x] `TEST_DB_PORT`: Database port (default: 5432)
- [x] `TEST_DB_USER`: Database user (default: "postgres")
- [x] `TEST_DB_PASSWORD`: Database password (default: "postgres")
- [x] `TEST_DB_NAME`: Test database name (default: "bun_badges_test")
- [x] `TEST_DB_POOL_SIZE`: Maximum pool connections (default: 10)
- [x] `TEST_DB_TIMEOUT`: Connection timeout in milliseconds (default: 5000)
- [x] `TEST_DB_MAX_RETRIES`: Maximum connection retry attempts (default: 5)
- [x] `TEST_DB_RETRY_DELAY`: Delay between retries in milliseconds (default: 1000)

### CI-Specific Variables
- [x] `CI`: Whether running in CI environment (default: false)
- [x] `SKIP_DOCKER`: Skip Docker setup in CI (default: true in CI)
- [x] `LOG_LEVEL`: Logging verbosity (default: "info")
- [x] `NODE_ENV`: Environment name (default: "test")

### Docker-Related Variables
- [x] `DOCKER_COMPOSE_FILE`: Path to docker-compose file (default: "docker-compose.test.yml")
- [x] `DOCKER_COMPOSE_PROJECT`: Project name for Docker Compose (default: "bun-badges-test")
- [x] `DOCKER_COMPOSE_TIMEOUT`: Timeout for Docker operations (default: 30000)

### Implementation Tasks
- [x] Create `.env.test` template with default values
- [x] Update `.env.ci` with CI-specific overrides
- [x] Add environment variable validation in test setup
- [x] Document all variables in README
- [x] Add environment variable examples to CI workflow

## Success Criteria
- [x] All tests (unit, integration, E2E) pass consistently in CI
- [x] Database is properly initialized for tests
- [x] Test environment correctly detects and adapts to CI
- [x] Clear logs show database connection status and test setup
- [x] Documentation is complete and accurate

## Completion Summary

The CI/CD improvements have been successfully implemented and tested:

1. **Environment Detection**:
   - Added automatic detection of CI environment
   - Created separate configuration for CI and local development
   - Implemented proper fallbacks between environments

2. **Database Connection**:
   - Added PostgreSQL service container to GitHub Actions
   - Implemented connection retry logic for improved reliability
   - Configured optimal connection pool settings for test environments
   - Added proper cleanup mechanisms

3. **Docker Integration**:
   - Added smart detection of Docker availability
   - Created graceful fallback when Docker is unavailable
   - Maintained compatibility with local Docker-based tests

4. **Environment Variables**:
   - Created comprehensive `.env.ci` for CI environments
   - Updated `.env.test` for local development
   - Documented all variables and their purpose
   - Added validation and fallback defaults

5. **Documentation**:
   - Added detailed README section about test environment configuration
   - Documented CI/CD improvements
   - Added inline comments in setup files

All tests now pass in both local and CI environments, with proper database connectivity, error handling, and cleanup procedures.

## Resources
- [GitHub Actions Service Containers](https://docs.github.com/en/actions/using-containerized-services/about-service-containers)
- [Docker in GitHub Actions](https://docs.github.com/en/actions/using-containerized-services/about-service-containers#creating-service-containers)
- [Postgres GitHub Action](https://github.com/marketplace/actions/setup-postgresql)
- [Best Practices for Database Testing in CI](https://martinfowler.com/articles/nonDeterminism.html#DatabaseState) 