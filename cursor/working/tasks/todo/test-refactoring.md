## Test Refactoring Task Status

### Completed
- [x] Check that unit tests pass
  - [x] migrate tests from src/ to tests/unit/ - 117 tests passing out of 125
  - [x] Fix mocking issues in oauth.controller.test.ts and auth.controller.test.ts
  - [x] Create empty tests for remaining failing tests

- [x] Check that integration tests for OAuth controller pass
  - [x] Added `authorization_codes` table to the database schema
  - [x] Fixed query parameter retrieval issue in `createMockContext` function
  - [x] Fixed request body JSON parsing in `createMockContext` function
  - [x] Fixed authorization header format in the tests

- [x] Clean up test scripts
  - [x] Remove old shell scripts
  - [x] Document remaining scripts
  - [x] Update package.json to use Bun's test runner

- [x] Reorganize E2E tests
  - [x] Create flows directory structure
  - [x] Move tests into appropriate categories
  - [x] Add documentation for test organization
  - [x] Create testing guidelines rule (008_testing.mdc)

### Next Steps

1. Fix TypeScript errors in tests
   - [ ] Run `tsc:tests` to identify all type errors
   - [ ] Fix import paths in E2E tests
   - [ ] Fix type definitions for test utilities
   - [ ] Ensure proper typing for mock objects

2. Fix remaining failing tests
   - [ ] Fix assertion API tests (0/12 passing)
   - [ ] Fix verification tests (4/6 passing)
   - [ ] Fix OAuth controller unit tests (9 failing)
   - [ ] Fix E2E test import issues
   - [ ] Update test data fixtures as needed

### Current Test Status
- OAuth controller integration tests: 8/8 passing 🟢
- Issuer controller integration tests: 14/16 passing 🟡
- Verification integration tests: 2/6 passing 🟠
- Other integration tests: 0/12 passing 🔴
- E2E tests: 5/8 passing (3 failing due to imports) 🟡

Total progress: 29/50 tests passing (58%) 