# Review TestDb Usage Across Test Files

## Priority: Medium
## Status: To Do
## Created: 2024-03-23
## Time Estimate: 2-3 hours

## Issue Summary

After fixing TypeScript errors in `tests/integration/credential.integration.test.ts` related to incorrect usage of the `testDb` function, we found potentially similar issues in documentation and possibly other test files. A systematic review is needed to ensure consistent usage across the codebase.

## Background

The `testDb` export in `src/utils/test/integration-setup.ts` is a function that returns a database object:

```typescript
// Export the getter function for testDb, along with other test utilities
export {
  testDb, // Export the function to get the DB instance
  // ...
};
```

However, it's being used inconsistently across the codebase, sometimes directly as an object and sometimes correctly as a function:

```typescript
// Incorrect usage:
const results = await testDb.select()...

// Correct usage:
const results = await testDb().select()...
```

## Scope

1. Scan all test files for database operations using `testDb`
2. Check documentation examples for correct `testDb` usage
3. Review any automation or CI scripts that might use `testDb`
4. Consider whether refactoring the database access pattern would be beneficial

## Steps

1. Use grep to identify all usages of `testDb` in the codebase
2. Check each instance to ensure it follows the pattern `testDb()` rather than `testDb.`
3. Fix any incorrect usages
4. Update documentation examples to show correct usage
5. Consider adding ESLint rules to catch this pattern in the future

## Acceptance Criteria

1. All test files use `testDb()` correctly
2. All documentation examples show the correct pattern
3. TypeScript compilation succeeds without errors
4. All tests pass with the updated syntax

## Related Tasks

- Related to completed task `.cursor/working/tasks/completed/fix-typescript-errors.md`
- May inform work on `.cursor/working/tasks/todo/drizzle_orm_upgrade.task.md`
- Overlaps with `.cursor/working/tasks/todo/mock-context-fix.md`

## Notes

- This is a good opportunity to evaluate the current database testing strategy
- Consider documenting the correct pattern more prominently in the testing documentation
- May want to explore whether a singleton pattern or context provider would be clearer 