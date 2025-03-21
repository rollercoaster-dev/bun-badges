# Task: Fix Explicit Any Types

## Description
This task involves replacing `any` types throughout the codebase with more specific types to improve type safety and code quality. This will eliminate the eslint warnings for `@typescript-eslint/no-explicit-any`.

## Files Requiring Updates

### Non-Test Files:
1. `src/services/verification.service.ts` - Replace the `any` return type for `generateKeyPair` method
2. `src/db/schema/signing.ts` - Replace the `any` type in references function
3. `src/db/schema/issuers.ts` - Replace the `any` type in references function
4. `src/routes/badges.routes.ts` - Replace the `any` type for updates object
5. `src/types/png-metadata.d.ts` - Add proper typing
6. `src/utils/signing/credential.ts` - Replace any types with proper interfaces

### Test Files (Lower Priority):
- These will be addressed after fixing the core application code

## Approach
1. For each file, analyze the usage of `any` types
2. Create appropriate interfaces or use existing types
3. Replace the `any` types with the proper types
4. Run tests to ensure functionality remains intact
5. Commit changes incrementally (by category)

## Progress Tracking
- [ ] Fix `src/services/verification.service.ts`
- [ ] Fix schema references in database schema files
- [ ] Fix `routes/badges.routes.ts` any types
- [ ] Fix PNG metadata types
- [ ] Fix signing/credential types
- [ ] Run tests to verify everything still works

## Notes
- Some `any` usage in test files may be acceptable but should be minimized where possible
- Focus on maintaining backward compatibility while improving type safety 