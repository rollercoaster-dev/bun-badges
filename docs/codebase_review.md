# Codebase Review: bun-badges

This report summarizes the analysis of the `bun-badges` codebase.

**1. Overall Structure & Technology:**

*   **Strengths:** Good modular structure (Hono routes, controllers, services), modern stack (Bun, Hono, TypeScript, Drizzle), uses `jose` for JWT, `Bun.password` for hashing. Follows established patterns. Adheres well to Rule `001_core.mdc` (Modular Code) and `002_runtime_framework.mdc` (Bun/Hono).
*   **Areas for Improvement:** None noted in overall structure.

**2. Authentication & Authorization:**

*   **Strengths:** Standard email/password and code-based login flows implemented (`src/controllers/auth.controller.ts`). Uses DB for token revocation (`revoked_tokens` table queried by `DatabaseService`). Basic rate limiting concept present. RBAC database schema exists (`roles`, `permissions`, etc.). Password hashing is secure (`Bun.password.hash` with bcrypt). Login now issues access and refresh tokens. Token revocation correctly uses `DatabaseService` in the controller.
*   **Critical Gaps:**
    *   **RBAC Implementation:** Auth middleware (`src/middleware/auth.middleware.ts`) uses **mock roles** derived from token scope instead of querying the database via `DatabaseService`. This is insecure and bypasses the existing RBAC schema.
    *   **Production Rate Limiting:** The `RateLimiter` (`src/utils/auth/rateLimiter.ts`, used by `AuthController`) is **in-memory only**, unsuitable for multi-instance deployments as limits won't be shared.
*   **Minor Gaps:**
    *   Refresh token revocation strategy needs explicit confirmation/testing within the `/refresh` endpoint logic to ensure it checks `revoked_tokens` correctly.
*   **Recommendations:**
    *   **(High Priority)** Implement RBAC lookup methods in `DatabaseService` (e.g., `getUserRoles`, `getUserPermissions`) querying `user_roles`, `roles`, `role_permissions`, `permissions` tables.
    *   **(High Priority)** Refactor `src/middleware/auth.middleware.ts` to call the new DB service methods for role assignment, removing the mock logic.
    *   **(High Priority)** Replace the in-memory `RateLimiter` with a production-ready solution using a shared store (e.g., Redis-backed).
    *   **(Medium Priority)** Review and add tests for the `/refresh` endpoint logic, ensuring it correctly checks `revoked_tokens` for the provided refresh token.
    *   **(Done)** Removed redundant in-memory revocation logic from `src/utils/auth/jwt.ts`.
    *   **(Done)** Updated `/login` to issue both access and refresh tokens.

**3. Security:**

*   **Strengths:** Basic security middleware (CORS, CSP, CSRF, secure headers) configured via `src/config/security.config.ts`. Uses environment variables for sensitive config (`JWT_SECRET`, `CSRF_SECRET`, `FRONTEND_URL`). DB interactions use Drizzle (helps prevent SQLi).
*   **Gaps:**
    *   **Key Management:** Private keys (`keys.private_key`, `issuer_profiles.encrypted_private_key`) appear stored in the database. This requires robust, documented encryption strategies (application-level encryption recommended) or consideration of external secret management (Vault/HSM). The exact mechanism needs verification.
    *   **JWT Algorithm:** Uses HS256. Consider RS256/ES256 for improved security or third-party verification needs, depending on requirements.
    *   **Rate Limiting:** (See Auth section - critical gap).
*   **Recommendations:**
    *   **(High Priority)** Investigate and document the private key storage mechanism (location, encryption status). Implement application-level encryption if stored in the DB, or plan migration to Vault/HSM if required by security policy.
    *   **(Medium Priority)** Evaluate the need for asymmetric JWT signing (RS256/ES256) based on interoperability and security requirements.
    *   **(Low Priority)** Make JWT expiry durations, issuer, and audience strings configurable via environment variables (`src/utils/auth/jwt.ts`).

