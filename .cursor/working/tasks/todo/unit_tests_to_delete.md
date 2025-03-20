# Unit Tests to Delete

This document identifies unit tests that have already been migrated to integration tests and should be deleted.

## Files to Delete Immediately

These unit tests have direct integration test counterparts and test the same functionality, making them redundant:

1. **`src/services/__tests__/verification.service.test.ts`**
   - Replaced by: `src/services/__tests__/integration/verification.integration.test.ts`
   - Status: ✅ Integration test is working properly
   - Note: Verification is better tested with real database interactions

2. **`src/services/__tests__/edge-cases/verification.edge.test.ts`**
   - Replaced by: `src/services/__tests__/integration/verification.edge.integration.test.ts`
   - Status: ✅ Integration test is working properly
   - Note: Edge cases benefit from integration testing with real database

3. **`src/__tests__/controllers/auth.controller.test.ts`**
   - Replaced by: `src/__tests__/controllers/integration/auth.controller.integration.test.ts`
   - Status: ✅ Fully migrated to integration test
   - Note: Integration test provides better coverage with real database interactions

## Additional Files to Verify and Delete

These files appear to have integration test counterparts but require verification before deletion:

1. **`src/__tests__/controllers/oauth.controller.test.ts`**
   - Replaced by: `src/__tests__/controllers/integration/oauth.controller.integration.test.ts`
   - Status: ✅ Integration test appears comprehensive
   - Action: Verify test coverage then delete

2. **`src/__tests__/routes/assertions.routes.test.ts`**
   - Replaced by: `src/__tests__/routes/integration/assertions.integration.test.ts`
   - Status: Integration test exists but needs verification
   - Action: Compare test coverage before deletion

3. **`src/__tests__/routes/badges.routes.test.ts`**
   - Replaced by: `src/__tests__/routes/integration/badges.integration.test.ts`
   - Status: Integration test exists but needs verification
   - Action: Compare test coverage before deletion

## Duplicated Structure Tests to Investigate

Tests that appear to be duplicated and might need cleanup:

1. **`src/controllers/auth/auth.controller.test.ts`** and **`src/__tests__/controllers/auth.controller.test.ts`**
   - Investigate which one is more comprehensive
   - Determine if both are replaced by integration tests
   - Action: Delete both if integration tests provide sufficient coverage

2. **`src/controllers/issuer/unit/issuer.controller.test.ts`** and **`src/__tests__/controllers/issuer.controller.test.ts`**
   - Investigate if both are redundant
   - Check integration test coverage
   - Action: Delete both if integration tests provide sufficient coverage

## Implementation Plan

1. Create a git branch for test cleanup: `git checkout -b cleanup/remove-duplicate-tests`

2. Delete the verification test files first:
   ```bash
   rm src/services/__tests__/verification.service.test.ts
   rm src/services/__tests__/edge-cases/verification.edge.test.ts
   ```

3. Run the integration tests to ensure everything passes:
   ```bash
   ./test-integration.sh
   ```

4. Delete the auth controller test next:
   ```bash
   rm src/__tests__/controllers/auth.controller.test.ts
   ```

5. Run tests again to verify no regressions

6. Investigate and delete additional files after verification

7. Commit with descriptive message:
   ```
   git commit -m "refactor(test): remove redundant unit tests replaced by integration tests
   
   - Removed verification unit tests that are better tested with integration tests
   - Removed auth controller unit tests now covered by integration tests
   - Strategic decision to prioritize integration tests for DB-dependent functionality"
   ```

8. Update documentation to note the testing strategy change 