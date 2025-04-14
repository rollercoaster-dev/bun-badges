# Task: Refactor Issuers Domain

**Goal:** Move all Issuer Profile related code into `src/issuers/` and update imports.

**Files to Move/Analyze:**

*   `src/controllers/issuers.controller.ts` -> `src/issuers/issuers.controller.ts`
*   `src/routes/issuers.routes.ts` -> `src/issuers/issuers.routes.ts`
*   Potentially `src/services/issuer.service.ts` -> `src/issuers/issuers.service.ts`
*   Potentially related types/interfaces -> `src/issuers/issuers.types.ts`
*   Related tests -> `src/issuers/__tests__/`

**Shared Code Candidates (Move to `src/shared/`):**

*   Likely relies on `DatabaseService`.

**Steps:**

1.  Create `src/issuers/` directory.
2.  Move the identified domain-specific files into `src/issuers/`.
3.  Update all `import` statements within the moved files and any other files that import them (check `src/index.ts`, tests, etc.).
4.  Move relevant tests from `tests/` into `src/issuers/__tests__/` and update their imports.
5.  Run tests (`bun test`) and fix any failures.

**Depends On:** Creation of `src/issuers/` directory. 