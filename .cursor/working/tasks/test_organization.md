# Test Organization Strategy

## 1. Goal
- **Objective:** Reorganize tests to properly separate unit tests with DB mocks from integration tests
- **Energy Level:** Medium 🔋
- **Status:** 🟡 In Progress

## 2. Resources
- **Existing Tools/Files:** 
  - `/tests/setup.ts` - Main test setup file with DB mock configuration
  - `/src/utils/test/integration-setup.ts` - Integration test setup with real DB connections
  - `/src/utils/test/unit-setup.ts` - Unit test setup with DB mocks
  - `/src/__tests__/` - Top-level tests
  - `src/utils/test/db-helpers.ts` - Database helpers for seeding and clearing test data
  - `package.json` - Test script configurations
  - `docker-compose.test.yml` - Test database configuration
  - `test-integration.sh` - Integration test runner script

- **Additional Needs:**
  - Comprehensive audit of all test files
  - Inventory of database mocks that should be converted to integration tests

- **Related Files:**
  - All `*.test.ts` files that interact with the database
  - All existing `*.integration.test.ts` files

## 3. Ideas & Challenges
- **Approaches:**
  - Use file naming pattern (`*.integration.test.ts`) for tests that need real DB
  - Create `/integration/` subdirectories within test folders for organization
  - Convert tests that verify complex DB interactions to integration tests
  - Keep pure logic and component tests as unit tests with mocks
  - Leverage existing DB helper functions for integration test data setup
  
- **Potential Issues:**
  - Tests may fail when moving from mocks to real DB (different behavior)
  - Integration tests will be slower to run than unit tests
  - Need to ensure proper DB cleanup between test runs
  - TypeScript errors in test files need to be addressed
  
- **Decision Log:**
  - Decision: Maintain dual-approach with both unit and integration tests
  - Reasoning: Unit tests provide fast feedback for pure logic, while integration tests verify actual DB behavior
  - Alternatives: Moving all DB-dependent tests to integration tests would be comprehensive but slow down the test suite

## 4. Plan
- **Quick Wins:**
  - [ ] Fix TypeScript errors in existing test files (30 mins)
  - [ ] Document criteria for determining when to use integration vs. unit tests (15 mins)
  
- **Major Steps:**
  1. Inventory Test Files: Catalog all test files and classify by DB interaction type (60 mins) 🎯
     - Create spreadsheet tracking file paths, test types, and mock usage
     - Identify which mocked DB tests should be integration tests

  2. Create Migration Templates: Develop standard patterns for converting tests (45 mins) 🎯
     - Template for converting unit tests with DB mocks to integration tests
     - Standard setup/teardown pattern for DB-dependent tests

  3. Update Test Setup Files: Refine integration and unit test setups (30 mins) 🎯
     - Ensure proper DB connection for integration tests
     - Improve mock data quality in unit tests
     - Fix unused variable TypeScript errors

  4. Perform Test Migrations: Convert identified tests to integration tests (120 mins) 🎯
     - Update imports to use integration-setup.ts instead of unit-setup.ts
     - Add proper beforeEach/afterEach hooks for DB seeding
     - Rename files to follow the *.integration.test.ts pattern
     - Move files to /integration/ subdirectories where appropriate

  5. Update Test Scripts: Ensure proper test script configurations (15 mins) 🎯
     - Verify test:unit excludes integration tests
     - Verify test:integration includes all integration tests
     - Update test:all to run both types sequentially

  6. Update Documentation: Revise testing docs to reflect new organization (30 mins) 🎯
     - Update TESTING.md with clear guidelines
     - Document the migration process and decisions

  7. Validate Test Suite: Run full test suite to verify all tests pass (30 mins) 🎯
     - Run unit tests to verify they still pass
     - Run integration tests to verify DB interactions
     - Run full suite to ensure no conflicts

## 5. Execution
- **Progress Updates:**
  - [x] Quick Win: Fixed several TypeScript errors in test files:
    - Added underscore prefixes to unused parameters in integration-setup.ts
    - Removed unused imports from db-helpers.ts and credential.integration.test.ts
    - Fixed unused variable in issuer-verify.integration.test.ts
    - Fixed unused parameter in signing.test.ts
  
  - [ ] Step One: Inventory Test Files
    - Started analysis of test setup files
    - Identified key differences between unit and integration setups
    - Analyzed integration test structure and patterns
    - Found several examples of test files that need migration

- **Context Resume Point:**
  Last working on: Fixed all TypeScript errors in test utility files
  Next planned action: Identify candidate tests for migration to integration tests
  Current blockers: None - All TypeScript errors have been fixed

## 6. Next Actions & Blockers
- **Immediate Next Actions:** 
  - [x] Fix TypeScript errors in remaining test utilities (45 mins):
    - [x] crypto-setup.ts
    - [x] unit-setup.ts
    - [x] setup.ts  
  - [x] Create test inventory document to track migration status (20 mins)
  - [ ] Add more tests to the inventory document as they are identified (30 mins)
  - [ ] Convert first test from unit to integration pattern (60 mins)
  
- **Current Blockers:**
  - None - All TypeScript errors have been fixed
  - Need to verify Docker setup is working correctly for integration tests

## 7. User Experience & Reflection
- **Friction Points:** 
  - Multiple test setup files with similar structures but different purposes
  - Unused variables causing TypeScript errors throughout test files
  - Determining which DB-dependent tests truly need real DB interactions
  
- **Flow Moments:** 
  - Well-organized test scripts in package.json
  - Clear separation between unit and integration test setups
  - Robust DB helpers for seeding test data

- **Observations:** 
  - The project has a solid foundation for testing with both unit and integration approaches
  - The DB mocking system is detailed and comprehensive
  - Integration test infrastructure is already in place with Docker support
  - Test files follow consistent patterns that will make migrations straightforward
  
- **Celebration Notes:** 🎉 
  - The existing test organization already follows good practices
  - Docker setup for test database is well-configured
  - Helper functions for test data seeding will simplify integration test migrations
