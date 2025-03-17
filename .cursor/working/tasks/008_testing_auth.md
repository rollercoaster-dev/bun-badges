# Task 8: Authorization Testing Guidelines

## Task Description
This document provides guidelines for testing authentication and authorization in the Open Badges API. It outlines best practices, utility functions, and common patterns to make testing auth workflows consistent and maintainable.

## Priority
Medium - Testing infrastructure is important for maintainability

## Detailed Guidelines

### 1. Testing Approaches

There are two main approaches to testing authorization:

#### Direct Middleware Testing
This approach tests the auth middleware directly, without involving route handlers or database operations:

```typescript
import { requireAuth, requireRole } from "../../middleware/auth";
import { createAuthTestContext, createNextFunction } from "../../utils/test/auth-test-utils";

test("allows access with correct role", async () => {
  // Create mock context with token
  const c = createAuthTestContext({
    headers: { Authorization: "Bearer admin-token" },
  });
  const next = createNextFunction();

  // Apply auth middleware
  await requireAuth(c, next);
  
  // Apply role middleware
  const roleMiddleware = requireRole("ADMIN");
  await roleMiddleware(c, next);
  
  // Check that middleware allowed access (didn't throw exception)
  expect(c.finalized).toBe(false);
});
```

**Advantages**:
- Isolated unit tests
- Fast execution
- No database dependencies
- Precise control over context

**Best for**:
- Testing auth middleware components
- Testing complex permission chains
- Testing edge cases

#### Route Integration Testing
This approach tests the entire request lifecycle, including auth middleware, route handling, and controller logic:

```typescript
import { setupRouteTest, createTestRequest } from "../../utils/test/route-test-utils";
import issuerRoutes from "../../routes/issuer.routes";

test("allows authorized access to route", async () => {
  const { createApp } = setupRouteTest();
  const app = createApp(issuerRoutes);
  
  const req = createTestRequest("/issuers", { token: "admin-token" });
  const res = await app.fetch(req);
  
  expect(res.status).toBe(200);
});
```

**Advantages**:
- Tests full request flow
- Reveals integration issues
- More closely matches real usage

**Best for**:
- High-level endpoint testing
- Verifying route authorization rules
- Integration tests

### 2. Auth Testing Utilities

The project provides utilities to simplify auth testing:

#### `src/utils/test/auth-test-utils.ts`
- `createAuthTestContext()` - Creates a mock Hono context
- `createTestUsers()` - Provides standard test user objects
- `mockJwtModule()` - Creates a JWT verification mock
- `setupJwtMock()` - Configures the JWT mock module
- `createNextFunction()` - Creates a standard next function
- `expectHttpException()` - Tests for HTTP exceptions
- `runMiddlewareChain()` - Runs a chain of middleware

#### `src/utils/test/route-test-utils.ts`
- `createMockDbData()` - Creates mock database records
- `createMockDb()` - Creates a chainable mock DB
- `mockDbSchema()` - Mocks the database schema
- `mockDbConfig()` - Sets up database config mocking
- `mockDrizzleOrm()` - Mocks Drizzle ORM functions
- `mockSchema()` - Mocks schema definitions
- `setupRouteTest()` - Sets up a complete test environment
- `createTestRequest()` - Creates requests with auth tokens

### 3. Common Testing Patterns

#### Testing Role-Based Access Control
```typescript
// Test permissions with different roles
test("enforces role-based access control", async () => {
  const { createApp, users } = setupRouteTest();
  const app = createApp(routes);
  
  // Admin can access 
  const adminReq = createTestRequest("/protected", { token: "admin-token" });
  const adminRes = await app.fetch(adminReq);
  expect(adminRes.status).toBe(200);
  
  // Viewer cannot access
  const viewerReq = createTestRequest("/protected", { token: "valid-token" });
  const viewerRes = await app.fetch(viewerReq);
  expect(viewerRes.status).toBe(403);
});
```

