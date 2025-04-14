# Task: Refactor Badges Domain (OB 2.0 Assertions/Classes)

**Goal:** Move all Open Badges 2.0 related code (Assertions, BadgeClasses) into `src/badges/` and update imports.

**Files to Move/Analyze:**

*   `src/controllers/assertions.controller.ts` -> `src/badges/assertions.controller.ts` (Rename for clarity?)
*   `src/routes/assertions.routes.ts` -> `src/badges/assertions.routes.ts`
*   `src/controllers/badges.controller.ts` -> `src/badges/badge-classes.controller.ts` (Rename for clarity?)
*   `src/routes/badges.routes.ts` -> `src/badges/badge-classes.routes.ts`
*   Potentially a `src/services/badge.service.ts` -> `src/badges/badges.service.ts`
*   Potentially related types/interfaces -> `src/badges/badges.types.ts`
*   Related tests -> `src/badges/__tests__/`

**Shared Code Candidates (Move to `src/shared/`):**

*   Check dependencies of controllers/services. Likely relies on `DatabaseService`.

**Steps:**

1.  Create `src/badges/` directory.
2.  Move the identified domain-specific files into `src/badges/`, considering renaming for clarity (e.g., distinguishing assertion logic from badge class logic).
3.  Update all `import` statements within the moved files and any other files that import them (check `src/index.ts`, tests, etc.).
4.  Move relevant tests from `tests/` into `src/badges/__tests__/` and update their imports.
5.  Run tests (`bun test`) and fix any failures.

**Depends On:** Creation of `src/badges/` directory. 