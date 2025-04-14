# Task: Refactor to Domain-Driven Structure

**Goal:** Reorganize the `src/` directory from the current layer-based structure (`controllers/`, `services/`, etc.) to a domain-based structure (`auth/`, `badges/`, `credentials/`, `issuers/`, `keys/`, `oauth/`).

**Rationale:** Improve code cohesion, maintainability, and scalability by grouping feature-related code together.

**Overall Steps:**

1.  Create new domain directories within `src/` (e.g., `auth`, `badges`, `credentials`, `issuers`, `keys`, `oauth`).
2.  Create a `src/shared/` directory for truly cross-domain code (config, base db setup, generic middleware, common utils, core types).
3.  Systematically process each domain (see individual domain tasks):
    *   Move relevant files (`*.controller.ts`, `*.service.ts`, `*.routes.ts`, domain-specific `*.types.ts`, `*.middleware.ts`) into the corresponding domain folder.
    *   Identify and move genuinely shared code into `src/shared/`.
    *   Update all necessary `import` paths within the moved files and any files that import them across the codebase (including tests).
    *   Run tests frequently to catch regressions.
4.  Update root configuration files (`tsconfig.json` paths if necessary, test runner config, build scripts) if needed to accommodate the new structure.
5.  Clean up empty layer-based directories (`controllers/`, `services/`, etc.) once all files have been moved.

**Depends On:** Individual domain refactoring tasks. 