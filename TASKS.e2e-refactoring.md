# E2E Test Refactoring Tasks

## Phase 1: Foundation (1-2 days)

- [ ] Create new directory structure
  - [ ] Set up `tests/e2e/flows` with domain-specific subdirectories:
    - [ ] `badge-lifecycle/` - Full badge lifecycle flows
    - [ ] `auth/` - Authentication tests
    - [ ] `cryptographic/` - Proof generation and verification
    - [ ] `recipient/` - Recipient handling (hashed vs. unhashed)
    - [ ] `status/` - Status list and revocation
    - [ ] `structural/` - Badge structure validation
  - [ ] Organize `tests/e2e/helpers/` for test helper functions
    - [ ] `test-utils.ts` - Core test utilities
    - [ ] `crypto-utils.ts` - Cryptographic testing utilities
    - [ ] `schema-utils.ts` - Schema validation utilities
    - [ ] `flow-utils.ts` - Common test flow patterns
  - [ ] Create `tests/e2e/fixtures/` directory for test data
    - [ ] `schemas/` - JSON schemas
    - [ ] `contexts/` - JSON-LD contexts
    - [ ] `keys/` - Test cryptographic keys
    - [ ] `payloads/` - Sample request/response payloads

- [x] Set up improved test environment configuration
  - [x] Create `tests/e2e/setup/environment.ts` for centralized environment setup
  - [x] Implement consistent environment variable handling
  - [x] Add test-specific configuration loading
  - [x] Create `tests/e2e/setup/server-setup.ts` for test server configuration

- [x] Refactor database handling
  - [x] Create pool per test run instead of globally
  - [x] Implement proper cleanup mechanisms
  - [x] Add transaction support for test isolation
  - [ ] Update `docker-compose.test.yml` with enhanced configuration

## Phase 2: Core Utilities (2-3 days)

- [ ] Develop enhanced test utilities
  - [ ] Create `tests/e2e/utils/request.ts` with improved request handling
    - [ ] Implement `issueTestBadge()` utility
    - [ ] Implement `verifyTestBadge()` utility
    - [ ] Implement `revokeTestBadge()` utility
  - [ ] Enhance authentication utilities
    - [ ] Improve `registerAndLoginUser()` with better error handling
    - [ ] Add support for different authentication strategies

- [ ] Create schema validation framework
  - [ ] Implement `tests/e2e/utils/schema-validator.ts`
  - [ ] Add `validateAgainstSchema()` function
  - [ ] Integrate OB3 JSON schemas

- [ ] Implement OB3 validation utilities
  - [ ] Create `tests/e2e/utils/validation.ts`
  - [ ] Implement `validateOB3Structure()` function
  - [ ] Implement `validateProof()` function
  - [ ] Implement `validateStatusList()` function
  - [ ] Implement `validateRecipient()` function
  - [ ] Add JSON-LD context validation

## Phase 3: Test Migration (3-4 days)

- [ ] Create compliance test factories
  - [ ] Implement `tests/e2e/helpers/compliance-tests.ts`
  - [ ] Add factory functions for structural tests
  - [ ] Add factory functions for cryptographic tests
  - [ ] Add factory functions for status tests
  - [ ] Add factory functions for recipient tests

- [ ] Migrate and enhance existing tests
  - [ ] Refactor OB3 compliance tests
  - [ ] Update badge lifecycle tests
  - [ ] Enhance authentication tests
  - [ ] Improve database integration tests

- [ ] Implement specific OB3 compliance test files
  - [ ] Create `tests/e2e/flows/structural/context-validation.test.ts`
  - [ ] Create `tests/e2e/flows/structural/schema-validation.test.ts`
  - [ ] Create `tests/e2e/flows/cryptographic/proof-generation.test.ts`
  - [ ] Create `tests/e2e/flows/cryptographic/signature-verification.test.ts`
  - [ ] Create `tests/e2e/flows/status/revocation-list.test.ts`
  - [ ] Create `tests/e2e/flows/recipient/hashed-recipient.test.ts`

