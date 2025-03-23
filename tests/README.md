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

## CI Test Setup

For CI environments, we now use a dedicated setup script that helps prepare and clean the test environment in a more robust way:

```bash
# Run the CI test setup script
./tasks/ci-test-setup.sh
```

The script performs the following actions:
- Cleans up any existing test containers and artifacts
- Creates required test directories
- Sets up environment variables
- Checks for Docker availability
- Handles database setup (real or mock)
- Manages database migrations

For GitHub Actions, the script is automatically called as part of the CI workflow. This ensures consistent test environments across both local development and CI pipelines.

### Configuration Options

The script behavior can be controlled with environment variables:

#### Test Control Variables
- `FORCE_MOCK_DB=true` - Always use mock database even if Docker is available
- `SKIP_DOCKER=true` - Skip Docker container setup entirely
- `CI=true` - Indicates running in a CI environment
- `LOG_LEVEL=error` - Sets the logging level for tests

#### Database Configuration
- `DB_USER` - Database username (default: `postgres`)
- `DB_PASSWORD` - Database password (default: `postgres`)
- `DB_HOST` - Database host (default: `localhost`)
- `DB_PORT` - Database port (default: `5432` for CI, `5434` for Docker)
- `DB_NAME` - Database name (default: `bun_badges_test`)
- `TEST_JWT_SECRET` - JWT secret for tests (default: `test-jwt-secret-for-ci-tests`)

Examples:

```bash
# Run with a mock database regardless of Docker availability
FORCE_MOCK_DB=true ./tasks/ci-test-setup.sh

# Run with custom database credentials
DB_USER=test_user DB_PASSWORD=secure_password DB_NAME=custom_test_db ./tasks/ci-test-setup.sh

# Run in CI environment with specific database port
CI=true DB_PORT=5433 ./tasks/ci-test-setup.sh
```

In GitHub Actions, these variables can be set as action secrets or variables for added security. 

### Setting Up GitHub Variables and Secrets

We've included a helper script to set up GitHub repository variables and secrets automatically using the GitHub CLI (`gh`):

```bash
# Run the GitHub variables setup script
./tasks/setup-github-vars.sh
```

This script will:
1. Check if the GitHub CLI is installed and authenticated
2. Detect your repository from git remote (or prompt you for it)
3. Load variables from a .env file
4. Set up GitHub repository variables and secrets based on the .env file

The script automatically determines which variables should be encrypted secrets based on their names. Any variable with "password", "secret", "key", or "token" in its name (case insensitive) will be set as an encrypted secret, while all others will be set as public variables.

**Example .env File**:

We've provided an example file at `examples/github-vars-example.env` that you can copy and modify:

```bash
# Copy the example file
cp examples/github-vars-example.env .env

# Edit with your values
nano .env  # or your preferred editor

# Run the script
./tasks/setup-github-vars.sh
```

**Requirements:**
- GitHub CLI (`gh`) must be installed. Install from https://cli.github.com/
- You must be authenticated with GitHub CLI. Run `gh auth login` if needed.
- A .env file containing the variables you want to set

Once these variables are set in your GitHub repository, the CI workflow will automatically use them when running tests. 