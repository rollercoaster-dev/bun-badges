# E2E Testing Framework

This directory contains the end-to-end (E2E) testing framework for the Bun Badges API. It uses Bun's test runner with Vitest and Supertest to provide a robust and developer-friendly testing experience.

## Directory Structure

```
tests/e2e/
├── flows/           # Test flows organized by feature
│   ├── auth/        # Authentication flows
│   ├── badges/      # Badge-related flows
│   ├── core/        # Core system flows
│   └── verification/# Verification flows
├── helpers/         # Test helper functions
├── setup/          # Test environment setup
├── utils/          # Additional utilities
├── fixtures/       # Test data
└── README.md       # This file
```

## Getting Started

### Running E2E Tests

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

To run a specific test file:
```bash
bun test path/to/test.test.ts
```

### Test Structure

The framework consists of:
- **Test Flows**: Feature-specific test flows in `flows/`
- **Test Helpers**: Utility functions in `helpers/`
- **Test Setup**: Environment setup in `setup/`
- **Fixtures**: Sample data in `fixtures/`

## Creating a New E2E Test

1. Identify the appropriate feature area in `flows/`
2. Create a new test file with the `.test.ts` extension
3. Use the helper functions from `helpers/test-utils.ts`
4. Follow the patterns in existing tests

Example:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import {
  createTestServer,
  cleanupTestResources,
  registerAndLoginUser,
  authenticatedRequest
} from '../helpers/test-utils';

describe('Example E2E Test', () => {
  const { server, request } = createTestServer(app);
  
  afterAll(async () => {
    await cleanupTestResources(server);
  });
  
  it('should test something', async () => {
    const response = await request.get('/example');
    expect(response.status).toBe(200);
  });
});
```

## Best Practices

1. **Organization**:
   - Place tests in the appropriate feature directory
   - Use descriptive file names
   - Group related tests together

2. **Test Structure**:
   - Each test file should focus on one feature or flow
   - Use clear test descriptions
   - Follow the AAA pattern (Arrange, Act, Assert)

3. **Data Management**:
   - Use fixtures for test data
   - Clean up after tests
   - Don't rely on test order

4. **Authentication**:
   - Use `registerAndLoginUser` for auth flows
   - Use `authenticatedRequest` for protected endpoints
   - Test both positive and negative auth cases

5. **Database**:
   - Use `resetDatabase` before tests that need a clean state
   - Clean up created data after tests
   - Use transactions when appropriate

## Troubleshooting

- **Database Connection Issues**: Ensure your test database is running
- **Port Conflicts**: Tests use random ports to avoid conflicts
- **Failed Tests**: Check the console output for detailed error messages

## Additional Resources

- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Hono Documentation](https://hono.dev/) 