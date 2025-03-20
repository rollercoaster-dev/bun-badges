# Test Inventory: Unit vs Integration Tests

This document tracks test files that need to be evaluated for potential migration from unit tests with database mocks to proper integration tests.

## Identified Integration Test Files

These tests are already properly set up as integration tests:

| File Path | Test Type | Status | Notes |
|-----------|-----------|--------|-------|
| `/src/__tests__/controllers/integration/issuer-verify.integration.test.ts` | Integration | ✅ Good | Uses proper setup/teardown with real DB |
| `/src/__tests__/controllers/integration/auth.controller.integration.test.ts` | Integration | ✅ Good | Tests authentication with real DB |
| `/src/__tests__/controllers/integration/issuer-create.integration.test.ts` | Integration | ✅ Good | Tests issuer creation with real DB |
| `/src/__tests__/controllers/integration/issuer-delete.integration.test.ts` | Integration | ✅ Good | Tests issuer deletion with real DB |
| `/src/__tests__/controllers/integration/issuer-get.integration.test.ts` | Integration | ✅ Good | Tests issuer retrieval with real DB |
| `/src/__tests__/controllers/integration/issuer-update.integration.test.ts` | Integration | ✅ Good | Tests issuer updates with real DB |
| `/src/__tests__/controllers/integration/oauth.controller.integration.test.ts` | Integration | ✅ Good | Tests OAuth flows with real DB |
| `/src/__tests__/routes/integration/assertions.integration.test.ts` | Integration | ✅ Good | Tests assertion routes with real DB |
| `/src/__tests__/routes/integration/badges.integration.test.ts` | Integration | ✅ Good | Tests badge routes with real DB |
| `/src/services/__tests__/credential.integration.test.ts` | Integration | ✅ Good | Uses real DB with thorough test patterns |
| `/src/services/__tests__/integration/credential.integration.test.ts` | Integration | ✅ Good | Tests credential service with real DB |
| `/src/services/__tests__/integration/verification.edge.integration.test.ts` | Integration | ✅ Good | Tests edge cases with real DB |
| `/src/services/__tests__/integration/verification.integration.test.ts` | Integration | ✅ Good | Tests verification with real DB |
| `/tests/integration/database.test.ts` | Integration | ✅ Good | Basic database connection tests |
| `/tests/integration/schema.test.ts` | Integration | ✅ Good | Tests database schema with real DB |
| `/src/__tests__/controllers/integration/issuer-create.integration.test.ts` | Integration | ✅ Good | Tests issuer creation with real DB |
| `/src/__tests__/controllers/integration/issuer-delete.integration.test.ts` | Integration | ✅ Good | Tests issuer deletion with real DB |
| `/src/__tests__/controllers/integration/issuer-get.integration.test.ts` | Integration | ✅ Good | Tests issuer retrieval with real DB |
| `/src/__tests__/controllers/integration/issuer-update.integration.test.ts` | Integration | ✅ Good | Tests issuer updates with real DB |
| `/src/__tests__/controllers/integration/issuer.controller.integration.test.ts` | Integration | ✅ Good | Tests issuer controller with real DB |
| `/src/__tests__/controllers/integration/oauth.controller.integration.test.ts` | Integration | ✅ Good | Tests OAuth flows with real DB |
| `/src/__tests__/routes/integration/assertions.integration.test.ts` | Integration | ✅ Good | Tests assertion routes with real DB |
| `/src/__tests__/routes/integration/badges.integration.test.ts` | Integration | ✅ Good | Tests badge routes with real DB |
| `/src/services/__tests__/credential.integration.test.ts` | Integration | ✅ Good | Uses real DB with thorough test patterns |
| `/src/services/__tests__/integration/credential.integration.test.ts` | Integration | ✅ Good | Tests credential service with real DB |
| `/src/services/__tests__/integration/verification.edge.integration.test.ts` | Integration | ✅ Good | Tests edge cases with real DB |
| `/src/services/__tests__/integration/verification.integration.test.ts` | Integration | ✅ Good | Tests verification with real DB |

## Unit Tests with DB Mocks

These unit tests use database mocks but might benefit from being converted to integration tests:

| File Path | Current Test Type | Migration Status | DB Mock Usage | Notes |
|-----------|-------------------|------------------|---------------|-------|
| `/src/utils/signing/__tests__/signing.test.ts` | Unit | 🔍 Evaluate | Low | Has mock setup but skips when run in test suite |
| `/src/__tests__/controllers/auth.controller.test.ts` | Unit | ✅ Migrated | Medium | Migrated to integration test at `src/__tests__/controllers/integration/auth.controller.integration.test.ts` |
| `/src/__tests__/controllers/issuer.controller.test.ts` | Unit | 🔍 Evaluate | Medium | Tests issuer operations, real DB would be more thorough |
| `/src/__tests__/controllers/oauth.controller.test.ts` | Unit | 🔍 Evaluate | Medium | Tests OAuth operations, real DB would validate flows better |
| `/src/__tests__/middleware/auth.middleware.test.ts` | Unit | 🔍 Evaluate | Low | Tests auth middleware, may need real DB for token validation |
| `/src/__tests__/routes/assertions.routes.test.ts` | Unit | 🔍 Evaluate | Medium | Tests assertion routes, should verify with real DB |
| `/src/__tests__/routes/badges.routes.test.ts` | Unit | 🔍 Evaluate | Medium | Tests badge routes, should verify with real DB |
| `/src/services/__tests__/credential.service.test.ts` | Unit | ✅ Migrated | High | Converted to integration test with real DB interactions |
| `/src/services/__tests__/verification.service.test.ts` | Unit | 🔍 Evaluate | High | Tests verification operations with DB mocks |
| `/src/__tests__/controllers/issuer.controller.test.ts` | Unit | 🔍 Evaluate | Medium | Tests issuer operations, real DB would be more thorough |
| `/src/__tests__/controllers/oauth.controller.test.ts` | Unit | 🔍 Evaluate | Medium | Tests OAuth operations, real DB would validate flows better |
| `/src/__tests__/middleware/auth.middleware.test.ts` | Unit | 🔍 Evaluate | Low | Tests auth middleware, may need real DB for token validation |
| `/src/__tests__/middleware/auth.test.ts` | Unit | 🔍 Evaluate | Low | Tests auth utility functions, may benefit from real DB |
| `/src/__tests__/routes/assertions.routes.test.ts` | Unit | 🔍 Evaluate | Medium | Tests assertion routes, should verify with real DB |
| `/src/__tests__/routes/badges.routes.test.ts` | Unit | 🔍 Evaluate | Medium | Tests badge routes, should verify with real DB |
| `/src/__tests__/routes/issuers.test.ts` | Unit | 🔍 Evaluate | Medium | Tests issuer routes, should verify with real DB |
| `/src/services/__tests__/verification.service.test.ts` | Unit | 🔍 Evaluate | High | Tests verification operations with DB mocks |

## Test Utility Files

These files provide test setup and utilities that need to be maintained:

| File Path | Purpose | TypeScript Status | Notes |
|-----------|---------|-------------------|-------|
| `/src/utils/test/integration-setup.ts` | Integration test setup | ✅ Fixed | Provides DB connection and crypto mocks |
| `/src/utils/test/unit-setup.ts` | Unit test setup | ✅ Fixed | Contains crypto and database mocks |
| `/src/utils/test/db-helpers.ts` | DB utilities | ✅ Fixed | Provides seed/clear functions |
| `/src/utils/test/crypto-setup.ts` | Crypto mocks | ✅ Fixed | Provides deterministic crypto functions |
| `/tests/setup.ts` | Main setup | ✅ Fixed | Contains environment config and mock setup |

## Migration Criteria

Tests should be migrated to integration tests if they:

1. Test DB-dependent functionality like controllers, services, or repositories
2. Verify complex data patterns that are difficult to mock correctly
3. Test DB-specific features or query patterns
4. Validate data integrity across multiple tables
5. Test operations that should verify actual database state

## Migration Progress

- [x] Fixed TypeScript errors in integration-setup.ts
- [x] Fixed TypeScript errors in db-helpers.ts
- [x] Fix remaining TypeScript errors in test utility files
- [x] Complete inventory of all test files
- [x] Migrate first test to integration pattern (credential.service.test.ts)
- [x] Migrate auth.controller.test.ts to integration test
- [ ] Identify next test for migration
- [ ] Update test scripts to verify pattern works

## Test Organization Guidelines

- **Unit Tests Location**: `src/*/test/*.test.ts` or `src/*/__tests__/*.test.ts`
- **Integration Tests Location**: `src/*/test/*.integration.test.ts` or `src/*/__tests__/integration/*.test.ts`
- **Test Directory Structure**: Prefer mirroring the source structure with __tests__ folders