#### Testing Resource Ownership
```typescript
// Test ownership checks
test("enforces resource ownership", async () => {
  const { createApp } = setupRouteTest();
  const app = createApp(routes);
  
  // Owner can access their resource
  const ownerReq = createTestRequest("/issuers/test-issuer", { 
    method: "PUT",
    token: "owner-token",
    body: { name: "Updated" }
  });
  const ownerRes = await app.fetch(ownerReq);
  expect(ownerRes.status).toBe(200);
  
  // Non-owner cannot access
  const nonOwnerReq = createTestRequest("/issuers/test-issuer", {
    method: "PUT",
    token: "valid-token",
    body: { name: "Updated" }
  });
  const nonOwnerRes = await app.fetch(nonOwnerReq);
  expect(nonOwnerRes.status).toBe(403);
});
```

#### Testing Public Endpoints
```typescript
// Test public access
test("allows public access to public endpoints", async () => {
  const { createApp } = setupRouteTest();
  const app = createApp(routes);
  
  // No token required
  const req = createTestRequest("/issuers/test-issuer/verify");
  const res = await app.fetch(req);
  expect(res.status).toBe(200);
});
```

### 4. Best Practices

1. **Test Both Success and Failure Cases**
   - Always test both authorized and unauthorized scenarios
   - Test with missing tokens, invalid tokens, and insufficient permissions

2. **Mock Only What's Necessary**
   - For middleware tests, only mock the context
   - For route tests, mock JWT and database, but use real middleware

3. **Use Standard Test Users**
   - Use the provided test user objects for consistency
   - Follow the naming conventions: valid-token, admin-token, owner-token

4. **Test Complex Permission Chains**
   - Test middleware combinations that require multiple conditions
   - Test ownership checks along with role-based access

5. **Isolate Auth Testing**
   - Keep auth tests separate from business logic tests
   - Focus auth tests specifically on access control

### 5. Common Testing Scenarios

| Scenario | Test Approach | Key Utilities |
|----------|---------------|--------------|
| Testing middleware | Direct middleware | `createAuthTestContext`, `createNextFunction` |
| Testing route auth | Route integration | `setupRouteTest`, `createTestRequest` |
| Testing ownership | Route integration | `setupRouteTest`, `createTestRequest` |
| Testing JWT errors | Direct middleware | `mockJwtModule`, `expectHttpException` |
| Testing middleware chains | Direct middleware | `runMiddlewareChain` |

## Implementation Details

### File Structure

```
src/
  utils/
    test/
      auth-test-utils.ts   # Auth testing utilities
      route-test-utils.ts  # Route testing utilities
  __tests__/
    middleware/
      auth.test.ts         # Auth middleware tests
    routes/
      issuers.test.ts      # Route integration tests
```

### Key Components

- **Auth Middleware**: The authorization logic in `src/middleware/auth.ts`
- **Utility Functions**: Testing helpers in the `src/utils/test/` directory
- **Test Files**: Tests for middleware and routes with auth in `src/__tests__/`

## Usage Example

Complete example of testing an endpoint with auth:

```typescript
import { describe, expect, test } from "bun:test";
import { setupRouteTest, createTestRequest } from "../../utils/test/route-test-utils";
import issuerRoutes from "../../routes/issuer.routes";

describe("Issuer Routes Authorization", () => {
  test("enforces authorization rules", async () => {
    const { createApp } = setupRouteTest();
    const app = createApp(issuerRoutes);
    
    // Test with admin token - should succeed
    const adminReq = createTestRequest("/issuers", { token: "admin-token" });
    const adminRes = await app.fetch(adminReq);
    expect(adminRes.status).toBe(200);
    
    // Test with no token - should fail
    const noAuthReq = createTestRequest("/issuers");
    const noAuthRes = await app.fetch(noAuthReq);
    expect(noAuthRes.status).toBe(401);
    
    // Test with wrong role - should fail
    const viewerReq = createTestRequest("/issuers/new", { 
      method: "POST",
      token: "valid-token",
      body: { name: "New Issuer", url: "https://test.com" }
    });
    const viewerRes = await app.fetch(viewerReq);
    expect(viewerRes.status).toBe(403);
  });
}); 