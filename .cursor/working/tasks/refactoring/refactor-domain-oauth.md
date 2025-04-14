# Task: Refactor OAuth Domain

**Goal:** Move all OAuth 2.0 specific code (client registration, authorization flow, token endpoints) into `src/oauth/` and update imports.

**Files to Move/Analyze:**

*   `src/controllers/oauth.controller.ts` -> `src/oauth/oauth.controller.ts`
*   `src/routes/oauth.routes.ts` -> `src/oauth/oauth.routes.ts`
*   `src/services/oauth.service.ts` (if exists) -> `src/oauth/oauth.service.ts`
*   `src/services/authorization.service.ts` -> `src/oauth/oauth-authorization.service.ts` (Confirm scope)
*   Potentially related types/interfaces -> `src/oauth/oauth.types.ts`
*   Related tests -> `src/oauth/__tests__/`

**Shared Code Candidates (Move to `src/shared/`):**

*   Likely relies heavily on `DatabaseService`.
*   May rely on JWT utilities (`src/shared/utils/jwt.ts`) if generating JWT-based access tokens.

**Steps:**

1.  Create `src/oauth/` directory.
2.  Move the identified domain-specific files into `src/oauth/`.
3.  Update all `import` statements within the moved files and any other files that import them (check `src/index.ts`, tests, etc.).
4.  Move relevant tests from `tests/` into `src/oauth/__tests__/` and update their imports.
5.  Run tests (`bun test`) and fix any failures.

**Depends On:** Creation of `src/oauth/` directory. 