# CI/CD Improvement: Integrating Docker Test Database

## Overview
The current CI/CD pipeline is failing because it attempts to use Docker for database testing, but either Docker is not available in the GitHub Actions environment or the commands are not properly configured. This task involves researching best practices and implementing a solution that allows our tests to run successfully in CI environments with proper database access.

## Current Issues
1. Tests are failing in CI with errors related to `docker-compose` command not being found
2. The test setup tries to use Docker but doesn't have proper fallbacks for CI environments
3. There's no dedicated service for PostgreSQL in the GitHub Actions workflow
4. Integration and E2E tests require a database but can't access one in CI

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

- [ ] Update `.github/workflows/ci.yml` to add PostgreSQL service container
- [ ] Configure environment variables for database connection
- [ ] Ensure proper wait time for database initialization
- [ ] Add database schema initialization step

**Implementation Details:**
```yaml
# Example service container configuration
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: bun_badges_test
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
- [ ] Add explicit checks for CI environment (process.env.CI)
- [ ] Use environment variables to switch between Docker and direct DB connection
- [ ] Improve database connection retry logic
- [ ] Add more detailed logging for troubleshooting

### 3. Update Database Connection Logic (Priority: Medium)

- [ ] Modify connection logic to prioritize direct connection in CI
- [ ] Implement more robust connection pooling
- [ ] Add explicit database cleanup between test runs
- [ ] Create database schema validation script

### 4. Enhance Test Environment Configuration (Priority: Medium)

- [ ] Create separate `.env.ci` file for CI-specific settings
- [ ] Update test scripts to handle different environments
- [ ] Improve documentation around environment setup
- [ ] Add schema initialization scripts for test database

### 5. Documentation and Knowledge Sharing (Priority: Low)

- [ ] Document the new CI/CD setup in the project wiki/README
- [ ] Create troubleshooting guide for common CI issues
- [ ] Add comments in workflow files explaining key choices
- [ ] Update developer onboarding docs with testing information

## Implementation Plan

### Phase 1: CI Environment Setup
1. Add PostgreSQL service container to GitHub workflows
2. Update environment variables for CI
3. Test basic database connection

### Phase 2: Test Setup Improvements
1. Enhance test setup script with better environment detection
2. Add CI-specific logic to bypass Docker when running in GitHub Actions
3. Update database connection handling

### Phase 3: Validation and Optimization
1. Add schema validation steps
2. Optimize test performance in CI
3. Implement comprehensive logging
4. Add automatic cleanup steps

## Environment Variables Configuration

### Required Variables
- `DATABASE_URL`: Connection string for PostgreSQL (default: "postgres://postgres:postgres@localhost:5432/bun_badges_test")
- `TEST_DB_HOST`: Database host (default: "localhost")
- `TEST_DB_PORT`: Database port (default: 5432)
- `TEST_DB_USER`: Database user (default: "postgres")
- `TEST_DB_PASSWORD`: Database password (default: "postgres")
- `TEST_DB_NAME`: Test database name (default: "bun_badges_test")
- `TEST_DB_POOL_SIZE`: Maximum pool connections (default: 10)
- `TEST_DB_TIMEOUT`: Connection timeout in milliseconds (default: 5000)
- `TEST_DB_MAX_RETRIES`: Maximum connection retry attempts (default: 5)
- `TEST_DB_RETRY_DELAY`: Delay between retries in milliseconds (default: 1000)

### CI-Specific Variables
- `CI`: Whether running in CI environment (default: false)
- `SKIP_DOCKER`: Skip Docker setup in CI (default: true in CI)
- `LOG_LEVEL`: Logging verbosity (default: "info")
- `NODE_ENV`: Environment name (default: "test")

### Docker-Related Variables
- `DOCKER_COMPOSE_FILE`: Path to docker-compose file (default: "docker-compose.test.yml")
- `DOCKER_COMPOSE_PROJECT`: Project name for Docker Compose (default: "bun-badges-test")
- `DOCKER_COMPOSE_TIMEOUT`: Timeout for Docker operations (default: 30000)

### Implementation Tasks
- [ ] Create `.env.test` template with default values
- [ ] Update `.env.ci` with CI-specific overrides
- [ ] Add environment variable validation in test setup
- [ ] Document all variables in README
- [ ] Add environment variable examples to CI workflow

## Success Criteria
- All tests (unit, integration, E2E) pass consistently in CI
- Database is properly initialized for tests
- Test environment correctly detects and adapts to CI
- Clear logs show database connection status and test setup
- Documentation is complete and accurate

## Resources
- [GitHub Actions Service Containers](https://docs.github.com/en/actions/using-containerized-services/about-service-containers)
- [Docker in GitHub Actions](https://docs.github.com/en/actions/using-containerized-services/about-service-containers#creating-service-containers)
- [Postgres GitHub Action](https://github.com/marketplace/actions/setup-postgresql)
- [Best Practices for Database Testing in CI](https://martinfowler.com/articles/nonDeterminism.html#DatabaseState) 