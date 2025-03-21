# Test Refactoring Task

## Issues to Address
1. **Inconsistent project structure** - Test files in multiple locations:
   - Component-local tests in src/utils/codeGenerator/codeGenerator.test.ts
   - Centralized tests in src/__tests__/utils/auth/codeGenerator.test.ts
   - Mixed pattern with tests in both src/tests/ and tests/ directories
2. **Path resolution conflicts** - Import paths don't match actual file structure:
   - Some imports use relative paths that reference non-existent locations
   - Example: src/utils/codeGenerator/codeGenerator.test.ts imports from "../../auth/codeGenerator" but the module is at src/utils/auth/codeGenerator.ts
3. **Module location mismatch** - Services appear in multiple places:
   - auth vs middleware/auth
   - Multiple test paths for the same functionality
4. **Type issues** - Need to determine specific dependencies with missing types

## Approach
1. Standardize test organization with a consistent location pattern:
   - Move all tests to a single root location (tests/ directory)
   - Organize by type: unit/ and integration/
   - Match folder structure with src/ structure inside each test type

2. Update Typescript configurations:
   - Modify tsconfig.test.json to reference the new structure
   - Add path aliases to make imports consistent

3. Fix import paths:
   - Use path aliases for imports (e.g., @utils/auth/codeGenerator)
   - Ensure consistent relative paths within test directories

4. Create declaration files for missing types:
   - Create types directory with declaration files

## Progress
- [x] Analyze project structure and test files
- [x] Define standardized test organization pattern
  - [x] Create directory structure for tests/unit/ mirroring src/
  - [x] Create directory structure for tests/integration/ mirroring src/
- [x] Create type declarations for external dependencies
  - [x] png-itxt.d.ts
  - [x] larswander-png-text.d.ts 
  - [x] fast-bitset.d.ts
- [x] Update tsconfig files to support the new structure
- [x] Create test fixtures directory structure
- [ ] Relocate tests (in progress):
  - [x] utils/auth/codeGenerator.test.ts
  - [x] utils/auth/rateLimiter.test.ts
  - [x] utils/badge-baker/badge-baker.test.ts
  - [x] utils/signing/signing.test.ts
  - [x] middleware/auth/auth.test.ts
  - [x] controllers/auth/auth.controller.test.ts
  - [x] controllers/oauth/oauth.controller.test.ts
  - [x] controllers/issuer/issuer.controller.integration.test.ts
  - [x] routes/badges/badges.routes.test.ts
  - [x] routes/assertions/assertions.routes.test.ts
  - [x] services/credential/credential.service.integration.test.ts
  - [x] services/verification/verification.integration.test.ts
  - [x] services/verification/verification.edge.integration.test.ts
  - [ ] remaining tests still need to be migrated
- [ ] Verify all tests pass after refactoring
