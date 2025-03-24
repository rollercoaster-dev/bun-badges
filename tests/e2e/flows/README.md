# E2E Test Flows

This directory contains end-to-end test flows organized by feature area.

## Directory Structure

- `auth/`: Authentication and authorization flows
  - User registration
  - Login/logout
  - Token management
  - Permission checks

- `badges/`: Badge-related flows
  - Badge creation
  - Badge issuance
  - Badge updates
  - Badge deletion
  - Badge search and filtering

- `verification/`: Verification flows
  - Badge verification
  - Signature verification
  - Revocation checks
  - Status list verification

- `core/`: Core system flows
  - `smoke.test.ts`: Basic API health checks
  - `app.test.ts`: Full application tests
  - `database.test.ts`: Database operation tests

## Running Tests

To run all E2E tests:
```bash
bun test:e2e
```

To run tests for a specific feature area:
```bash
# Auth tests
bun test tests/e2e/flows/auth/**/*.test.ts

# Badge tests
bun test tests/e2e/flows/badges/**/*.test.ts

# Verification tests
bun test tests/e2e/flows/verification/**/*.test.ts

# Core tests
bun test tests/e2e/flows/core/**/*.test.ts
```

## Test Organization Guidelines

1. Each test file should focus on a specific flow or feature
2. Use descriptive file names that indicate the functionality being tested
3. Group related tests in feature-specific directories
4. Use shared utilities from `../helpers` and `../utils`
5. Follow the example patterns in `core/smoke.test.ts` 