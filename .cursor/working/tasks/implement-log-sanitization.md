# Task: Refactor Logger to Pino & Address PR Feedback

**Goal:** Replace custom logger with Pino, address GitHub Advanced Security alerts, fix related test failures, and ensure clean integration across the codebase.

## Definition of Done (DoD) Checklist
1.  **Dependencies Managed:**
    *   [`✅`] `pino`, `pino-pretty` installed.
    *   [`✅`] Custom sanitizer files (`sanitize.ts`, test) deleted.
2.  **Pino Logger Implementation:**
    *   [`✅`] `src/utils/logger.ts` implemented using Pino.
    *   [`✅`] Config includes redaction for sensitive keys.
    *   [`✅`] Config includes conditional pretty-printing (dev/test) vs JSON (prod).
    *   [`✅`] Log level respects `LOG_LEVEL` env var.
3.  **Pino Logger Tests:**
    *   [`✅`] Old logger tests deleted.
    *   [`✅`] New unit tests exist for Pino config (`tests/unit/utils/logger.test.ts`).
    *   [`✅`] Pino tests verify level, redaction, and output format switching.
4.  **Core Integration:**
    *   [`✅`] `src/index.ts` uses new Pino logger (default import).
    *   [`✅`] `src/middleware/error-handler.ts` uses new Pino logger (child logger).
5.  **Wider Integration (Controllers, Services, Utils):**
    *   [`⏳`] **(PENDING)** All other files previously using `createLogger` or `Logger` type are updated to use the default Pino import and `logger.child()` pattern.
    *   [`⏳`] **(PENDING)** Logger method calls (`.error`, `.info` etc.) updated for Pino (error object first).
6.  **Verification:**
    *   [`⏳`] **(PENDING)** Local `tsc` and `eslint` pass after all files are updated.
    *   [`⏳`] **(PENDING)** Local `bun test` passes.
    *   [`⏳`] **(PENDING)** Clean commit pushed to PR #43 branch.
    *   [`⏳`] **(PENDING)** GitHub CI checks pass on PR #43.
    *   [`⏳`] **(PENDING)** GitHub Advanced Security alerts resolved on PR #43.

---

## Current Implementation Status & Analysis
*   Pino installed, old logger/sanitizer removed.
*   Pino configured in `src/utils/logger.ts` with tests passing.
*   Core usage in `index.ts` and `error-handler.ts` updated.
*   **Previous commit (`921f27e`) contained this work but also included broken controller refactors**, leading to TS errors during pre-commit.
*   User reverted `auth.controller.ts` due to incorrect automated edits.
*   **Need to reset the bad commit, preserve correct changes, manually fix remaining file integrations, and commit cleanly.**
*   **Relevant Files/Dirs:** `src/utils/logger.ts`, `tests/unit/utils/logger.test.ts`, `src/index.ts`, `src/middleware/error-handler.ts`, `package.json`, `bun.lockb`, multiple controller/service/util files requiring manual logger updates.

---

## Gap Analysis
*   Inconsistent logger usage across the codebase due to incomplete/failed refactoring.
*   Previous commit contains errors and needs to be undone/redone cleanly.

---

## Required Improvements / Actionable Tasks (Cleanup Plan)
1.  **Reset Last Commit:** Run `git reset HEAD~1` locally to un-commit changes while keeping them in the working directory/stage.
2.  **Stage Correct Changes:** Run `git add` for the known good files (`logger.ts`, `logger.test.ts`, `index.ts`, `error-handler.ts`, `package.json`, `bun.lockb`) and stage the deleted sanitizer files.
3.  **Clean Working Directory:** Ensure incorrect changes to controllers/services (like the reverted `auth.controller.ts`) are unstaged and discarded.
4.  **Manually Update Remaining Files:** Carefully edit each file flagged in the previous `tsc` errors (controllers, services, utils, etc.) to correctly use the Pino logger (default import, `logger.child()`, updated method calls). Stage each fix.
5.  **Verify Locally:** Run `bun run lint`, `bun run tsc`, `bun test` locally to ensure all errors are resolved.
6.  **Commit Cleanly:** Create a *new* commit containing the complete, working Pino refactor.
7.  **Push & Verify Remotely:** Push the clean commit to the PR branch and verify CI/Security status on GitHub.

---

## Proposed Implementation Plan

### Feature Branch(es)
*   `feat/security-middleware`

### Key Commit Points
*   **(To be redone)** `refactor(logger): replace custom logger with pino` (This will be the new clean commit)

### Potential Pull Request(s)
*   PR #43 