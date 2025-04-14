# Task: Refactor Credentials Domain (OB 3.0 VCs)

**Goal:** Move all Open Badges 3.0 / Verifiable Credential related code (signing, verification, status) into `src/credentials/` and update imports.

**Files to Move/Analyze:**

*   `src/controllers/credential-signing.controller.ts` (if exists) -> `src/credentials/credentials-signing.controller.ts`
*   `src/routes/credential-signing.routes.ts` -> `src/credentials/credentials-signing.routes.ts`
*   `src/controllers/credential-verification.controller.ts` -> `src/credentials/credentials-verification.controller.ts`
*   `src/routes/credential-verification.routes.ts` -> `src/credentials/credentials-verification.routes.ts`
*   `src/services/credential-signing.service.ts` (if exists) -> `src/credentials/credentials-signing.service.ts`
*   `src/services/credential-verification.service.ts` -> `src/credentials/credentials-verification.service.ts`
*   `src/models/credential.model.ts` -> `src/credentials/credentials.types.ts` (or `.model.ts`)
*   Potentially other related types/interfaces -> `src/credentials/credentials.types.ts`
*   Related tests -> `src/credentials/__tests__/`

**Shared Code Candidates (Move to `src/shared/`):**

*   Likely relies on `DatabaseService`.
*   May rely on cryptographic utilities (potentially shared if also used by JWT/Keys).

**Steps:**

1.  Create `src/credentials/` directory.
2.  Move the identified domain-specific files into `src/credentials/`.
3.  Update all `import` statements within the moved files and any other files that import them (check `src/index.ts`, tests, etc.).
4.  Move relevant tests from `tests/` into `src/credentials/__tests__/` and update their imports.
5.  Run tests (`bun test`) and fix any failures.

**Depends On:** Creation of `src/credentials/` directory. 