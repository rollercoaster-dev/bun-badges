# Task: Populate Shared Domain

**Goal:** Identify and move genuinely cross-domain code into the `src/shared/` directory structure.

**Files to Move/Analyze (Candidates):**

*   `src/db/config.ts` / `src/db/schema.ts` -> `src/shared/db/`
*   `src/services/db.service.ts` -> `src/shared/db/db.service.ts` (Or keep separate?)
*   `src/middleware/auth.middleware.ts` (Core JWT check) -> `src/shared/middleware/auth.middleware.ts`
*   `src/middleware/error-handler.ts` -> `src/shared/middleware/error-handler.ts`
*   `src/middleware/security.middleware.ts` -> `src/shared/middleware/security.middleware.ts`
*   `src/utils/logger.ts` -> `src/shared/utils/logger.ts`
*   `src/utils/auth/jwt.ts` -> `src/shared/utils/jwt.ts`
*   `src/utils/auth/rateLimiter.ts` -> `src/shared/utils/rateLimiter.ts`
*   `src/config/security.config.ts` -> `src/shared/config/security.config.ts` (Or integrate into central config loader)
*   Generic types/interfaces -> `src/shared/types/`

**Steps:**

1.  Create `src/shared/` and relevant subdirectories (`db/`, `middleware/`, `utils/`, `config/`, `types/`).
2.  As domain refactors identify shared code (see "Shared Code Candidates" in domain tasks), move those files into the appropriate `src/shared/` subdirectory.
3.  Update imports in the moved shared files and any files that now import them from `src/shared/`.
4.  Consider creating a central configuration loader (`src/shared/config/index.ts`) to replace scattered `process.env` access and config files.
5.  Run tests (`bun test`) and fix any failures.

**Depends On:** Domain refactoring tasks identifying shared code. 