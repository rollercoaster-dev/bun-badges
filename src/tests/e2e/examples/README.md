# E2E Test Examples

This directory contains example end-to-end (E2E) tests that demonstrate different testing strategies using the Bun Badges E2E testing framework.

## Available Examples

### Badge Lifecycle Flow (`badge-flow.spec.ts`)

A comprehensive example that demonstrates a complete badge lifecycle:
- User registration and login
- Badge creation
- Badge assertion (issuance)
- Badge verification

Run with:
```bash
npm run test:e2e:badge-flow
```

### Real Application Test (`real-app-test.spec.ts`)

An example that tests against the real application by proxying requests to the actual application code:
- Health check
- Authentication flow
- Public endpoint access
- Protected endpoint access control

Run with:
```bash
npm run test:e2e:real-app
```

### Database Operations (`database-operations.spec.ts`)

An example focused on database interaction through the API:
- Testing real database operations
- Complete CRUD operations
- Database verification
- Schema setup and cleanup

Run with:
```bash
npm run test:e2e:db
```

## Running All Examples

You can run all example tests with:

```bash
npm run test:e2e:examples
```

## Creating Your Own Tests

Feel free to use these examples as templates for your own E2E tests. Copy the structure and modify it to test your specific requirements.

For example, to test a new badge feature:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import {
  createTestServer,
  cleanupTestResources,
  registerAndLoginUser,
  authenticatedRequest
} from '../helpers/test-utils';

describe('My New Feature Test', () => {
  // Create a test server
  const app = new Hono();
  
  // Define test endpoints or use the real app
  // ...
  
  const { server, request } = createTestServer(app);
  
  // Clean up after tests
  afterAll(async () => {
    await cleanupTestResources(server);
  });
  
  // Your test cases
  it('should perform the expected behavior', async () => {
    // Test code
  });
});
```

## Best Practices

1. **Keep tests isolated**: Each test should run independently.
2. **Clean up after your tests**: Use `beforeEach` and `afterAll` hooks for setup and cleanup.
3. **Test complete flows**: Test real user journeys rather than isolated endpoints.
4. **Verify with database checks**: Validate that operations have the expected effect on the database.
5. **Use test utilities**: Leverage the helper functions to reduce boilerplate code. 