# Task: Refactor Auth Domain

**Goal:** Move all authentication and authorization related code into `src/auth/` and update imports.

**Files to Move/Analyze:**

*   `src/controllers/auth.controller.ts` -> `src/auth/auth.controller.ts`
*   `src/routes/auth.routes.ts` -> `src/auth/auth.routes.ts`
*   `src/middleware/authorization.middleware.ts` -> `src/auth/authorization.middleware.ts`
*   `src/utils/auth/codeGenerator.ts` -> `src/auth/auth.utils.ts` (or similar, if specific to auth flow)
*   Potentially related types/interfaces -> `src/auth/auth.types.ts`
*   Related tests -> `src/auth/__tests__/`

**Shared Code Candidates (Move to `src/shared/`):**

*   `src/middleware/auth.middleware.ts` (Core JWT verification - likely shared)
*   `src/utils/auth/jwt.ts` (Generic JWT functions - likely shared/utils)
*   `src/utils/auth/rateLimiter.ts` (Likely shared utility, especially if replaced with Redis version)

**Steps:**

1.  Create `src/auth/` directory.
2.  Move the identified domain-specific files listed above into `src/auth/`.
3.  Identify and move shared candidates into `src/shared/` subdirectories (e.g., `src/shared/middleware/`, `src/shared/utils/`).
4.  Update all `import` statements within the moved files and any other files that import them (check `src/index.ts`, tests, etc.).
5.  Move relevant tests from `tests/` into `src/auth/__tests__/` and update their imports.
6.  Run tests (`bun test`) and fix any failures related to path changes or dependencies.

**Depends On:** Creation of `src/auth/` and `src/shared/` directories. 