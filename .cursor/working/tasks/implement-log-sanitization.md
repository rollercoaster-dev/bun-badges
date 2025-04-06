# Task: Implement Log Sanitization

**Goal:** Prevent sensitive information (secrets, specific env vars, common patterns) from being logged in clear text by the logger utility, addressing GitHub Advanced Security alerts.

## Definition of Done (DoD) Checklist
1.  **Sanitization Utility Created:**
    *   [` `] New file exists (e.g., `src/utils/sanitize.ts`).
    *   [` `] Defines functions/regex for redacting sensitive patterns (API keys, passwords, tokens, specific env var values).
    *   [` `] Handles recursive sanitization of objects/arrays.
    *   [` `] Unit tests exist for sanitization logic (`src/utils/test/sanitize.test.ts`).
2.  **Logger Integration:**
    *   [` `] `log` method in `src/utils/logger.ts` imports and uses the sanitizer.
    *   [` `] `message` and `args` are sanitized before JSON output.
    *   [` `] `message` and `args` are sanitized before pretty-print output.
3.  **Verification:**
    *   [` `] Logger unit tests verify redaction in both output modes.
    *   [` `] Local testing confirms redaction works.
    *   [` `] (Post-Commit Goal) GitHub Advanced Security alerts resolved.
4.  **Documentation:**
    *   [` `] JSDoc comments explain the sanitizer utility.
    *   [` `] Comment in `logger.ts` indicates sanitization application.

---

## Current Implementation Status & Analysis
*   The logger (`src/utils/logger.ts`) currently logs data without specific sanitization, leading to potential clear-text logging of sensitive information as flagged by GitHub Advanced Security.
*   **Relevant Files/Dirs:** `src/utils/logger.ts`, `src/utils/test/logger.test.ts` (if exists), GitHub PR #43 Security Tab.
*   **Comparison to Benchmark:** Security best practices require avoiding logging sensitive data.

---

## Gap Analysis (vs. Benchmark/Security Practice)
*   Lack of explicit sanitization mechanism for log messages and arguments.

---

## Required Improvements / Actionable Tasks
1.  Create the sanitization utility (`src/utils/sanitize.ts`) with logic to identify and redact sensitive data.
2.  Write unit tests for the sanitization utility.
3.  Integrate the sanitization utility into the `log` method of `src/utils/logger.ts`.
4.  Update or write unit tests for `logger.ts` to verify sanitization works.
5.  Add necessary documentation (JSDoc, comments).

---

## Proposed Implementation Plan

### Feature Branch(es)
*   *(Continuing on current feature branch as discussed)*

### Key Commit Points
*   Commit 1: `feat(utils): add basic log sanitization utility`
*   Commit 2: `test(utils): add unit tests for log sanitization`
*   Commit 3: `refactor(logger): integrate log sanitization`
*   Commit 4: `test(logger): update logger tests to verify sanitization`
*   Commit 5: `docs(logger): add comments for sanitization`

### Potential Pull Request(s)
*   *(Changes will be part of the existing PR #43)* 