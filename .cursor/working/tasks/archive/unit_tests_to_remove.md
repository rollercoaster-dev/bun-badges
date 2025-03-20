# Unit Tests to Remove/Skip

This document identifies unit tests that have already been migrated to integration tests and can be considered for removal or skipping.

## Primary Candidates

These unit tests have direct integration test counterparts and test the same functionality, making them redundant:

1. **`src/__tests__/controllers/auth.controller.test.ts`**
   - Replaced by: `src/__tests__/controllers/integration/auth.controller.integration.test.ts`
   - Status: ✅ Fully migrated to integration test
   - Recommendation: Remove - Integration test is complete

2. **`src/services/__tests__/credential.service.test.ts`**
   - Replaced by: `src/services/__tests__/integration/credential.service.integration.test.ts`
   - Status: ✅ Fully migrated to integration test
   - Recommendation: Remove - Integration test is complete

3. **`src/services/__tests__/verification.service.test.ts`**
   - Replaced by: `src/services/__tests__/integration/verification.integration.test.ts`
   - Status: ✅ Integration test is working properly
   - Recommendation: Skip with comments - Due to strategic decision to prioritize integration tests

4. **`src/services/__tests__/edge-cases/verification.edge.test.ts`**
   - Replaced by: `src/services/__tests__/integration/verification.edge.integration.test.ts`
   - Status: ✅ Integration test is working properly
   - Recommendation: Skip with comments - Due to strategic decision to prioritize integration tests

5. **`src/__tests__/controllers/oauth.controller.test.ts`**
   - Replaced by: `src/__tests__/controllers/integration/oauth.controller.integration.test.ts`
   - Status: ✅ Integration test appears to be comprehensive
   - Recommendation: Remove after verification

## Duplicated Structure Tests

Tests that appear to be duplicated or have multiple implementations:

1. **`src/controllers/auth/auth.controller.test.ts`** and **`src/__tests__/controllers/auth.controller.test.ts`**
   - Two unit tests for the same controller
   - Both have integration test counterparts
   - Recommendation: Need to check content before removal

2. **`src/controllers/issuer/unit/issuer.controller.test.ts`** and **`src/__tests__/controllers/issuer.controller.test.ts`**
   - Two unit tests for the same controller
   - Both have integration test counterparts
   - Recommendation: Need to check content before removal

## Potential Candidates

These files have integration test counterparts but may need more verification before removing:

1. **`src/__tests__/routes/assertions.routes.test.ts`**
   - Potential replacement: `src/__tests__/routes/integration/assertions.integration.test.ts`
   - Status: Integration test exists but may need verification
   - Recommendation: Evaluate test coverage before removing

2. **`src/__tests__/routes/badges.routes.test.ts`**
   - Potential replacement: `src/__tests__/routes/integration/badges.integration.test.ts`
   - Status: Integration test exists but may need verification
   - Recommendation: Evaluate test coverage before removing

3. **`src/__tests__/routes/issuers.test.ts`**
   - Potential replacement: Multiple issuer integration tests
   - Status: Need to verify all functionality is covered
   - Recommendation: Evaluate test coverage before removing

## Implementation Strategy

For each identified test:

1. **For immediate removal** (first two in primary candidates):
   - Create a git branch for the change
   - Remove the file
   - Run full test suite to ensure no regressions
   - Add comment to PR about why it was removed

2. **For skipping** (verification tests):
   - Add `.skip` to the test definitions
   - Add a comment explaining the strategic decision
   - Example:
     ```typescript
     // Unit tests skipped in favor of integration tests (see verification.integration.test.ts)
     // Strategic decision made to prioritize integration testing for verification functionality
     describe.skip("VerificationService", () => {
       // Test body...
     });
     ```

3. **For potential candidates**:
   - Compare test coverage between unit and integration tests
   - Document any gaps in coverage
   - Only remove if integration tests provide equivalent or better coverage 