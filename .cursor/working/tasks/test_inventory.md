# Test Inventory: Unit vs Integration Tests

This document tracks test files that need to be evaluated for potential migration from unit tests with database mocks to proper integration tests.

## Identified Integration Test Files

These tests are already properly set up as integration tests:

| File Path | Test Type | Status | Notes |
|-----------|-----------|--------|-------|
| `/src/__tests__/controllers/integration/issuer-verify.integration.test.ts` | Integration | ✅ Good | Uses proper setup/teardown with real DB |
| `/src/services/__tests__/credential.integration.test.ts` | Integration | ✅ Good | Uses real DB with thorough test patterns |

## Unit Tests with DB Mocks

These unit tests use database mocks but might benefit from being converted to integration tests:

| File Path | Current Test Type | Migration Status | DB Mock Usage | Notes |
|-----------|-------------------|------------------|---------------|-------|
| `/src/utils/signing/__tests__/signing.test.ts` | Unit | 🔍 Evaluate | Low | Has mock setup but skips when run in test suite |
| *Add more tests here* | | | | |

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
- [ ] Fix remaining TypeScript errors in test utility files
- [ ] Complete inventory of all test files
- [ ] Migrate first test to integration pattern
- [ ] Update test scripts to verify pattern works

## Test Organization Guidelines

- **Unit Tests Location**: `src/*/test/*.test.ts` or `src/*/__tests__/*.test.ts`
- **Integration Tests Location**: `src/*/test/*.integration.test.ts` or `src/*/__tests__/integration/*.test.ts`
- **Test Directory Structure**: Prefer mirroring the source structure with __tests__ folders