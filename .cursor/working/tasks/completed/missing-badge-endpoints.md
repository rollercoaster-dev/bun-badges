# Missing Badge Endpoints

## Issues

Tests show that several badge-related endpoints expected by our E2E test suite are not implemented in the real application:

- GET /badges/public returns 404 (expected 200)
- GET /badges/private returns 404 (expected 401 when unauthenticated)

## Required Implementation

1. Create or update the badge router to handle:
   - GET /badges/public - For retrieving public badges
   - GET /badges/private - For retrieving private badges (requiring authentication)
   - POST /badges - For creating new badges
   - GET /badges/:id - For retrieving a specific badge

2. Ensure responses match expected formats:
   - Public endpoints should be accessible without authentication
   - Private endpoints should return 401 when accessed without authentication
   - Badge creation should return status 201 with a JSON body including the id

3. Implement authentication middleware for protected endpoints

## Acceptance Criteria

- E2E tests for badge endpoints pass when running with real endpoints
- Public endpoints are accessible without authentication
- Private endpoints require valid authentication
- Badge CRUD operations work as expected

## Relevant Test Files

- src/tests/e2e/examples/real-app-test.spec.ts
- src/tests/e2e/examples/database-operations.spec.ts
- src/tests/e2e/examples/badge-flow.spec.ts 