# Environment Variable Management

This document outlines the strategy for managing environment variables in the `bun-badges` project.

## Core Principles

1.  **Single Source of Truth:** Environment variables required by the application at runtime should primarily be defined via a `DATABASE_URL` string or other specific variables set in the deployment environment (e.g., Docker, systemd, hosting provider UI).
2.  **Development Convenience:** `.env.*` files are used *exclusively* for local development and running scripts (`npm run ...`). They are *not* the primary source for the running application container.
3.  **Clear Separation:** Distinguish between build-time/script variables and runtime application variables.
4.  **Security:** Never commit `.env` or `.env.*` files containing secrets to version control. Use `.env.example` to document required variables.
5.  **Consistency:** Use a consistent naming convention (e.g., `UPPER_SNAKE_CASE`).

## Environment-Specific Files (`.env.*`)

These files are used for local development and scripts via `dotenv-cli`.

-   `.env`: Base file, potentially for shared non-secret variables (committed if no secrets). Typically holds `NODE_ENV=development`.
-   `.env.development`: Variables specific to local development (e.g., database connection details for the dev database). **Do not commit.**
-   `.env.test`: Variables specific to running local tests (e.g., database connection details for the test database). **Do not commit.**
-   `.env.example`: Template file documenting all *required* environment variables for the application and scripts. Includes placeholder values and descriptions. **Commit this file.**

## Application Configuration (`src/db/config.ts`, etc.)

-   The application code (e.g., `src/db/config.ts`) reads variables directly from `process.env`.
-   It expects critical variables like `DATABASE_URL` to be present in the runtime environment.
-   It should provide clear error messages or fail gracefully if required variables are missing at startup.

## Docker Configuration (`docker-compose.*.yml`)

-   Compose files define the services and their environments.
-   They can set environment variables directly using the `environment:` block.
-   For development (`docker-compose.dev.yml`), the `env_file:` directive *can* be used to load variables from `.env.development` into the *container's* environment, making them available to `process.env`.
-   Avoid defining the *same* variable in both `environment:` and an `env_file:` to prevent confusion. Prefer setting runtime variables directly in the container's environment where possible (either via `environment:` or the mechanism that loads `.env.*` files).

## Scripts (`package.json`)

-   Scripts requiring specific environment variables (e.g., database migrations) use `dotenv-cli` to load the appropriate `.env.*` file before execution.
    ```json
    "scripts": {
      "db:migrate:dev": "dotenv -e .env.development -- bun run src/db/migrate.ts",
      "test": "dotenv -e .env.test -- bun test"
    }
    ```

## Checklist for Adding a New Environment Variable

1.  **Necessity:** Is this configuration truly needed as an environment variable, or can it be application code configuration?
2.  **Scope:** Is it for runtime, development scripts, testing, or build time?
3.  **Naming:** Choose a clear `UPPER_SNAKE_CASE` name.
4.  **Documentation:** Add the variable to `.env.example` with a description and placeholder value.
5.  **Development:** Add the variable to relevant `.env.*` files (e.g., `.env.development`) with the appropriate development value.
6.  **Application Code:** If needed at runtime, update application code (e.g., config files) to read `process.env.YOUR_NEW_VARIABLE`. Add checks/defaults if necessary.
7.  **Scripts:** If needed for scripts, update `package.json` commands if they don't already load the correct `.env.*` file.
8.  **Deployment:** Update deployment configurations (Docker `environment:`, hosting provider settings, etc.) to include the new variable.
9.  **Secrets:** Ensure secret values are *never* committed. Manage them securely in deployment environments. 