- [ ] Create full lifecycle test flows
  - [ ] Implement issue → verify → revoke cycle tests
  - [ ] Add OAuth authentication flow tests
  - [ ] Create edge case tests (tampering, invalid signatures)

## Phase 4: Reporting and CI Integration (1-2 days)

- [ ] Implement compliance tracking
  - [ ] Create `tests/e2e/utils/compliance-tracker.ts`
  - [ ] Add `trackTest()` function for requirement tracking
  - [ ] Implement `generateComplianceReport()` function
  - [ ] Add mapping between tests and OB3 requirements

- [ ] Update scripts in package.json
  - [ ] Add granular test scripts for different test categories
  - [ ] Create combined test script with reporting
  - [ ] Configure test output formats

- [ ] Update CI configuration
  - [ ] Configure GitHub Actions for test categorization
  - [ ] Add test artifacts preservation
  - [ ] Set up test summaries in PR comments

- [ ] Create comprehensive test documentation
  - [ ] Update `tests/e2e/README.md` with detailed instructions
  - [ ] Document test utilities and their usage
  - [ ] Add examples for creating new tests
  - [ ] Create OB3 requirements-to-tests mapping document

## Completed Fixes

- [x] Fixed async function issue in `revocation-list.test.ts`
- [x] Fixed database connection pooling to properly handle multiple test files
- [x] Implemented proper database cleanup to prevent resource leaks
- [x] Added SIGINT handler to ensure database connections are closed on termination

## Immediate Next Steps

1. Fix remaining test failures:
   - [ ] Fix the OAuth flow test that expects a 200 status but receives 401
   - [ ] Fix the Badge Lifecycle test that fails with validation errors
   - [ ] Fix the Schema Validation test that has incorrect subject expectations

2. Create PR with current changes:
   - [ ] Update commit message with clear explanation of fixed issues
   - [ ] Add proper documentation for the fixes
   - [ ] Include details about the new database connection handling
   - [ ] Reference the approach from the protocol document

3. Plan next iteration:
   - [ ] Choose the next section of the refactoring plan to implement
   - [ ] Prioritize test utilities that will make future test development easier
   - [ ] Consider adding test coverage reporting

## Reference Structure

```
tests/
├── e2e/
│   ├── flows/                   # Test flows by domain
│   │   ├── badge-lifecycle/     # Full badge lifecycle flows
│   │   ├── auth/                # Authentication tests
│   │   ├── cryptographic/       # Proof generation and verification
│   │   ├── recipient/           # Recipient handling (hashed vs. unhashed)
│   │   ├── status/              # Status list and revocation
│   │   └── structural/          # Badge structure validation
│   ├── helpers/                 # Test helper functions
│   │   ├── test-utils.ts        # Core test utilities
│   │   ├── crypto-utils.ts      # Cryptographic testing utilities
│   │   ├── schema-utils.ts      # Schema validation utilities
│   │   └── flow-utils.ts        # Common test flow patterns
│   ├── fixtures/                # Test data
│   │   ├── schemas/             # JSON schemas
│   │   ├── contexts/            # JSON-LD contexts
│   │   ├── keys/                # Test cryptographic keys
│   │   └── payloads/            # Sample request/response payloads
│   ├── setup/                   # Test environment setup
│   │   ├── db-setup.ts          # Database setup/teardown
│   │   ├── server-setup.ts      # Test server setup
│   │   └── mocks.ts             # Common test mocks
│   ├── utils/                   # Low-level testing utilities
│   │   ├── db-utils.ts          # Database utilities
│   │   ├── validation.ts        # OB3 validation utilities 
│   │   └── request.ts           # Enhanced request utilities
│   ├── index.ts                 # Main entry point
│   └── README.md                # Documentation
``` 