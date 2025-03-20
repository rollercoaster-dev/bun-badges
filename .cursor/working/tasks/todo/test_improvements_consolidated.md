# Consolidated Test Improvements

## 1. Goal
- **Objective:** Fix remaining test issues and improve test organization
- **Energy Level:** Medium 🔋
- **Status:** 🟡 In Progress

## 2. Background
This task consolidates the remaining work from the following completed tasks:
- ✅ Test Runner Improvements - Created better scripts for running tests
- ✅ Test Integration Report - Fixed database connection management
- ✅ Test Inventory - Cataloged all tests
- ✅ Test Organization - Established directory structure and patterns

## 3. Remaining Issues

### 3.1 Fix credential.service.integration.test.ts 'pool' Import Issue
- **Description:** The credential.service.integration.test.ts file fails with an import error regarding the 'pool' export from integration-setup.ts
- **Solution:** Update exports in integration-setup.ts to properly expose the database pool
- **Estimated time:** 30 minutes

### 3.2 Fix UUID Validation in API Routes
- **Description:** UUID validation in assertions and badges routes causes 500 errors instead of the expected 404 errors
- **Solution:** Update route handlers to properly validate UUIDs and return 404 responses
- **Estimated time:** 45 minutes

### 3.3 Continue Test Migration
- **Description:** Convert more unit tests that use database mocks to proper integration tests
- **Priority order:**
  1. Controller tests (oauth.controller.test.ts)
  2. Route tests (badges.routes.test.ts, assertions.routes.test.ts)
  3. Middleware tests (auth.middleware.test.ts)
- **Estimated time:** 2-3 hours

## 4. Execution Plan

### Phase 1: Fix Critical Integration Test Issues
1. Fix credential.service.integration.test.ts 'pool' import issue:
   - Examine integration-setup.ts exports
   - Update to ensure proper pool export
   - Verify test runs successfully

2. Fix UUID validation 500 errors:
   - Identify validation middleware
   - Update to catch invalid UUIDs and return 404
   - Test assertions and badges endpoints with invalid UUIDs

### Phase 2: Continue Test Migration
1. Start with controller tests:
   - Convert oauth.controller.test.ts to integration test
   - Move to appropriate directory structure
   - Update to use real database connections

2. Move to route tests:
   - Convert badges.routes.test.ts and assertions.routes.test.ts
   - Update test assertions to match actual system behavior
   - Verify with real database interactions

3. Finally, middleware tests:
   - Convert auth.middleware.test.ts if needed
   - Update test expectations for real token validation

## 5. Success Criteria
- All integration tests pass successfully
- UUID validation returns proper 404 errors
- Test structure follows established patterns
- Database connection issues are resolved
- No "Cannot use a pool after calling end on the pool" errors

## 6. Next Actions
- [ ] Fix credential.service.integration.test.ts 'pool' import issue
- [ ] Fix UUID validation in assertions and badges routes
- [ ] Convert oauth.controller.test.ts to integration test
- [ ] Convert route tests to integration tests
- [ ] Convert middleware tests to integration tests
- [ ] Final verification of all tests passing
