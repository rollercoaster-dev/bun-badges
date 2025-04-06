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
    *   [`✅`] All other files previously using `createLogger` or `Logger` type were updated to use the default Pino import and `logger.child()` pattern.
    *   [`✅`] Logger method calls (`.error`, `.info` etc.) were updated for Pino (error object first).
6.  **Verification:**
    *   [`✅`] Local `tsc` and `eslint` pass after all files are updated.
    *   [`✅`] Local `bun test:all` passes.
    *   [`✅`] Clean commit pushed to PR #43 branch (`12bc263`).
    *   [`⏳`] **(PENDING)** GitHub CI checks pass on PR #43. (Assumed pending verification)
    *   [`⏳`] **(PENDING)** GitHub Advanced Security alerts resolved on PR #43. (Assumed pending verification)

---

## Current Implementation Status & Analysis
*   **COMPLETED:** Pino logger refactoring is complete and pushed to the `feat/security-middleware` branch (commit `12bc263`).
*   Most files were successfully updated automatically.
*   Minor manual intervention was needed for some files (`tests/integration/oauth-jwt-bridge.test.ts`, `tests/unit/utils/logger.test.ts`).
*   Final verification (`lint`, `tsc`, `test:all`) passed locally.
*   Remote CI/Security checks on GitHub PR #43 are pending.

---

## Gap Analysis
*   None. Refactoring complete.

---

## Required Improvements / Actionable Tasks (Cleanup Plan)
*   None. Task complete.

---

## Proposed Implementation Plan

### Feature Branch(es)
*   `feat/security-middleware`

### Key Commit Points
*   `refactor(logger): replace custom logger with pino` (`12bc263`)

### Potential Pull Request(s)
*   PR #43 