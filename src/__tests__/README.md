# Open Badges API Testing Guide

This directory contains tests for the Open Badges API endpoints. The tests use Bun's built-in testing framework and are designed to validate that the API endpoints function as expected.

## Testing Structure

- `/controllers` - Tests for controller functionality
- `/middleware` - Tests for middleware components
- `/routes` - Tests for route handlers and API endpoints
- `/utils` - Tests for utility functions

## Running Tests

To run all tests:

```bash
bun test
```

To run a specific test file:

```bash
bun test src/__tests__/routes/assertions.routes.test.ts
```

## Test Patterns

The tests follow these common patterns:

1. **Mock setup**: Mock database, request contexts, and dependencies
2. **Test cases**: Define test cases for various scenarios including:
   - Success paths
   - Error handling (validation errors, not found, etc.)
   - Edge cases (empty datasets, missing fields, etc.)
3. **Assertions**: Validate response status, structure, and content

## Mock Strategy

Most tests use Bun's mocking capabilities to simulate database operations and external dependencies:

- Database operations are mocked to avoid actual database interactions
- Crypto functions are mocked for deterministic output in tests
- Request/response objects are mocked to simulate API calls

## Badge Management API Tests

The badge management API tests validate:

1. **Badge Endpoints**:
   - Listing badges with filtering
   - Retrieving specific badges
   - Creating new badges
   - Updating existing badges
   - Deleting badges with dependency checks

2. **Assertion Endpoints**:
   - Listing assertions with filtering
   - Retrieving specific assertions
   - Creating assertions (issuing badges)
   - Revoking assertions with reason tracking
   - Identity hashing for privacy protection 