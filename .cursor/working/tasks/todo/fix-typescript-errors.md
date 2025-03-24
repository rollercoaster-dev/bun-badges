# Fix TypeScript Errors in Integration Tests

## Priority: High
## Status: Completed
## Created: 2024-03-23
## Completed: 2024-03-23
## Time Estimate: 1-2 hours
## Actual Time: 30 minutes

## Issue Summary

Running `bun tsc` reveals TypeScript errors in the integration tests. The primary issue is in `tests/integration/credential.integration.test.ts` where database operations are attempted using incorrect syntax:

```
$ tsc --noEmit
tests/integration/credential.integration.test.ts:56:10 - error TS2339: Property 'select' does not exist on type '() => NodePgDatabase<Record<string, unknown>> & { $client: NodePgClient; }'.
56         .select()
            ~~~~~~

tests/integration/credential.integration.test.ts:81:10 - error TS2339: Property 'insert' does not exist on type '() => NodePgDatabase<Record<string, unknown>> & { $client: NodePgClient; }'.
81         .insert(badgeClasses)
            ~~~~~~

tests/integration/credential.integration.test.ts:113:10 - error TS2339: Property 'insert' does not exist on type '() => NodePgDatabase<Record<string, unknown>> & { $client: NodePgClient; }'.
113         .insert(badgeAssertions)
             ~~~~~~

tests/integration/credential.integration.test.ts:201:10 - error TS2339: Property 'select' does not exist on type '() => NodePgDatabase<Record<string, unknown>> & { $client: NodePgClient; }'.
201         .select()
             ~~~~~~
```

The fundamental issue is that `testDb` is being used as an object with methods like `select()` and `insert()`, but it's actually exported as a function that returns a database object.

## Root Cause Analysis

- In `src/utils/test/integration-setup.ts`, `testDb` is exported as a function that returns the database object
- In `tests/integration/credential.integration.test.ts`, `testDb` is mistakenly used directly as if it were the database object

## Solution Implemented

Updated the `credential.integration.test.ts` file to correctly invoke the `testDb()` function before calling database methods:

```typescript
// Changed from:
const issuers = await testDb
  .select()
  .from(issuerProfiles)
  .where(eq(issuerProfiles.name, "Test Issuer"));

// To:
const issuers = await testDb()
  .select()
  .from(issuerProfiles)
  .where(eq(issuerProfiles.name, "Test Issuer"));
```

Made this change in all four instances where TypeScript was reporting errors (lines 56, 81, 113, and 201).

## Verification

1. Ran `bun tsc` to verify the errors are fixed - **Success**
2. Ran the integration tests to ensure they still function correctly - **Success**
```
bun test tests/integration/credential.integration.test.ts
✓ Credential Service Integration Tests > should create and verify a badge credential [46.55ms]
✓ Credential Service Integration Tests > should ensure issuer key exists [3.07ms]
```

## Related Issues

- This is related to `.cursor/working/tasks/todo/mock-context-fix.md` which mentions exporting `testDb` correctly.
- This is likely related to the Drizzle ORM upgrade task (.cursor/working/tasks/todo/drizzle_orm_upgrade.task.md).

## Notes

- This was a straightforward fix that did not require significant changes to the codebase
- In the future, consider adding more strict TypeScript configurations to catch these issues earlier
- Other files might have similar issues and should be checked systematically
- The root cause is likely related to how the database connection is managed in the test setup

## Acceptance Criteria

1. `bun tsc` runs without TypeScript errors
2. Integration tests pass as expected
3. No regressions in database functionality

## Related Issues

- This may be related to `.cursor/working/tasks/todo/mock-context-fix.md` which mentions exporting `testDb` correctly.
- This is likely related to the Drizzle ORM upgrade task (.cursor/working/tasks/todo/drizzle_orm_upgrade.task.md).

## Notes

- This appears to be a straightforward fix that should not require significant changes to the codebase
- After fixing, we should consider adding more strict TypeScript configurations to catch these issues earlier 