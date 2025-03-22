# E2E Testing Framework

This directory contains the end-to-end (E2E) testing framework for the Bun Badges API. It uses Vitest and Supertest to provide a robust and developer-friendly testing experience.

## Overview

End-to-end tests validate that the entire application works correctly from the user's perspective. These tests interact with the API just like a real client would, making HTTP requests and verifying responses.

## Getting Started

### Running E2E Tests

To run all E2E tests:

```bash
# Using npm script
npm run test:e2e

# Or directly
./test-e2e.sh vitest
```

To run a specific test file:

```bash
# Using npm script
npm run test:e2e:file path/to/test.spec.ts

# Or directly
./test-e2e.sh vitest path/to/test.spec.ts
```

To run just the smoke test:

```bash
npm run test:e2e:smoke
```

### Test Structure

The framework consists of:

- **Test Helpers**: Utility functions to simplify common testing tasks
- **Fixtures**: Sample data for tests
- **Test Files**: The actual test cases (`.spec.ts` files)

## Creating a New E2E Test

Here's a simple example of creating a new E2E test:

```typescript
// src/tests/e2e/examples/simple.spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import {
  createTestServer,
  cleanupTestResources,
  registerAndLoginUser,
  authenticatedRequest
} from '../helpers/test-utils';

describe('Example E2E Test', () => {
  // Create a test app and server
  const app = new Hono();
  
  // Add your test endpoints
  app.get('/example', (c) => c.json({ message: 'Hello World' }));
  
  // Set up the test server
  const { server, request } = createTestServer(app);
  
  // Clean up after tests
  afterAll(async () => {
    await cleanupTestResources(server);
  });
  
  it('should respond with 200 status code', async () => {
    const response = await request.get('/example');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Hello World');
  });
});
```

## Using the Actual Application

For testing the real application, you can import and use the actual app:

```typescript
import { describe, it, beforeAll, afterAll } from 'vitest';
import appConfig from '../../../index'; // Import your main app 
import { Hono } from 'hono';
import { createTestServer, cleanupTestResources } from '../helpers/test-utils';

describe('Real App E2E Test', () => {
  // Create a Hono app for testing with the real app's fetch handler
  const app = new Hono();
  app.all('*', async (c) => {
    // Pass all requests to the real app
    return appConfig.fetch(c.req.raw);
  });
  
  const { server, request } = createTestServer(app);
  
  afterAll(async () => {
    await cleanupTestResources(server);
  });
  
  it('should respond to health check', async () => {
    const response = await request.get('/health');
    expect(response.status).toBe(200);
  });
});
```

## Testing with Authentication

To test endpoints that require authentication:

```typescript
it('should access protected endpoints', async () => {
  // Register and login a test user
  const user = await registerAndLoginUser(request);
  
  // Make an authenticated request
  const response = await authenticatedRequest(
    request,
    'get',
    '/protected-endpoint',
    user.token
  );
  
  expect(response.status).toBe(200);
});
```

## Testing Database Operations

To test features that interact with the database:

```typescript
import { resetDatabase } from '../helpers/test-utils';

beforeEach(async () => {
  // Reset the database before each test
  await resetDatabase();
});

it('should create a new badge', async () => {
  // ... test code
});
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on state from other tests.
2. **Clean Up**: Always clean up resources after tests (server, database connections).
3. **Meaningful Names**: Use descriptive test names that explain the behavior being tested.
4. **Simple Tests**: Keep tests focused on a single behavior or flow.
5. **Realistic Data**: Use realistic test data that represents actual use cases.

## Troubleshooting

- **Database Connection Issues**: Ensure your test database is running (`./test-e2e.sh` handles this automatically).
- **Port Conflicts**: If you see port binding errors, ensure no other tests are running or specify a different port.
- **Failed Tests**: Check the console output for detailed error messages and stack traces.

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Hono Documentation](https://hono.dev/) 