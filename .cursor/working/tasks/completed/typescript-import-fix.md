# Task: Fix TypeScript Error in createMockContext Import

## Problem Statement
Integration tests were failing with a TypeScript error:
```
Error: Export named 'createMockContext' not found in './db-helpers'
```

The error occurred because `src/utils/test/integration-setup.ts` was trying to import `createMockContext` from `./db-helpers`, but that function wasn't being exported from that file.

## Solution Implemented

1. **Add re-export to db-helpers.ts**
   - Added a re-export of the `createMockContext` function in `src/utils/test/db-helpers.ts`:
   ```typescript
   // Re-export createMockContext for backwards compatibility
   import { createMockContext } from "./mock-context";
   export { createMockContext };
   ```

2. **Fixed unused parameter warning**
   - Removed an unused `params` parameter from the `executeSql` function in `src/utils/test/integration-setup.ts`
   - Changed from:
   ```typescript
   export async function executeSql<T = any>(query: string, params?: any[]): Promise<T[]> {
   ```
   - To:
   ```typescript
   export async function executeSql<T = any>(query: string): Promise<T[]> {
   ```

3. **Fixed the import in test set-up**
   - Updated code to use the direct imports where needed

## Additional Findings
During fixing this issue, we discovered another issue with the mock context implementation:
- The `c.req.query` functionality was implemented as both a property accessor and a function, but was failing in some tests
- This required a separate fix in the mock context implementation
- A new task was created to address this broader issue across all tests

## Results
- The immediate TypeScript error is fixed
- Integration tests are now running without import errors
- Some integration tests are still failing due to related mock context issues, but these are addressed in a separate task

## Lessons Learned
1. Maintain consistency in module exports and imports
2. Be careful about circular dependencies in test utilities
3. Use standard approaches for backward compatibility (re-exporting)
4. Address one issue at a time when fixing complex test infrastructure 