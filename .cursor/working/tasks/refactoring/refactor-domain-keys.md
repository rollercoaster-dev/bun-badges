# Task: Refactor Keys Domain

**Goal:** Move all cryptographic key management related code into `src/keys/` and update imports.

**Files to Move/Analyze:**

*   `src/controllers/key-management.controller.ts` (if exists) -> `src/keys/keys.controller.ts`
*   `src/routes/key-management.routes.ts` -> `src/keys/keys.routes.ts`
*   `src/services/key-management.service.ts` (if exists) -> `src/keys/keys.service.ts`
*   Potentially related types/interfaces -> `src/keys/keys.types.ts`
*   Related tests -> `src/keys/__tests__/`

**Shared Code Candidates (Move to `src/shared/`):**

*   Likely relies on `DatabaseService`.
*   Generic crypto utilities (e.g., base signing/verification functions used elsewhere) might belong in `src/shared/utils/crypto.ts`. Key generation/storage specific logic stays in the domain.

**Steps:**

1.  Create `src/keys/` directory.
2.  Move the identified domain-specific files into `src/keys/`.
3.  Identify and move any shared crypto utils to `src/shared/utils/`.
4.  Update all `import` statements within the moved files and any other files that import them (check `src/index.ts`, tests, credentials service, etc.).
5.  Move relevant tests from `tests/` into `src/keys/__tests__/` and update their imports.
6.  Run tests (`bun test`) and fix any failures.

**Depends On:** Creation of `src/keys/` directory. 