# Refactor: Docker-Centric Testing Setup

## Goal

Simplify the testing setup by standardizing on a Docker-centric approach for running unit, integration, and E2E tests, ensuring consistency between local development and CI environments.

## Current State & Complexity (Summary)

*   **Multiple Execution Paths:** Tests run via `bun test` (using `tests/setup.ts`) *and* via `docker-compose` services, leading to different setup logic and potential drift.
*   **Conflicting Migration Logic:** Correct migrations (`src/db/migrate.ts`) conflict with old/broken scripts (`tests/scripts/run-migration.js`) called in some Docker services and previously via Docker entrypoint scripts.
*   **Complex `tests/setup.ts`:** Handles environment detection, Docker management, migrations, mocking, etc., with complex conditional logic.
*   **Complex `docker-compose.test.yml`:** Multiple redundant runner services (`test`, `test_runner`, `e2e_test_runner`), database state management reliant on volume cleanup.

## Proposed Docker-Centric Approach

1.  **Centralize on `docker-compose.test.yml`:**
    *   Define dependencies (`db_test`, `redis_test`).
    *   Define a single, flexible `test-runner` service.
    *   Ensure `test-runner` waits for `db_test` and runs correct migrations (`src/db/migrate.ts`) before tests.
    *   Implement robust cleanup (`docker-compose down -v`).
2.  **Refactor `package.json` Scripts:**
    *   Modify `test:*` scripts to use `docker-compose run test-runner [...]` instead of `bun test`.
    *   Pass test targets (e.g., `tests/integration`, `tests/e2e`) as arguments to `docker-compose run`.
3.  **Simplify `tests/setup.ts`:**
    *   Remove Docker management/migration logic.
    *   Retain essential *in-container* setup (path aliases, mocking).
4.  **Clean Up:**
    *   Delete old migration script (`tests/scripts/run-migration.js`).
    *   Remove redundant Docker services.

## Initial Steps

1.  Consolidate `test`, `test_runner`, `e2e_test_runner` services into a single `test-runner` service in `docker-compose.test.yml`.
2.  Update the `test-runner` command to run correct migrations (`bun run src/db/migrate.ts`) before a default `bun test` command.
3.  Modify `package.json` scripts (`test:integration`, `test:e2e`, etc.) to use `docker-compose run test-runner ...`.
4.  Simplify `tests/setup.ts` by removing Docker/migration logic.
5.  Delete `tests/scripts/run-migration.js`.

## Progress & Current Status (2025-04-06)

*   **Completed:**
    *   Consolidated Docker services (`test`, `e2e_test_runner` removed, `test_runner` kept) in `docker-compose.test.yml`.
    *   Updated `test_runner` default command (though overridden by `run`).
    *   Refactored `package.json` scripts (`test:*`) to use `docker-compose run test_runner sh -c 'bun install && bun run src/db/migrate.ts && bun test ...'`.
    *   Added `docker-compose down -v` to the start of `package.json` test scripts for cleanup.
    *   Simplified `tests/setup.ts` by removing Docker/migration logic.
    *   Deleted `tests/scripts/run-migration.js`.
    *   Removed `IF NOT EXISTS` from `drizzle/0003_status_list_tables.sql`.
*   **Blocked:**
    *   Running tests (`bun test:integration`) still fails during the migration step inside the container.
    *   Error: `relation "status_lists" already exists` (code `42P07`).
    *   This occurs even though `docker-compose down -v` runs beforehand, confirming the volume is cleared.
    *   The error happens when `bun run src/db/migrate.ts` is executed on the clean database.
*   **Next Step:** Pause refactoring on this branch, stash changes, switch to `main`, and examine the original migration setup there to understand why `status_lists` might be causing persistent issues. 