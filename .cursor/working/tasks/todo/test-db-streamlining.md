# Test Database and Setup Streamlining

## Issues to Address
1. **Foreign key constraint violations** - Test data seeding order issues:
   - Issuers being created before users
   - Inconsistent references between tables
   - No proper transaction handling for test data creation

2. **Inconsistent MockContext implementation**:
   - Different access patterns (obj.prop vs. obj('prop'))
   - Missing methods in mock that exist in real context
   - Type definition issues causing linting errors

3. **Container lifecycle overhead**:
   - Each test run starts/stops Docker containers
   - Migrations run redundantly on each test
   - Long test execution time due to infrastructure setup

4. **Test data management**:
   - No isolation between different test runs
   - Manual cleanup required between tests
   - Potential for test interference

## Approach
1. **Standardize the mock context implementation**:
   - Create a unified MockContext that supports both access patterns
   - Add consistent HTML rendering, redirects, JSON responses
   - Fix type definitions to eliminate linting errors
   - Document usage patterns for future development

2. **Improve test data management**:
   - Create transaction-based test data seeding
   - Ensure proper entity creation order (users before issuers, etc.)
   - Implement automatic cleanup using database transactions
   - Create reusable fixtures with consistent IDs

3. **Optimize container lifecycle**:
   - Implement a persistent test database option
   - Add script to initialize test DB once per session
   - Use database restore points instead of rebuilding
   - Skip migrations when schema hasn't changed

4. **Create centralized test utilities**:
   - Standard setup/teardown procedures
   - Shared test data creation methods
   - Controller and route testing utilities
   - Authentication helpers for protected routes

## Progress
- [x] **Analyze current test data issues**
  - [x] Map database relationships and dependencies
  - [x] Identify foreign key constraint failures
  - [x] Create entity relationship diagram for test data

- [x] **Fix MockContext implementation**
  - [x] Update to support both property and function query access
  - [x] Add proper HTML and redirection support
  - [x] Add type definitions to eliminate linter errors
  - [x] Update param, header, and body access patterns

- [ ] **Optimize test database lifecycle**
  - [ ] Create persistent database script
  - [ ] Implement database reset between test runs
  - [ ] Add transaction support for test isolation
  - [ ] Update test scripts to use optimized pattern

- [x] **Update test data seeding**
  - [x] Ensure proper creation order for entities
  - [x] Implement transaction-based setup and teardown
  - [x] Create standard test data fixtures
  - [x] Fix foreign key constraint issues

- [ ] **Documentation and standardization**
  - [ ] Document the new test patterns
  - [ ] Create example tests using the new utilities
  - [ ] Update existing tests to use new patterns
  - [ ] Add test coverage metrics

## First Steps
1. Fix the MockContext implementation to support both access patterns
2. Update the test data seeding to use transactions and correct entity order
3. Create a test database initialization script that runs once per session
4. Update the test scripts to use the new optimized approach 