**4. Database:**

*   **Strengths:** Uses Drizzle ORM with clear migrations in `drizzle/`. Schema covers users, issuers, badges (OB 2.0), credentials (OB 3.0 likely), OAuth, RBAC, key storage, token revocation, status lists. `revoked_tokens` table exists and is used.
*   **Gaps:**
    *   Purpose of `token_mappings` table is unclear.
    *   Relationship between `signing_keys` (migration 0000) and `keys` (migration 0004) needs clarification (is `signing_keys` deprecated?).
*   **Recommendations:**
    *   **(Low Priority)** Document or add comments clarifying the purpose of `token_mappings` and the status/relationship of the `signing_keys` table vs. the `keys` table.

**5. Testing:**

*   **Strengths:** Directory structure for `unit`, `integration`, and `e2e` tests exists (`tests/`). `tests/setup.ts` suggests organized test setup. Presence of tests for controllers noted (`tests/unit/controllers/...`, `tests/integration/controllers/...`).
*   **Gaps:** Code coverage and overall quality/comprehensiveness of tests not assessed. Tests for RBAC logic are missing (as the logic itself is missing).
*   **Recommendations:**
    *   **(Medium Priority)** Sample tests in each category (`unit/`, `integration/`, `e2e/`), focusing on critical areas (auth middleware, security middleware, core badge/credential logic, key management) to assess quality and coverage.
    *   **(High Priority)** Add specific tests for RBAC logic once implemented (both DB service methods and middleware checks).

**6. Documentation:**

*   **Strengths:** `README.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, `DOCKER.md` exist. Swagger UI available in development (`src/swagger.ts`, enabled in `src/index.ts`). Code structure is generally good. Uses `pino` for structured logging (`src/utils/logger.ts`).
*   **Gaps:** Inline code documentation (following `012_comment_guidelines`) quality/consistency not assessed. API documentation (Swagger) accuracy/completeness not assessed. Security design documentation, especially around key management, is likely needed.
*   **Recommendations:**
    *   **(Medium Priority)** Review generated Swagger output (`/docs` in dev) for accuracy and completeness against the implemented API routes.
    *   **(Medium Priority)** Review critical code sections (e.g., auth middleware, key handling, core credential logic) for adherence to comment guidelines (Rule 012), adding "why" comments where necessary.
    *   **(High Priority)** Create dedicated documentation outlining the security design, focusing on authentication flows, authorization model (once implemented), and especially the chosen key management and storage strategy.

**Feature Branch Outlines (for Major Gaps):**

1.  **`feature/implement-rbac-lookups`**
    *   **Requirements:** Implement database queries to fetch user roles and permissions based on RBAC tables. Refactor auth middleware to use these lookups.
    *   **Steps:** 1. Add RBAC query methods to `DatabaseService`. 2. Test service methods. 3. Refactor `auth.middleware.ts`. 4. Update/add integration tests for middleware/endpoints.
    *   **Testing:** Unit tests for DB methods. Integration tests for middleware context and endpoint access control.

2.  **`feature/production-rate-limiter`**
    *   **Requirements:** Replace in-memory `RateLimiter` with a Redis-backed solution.
    *   **Steps:** 1. Add Redis dependency. 2. Implement `RedisRateLimiter`. 3. Update `AuthController` usage. 4. Configure Redis connection. 5. Update Docker setup.
    *   **Testing:** Integration tests simulating rate limits with Redis persistence.

3.  **`feature/secure-key-management`** (Depends on investigation)
    *   **Requirements:** Ensure private keys are stored securely (app-level DB encryption or external system).
    *   **Steps (Example: App-level encryption):** 1. Choose library (`node:crypto`). 2. Manage master key securely. 3. Modify key service to encrypt/decrypt. 4. Update DB columns if needed. 5. Test logic. 6. Document process.
    *   **Testing:** Unit tests for encrypt/decrypt. Integration tests for key lifecycle and signing. 