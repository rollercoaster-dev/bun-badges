# Phase 3: Security Implementation Review

## Definition of Done (DoD) Checklist (Based on Benchmark Plan)
1.  **Authentication Strategy Implemented:**
    *   [`~`] Chosen strategy (API Keys, JWT, OAuth2) implemented. *(Current: JWT Bearer, but conflicts with Rule 005: OAuth 2.0)*
    *   [`~`] Middleware exists to validate credentials (`src/middleware/auth.ts`, `src/middleware/auth.middleware.ts` - **REDUNDANT**).
    *   [`~`] Secure storage/handling of primary secrets (e.g., API key hashes, JWT secret). *(Uses `JWT_SECRET` from env var - handling needs verification)*.
2.  **Authorization Strategy Implemented:**
    *   [`✅`] Middleware exists for authorization if needed (RBAC implemented in `src/middleware/auth.ts` - `requireRole`, `requireOwnership`).
3.  **Secure Key Loading Implemented (for OB 3.0):**
    *   [`❌`] Functions exist to securely load issuer private keys based on chosen strategy (Vault, Secrets Mgr, encrypted DB, etc.). **MAJOR GAP.**
    *   [`❌`] Keys are not exposed in logs or errors. *(No implementation found)*.
4.  **Auth Middleware Applied:**
    *   [`?`] Relevant Hono routes are protected by AuthN/AuthZ middleware. *(Needs verification by checking route definitions)*.
5.  **Testing:**
    *   [`❌`] Unit tests for key loading logic (mocking secret stores), JWT validation/signing. *(No specific tests found)*.
    *   [`~`] Integration tests for AuthN/AuthZ middleware (valid/invalid credentials, permissions), protected endpoints. *(Some likely exist but need review for completeness)*.
6.  **Documentation:**
    *   [`~`] README/API Docs explain authentication. *(Needs update based on consolidated/chosen strategy)*.
    *   [`❌`] Key management procedures documented for operators.
    *   [`~`] Security Model document updated. *(Needs creation/update)*.

---

## Current Implementation Status & Analysis
*   **Authentication:** A JWT Bearer token strategy is partially implemented, primarily within `src/middleware/auth.ts`. This includes JWT verification (`hono/jwt` using `JWT_SECRET`), RBAC (`Role` enum, `requireRole`, `requireOwnership` middleware), and rate limiting.
*   **Redundancy:** A second, potentially older or conflicting, auth middleware exists (`src/middleware/auth.middleware.ts`) which uses a different verification method (`verifyToken` from `@utils/auth/jwt`) and includes a DB check for revoked tokens. This redundancy needs resolution.
*   **Authorization:** RBAC is defined and middleware exists in `src/middleware/auth.ts`.
*   **Key Management (OB 3.0):** There is **no evidence** of a system for securely managing or loading the unique private keys required for signing Open Badges 3.0 credentials. This is a critical requirement from the benchmark plan. The current `JWT_SECRET` is only for signing the authentication tokens, not the badges themselves.
*   **Rule Conflict:** The implemented JWT strategy conflicts with the project's `005_authentication` rule, which specifies OAuth 2.0 as the primary method.
*   **Relevant Files/Dirs:** `src/middleware/auth.ts`, `src/middleware/auth.middleware.ts`, `@utils/auth/jwt` (likely location of `verifyToken`), `.env.example` (for `JWT_SECRET`), `005_authentication.mdc`.

---

## Gap Analysis (vs. Benchmark & Rules)
*   **Major:** **Secure Key Management for OB 3.0:** Completely missing. No strategy defined or implemented for handling issuer private keys.
*   **Major:** **Authentication Strategy Conflict:** Implemented JWT conflicts with Rule 005's requirement for OAuth 2.0.
*   **Medium:** **Redundant Auth Middleware:** `auth.ts` and `auth.middleware.ts` provide overlapping/conflicting functionality. Needs consolidation. The token revocation check in `auth.middleware.ts` is valuable but missing from the more feature-rich `auth.ts`.
*   **Medium:** **Insufficient Testing:** Lack of specific unit tests for security components (key loading, JWT signing/validation logic) and need for comprehensive integration tests covering all auth/authz paths, including revocation.
*   **Medium:** **Missing Documentation:** No documentation on key management procedures or updates to the security model. API docs need alignment with the final auth strategy.
*   **Minor:** **Middleware Application:** Need to verify that `requireAuth`, `requireRole`, etc., are consistently applied to all necessary routes.
*   **Minor:** **JWT Secret Handling:** Process for managing `JWT_SECRET` securely in production needs confirmation/documentation.

---

## Required Improvements / Actionable Tasks
1.  **Define & Implement OB 3.0 Key Management:**
    *   Choose a strategy (e.g., store encrypted in DB, use cloud secrets manager).
    *   Implement secure storage, generation (if applicable), and retrieval logic (e.g., `KeyManagementService`).
    *   Integrate key retrieval into the OB 3.0 issuance flow (Phase 5 dependency).
2.  **Resolve Authentication Strategy:**
    *   **Option A (Recommended by Rule):** Plan and implement OAuth 2.0 (e.g., Client Credentials flow) as the primary auth mechanism, potentially deprecating the current JWT approach or keeping it for specific internal uses. Update Rule 005 if JWT is chosen.
    *   **Option B (Minimal Change):** Stick with JWT Bearer tokens. Consolidate the middleware (see next point) and potentially update Rule 005 to reflect this decision.
3.  **Consolidate Auth Middleware (If pursuing Option B):**
    *   Merge the functionality of `auth.ts` and `auth.middleware.ts`. Prefer `auth.ts` as the base.
    *   Integrate the token revocation check (from `auth.middleware.ts`) into the consolidated middleware.
    *   Remove the redundant file (`auth.middleware.ts`).
    *   Update all usages across the application.
4.  **Enhance Security Testing:**
    *   Write unit tests for cryptographic operations (if implementing key management crypto), token validation/signing, and RBAC logic.
    *   Write comprehensive integration tests for authentication (valid/invalid/expired/revoked tokens), authorization (all roles/permissions), and protected endpoint access.
5.  **Update Documentation:**
    *   Create/update the Security Model document detailing the chosen auth strategy and the key management plan.
    *   Document key management operational procedures.
    *   Update README/API documentation regarding authentication.
6.  **Audit Middleware Application:** Review all route definitions in `src/routes/` and ensure appropriate auth middleware is applied.
7.  **Document Secret Handling:** Add notes to `README.md` or operational docs on securely providing `JWT_SECRET` (and any new secrets for key management) in production.

---

## Proposed Implementation Plan (For Gaps)

*(Prioritizing critical gaps)*

### 1. Feature Branch: `feature/secure-key-management`
*   **Goal:** Implement secure storage and retrieval for OB 3.0 issuer private keys.
*   **Requirements Research/Documentation:** Define storage method (e.g., AES-GCM encryption in DB using a master key from env var). Keys needed per issuer for EdDSA signing.
*   **High-Level Implementation Steps:**
    1.  Add necessary crypto dependencies (`node:crypto`).
    2.  Update DB schema (`issuers` table?) to store encrypted private key and public key. Add migration.
    3.  Create `src/services/key.service.ts` with functions:
        *   `generateKeyPair(): { publicKey: string, privateKey: string }`
        *   `encryptPrivateKey(privateKey: string, masterKey: string): string`
        *   `decryptPrivateKey(encryptedKey: string, masterKey: string): string`
        *   `getIssuerPrivateKey(issuerId: string): Promise<string>` (fetches encrypted key, decrypts)
    4.  Add `MASTER_ENCRYPTION_KEY` to `.env.example` and configuration.
    5.  (Phase 5 Task): Integrate `getIssuerPrivateKey` into the OB 3.0 signing logic.
*   **Verification/Testing Plan:**
    *   Unit test encryption/decryption logic.
    *   Unit test key retrieval, mocking DB interaction.
    *   Integration test: Simulate creating an issuer, storing keys, retrieving and decrypting the private key.
*   **Key Commit Points:**
    *   `feat(db): add encrypted private key storage to issuers table`
    *   `feat(service): implement key generation and encryption service`
    *   `feat(service): implement secure private key retrieval logic`
    *   `test(service): add unit and integration tests for key service`
    *   `docs(security): document key management strategy and MASTER_ENCRYPTION_KEY`

### 2. Feature Branch: `refactor/consolidate-auth` (Assuming JWT strategy is kept for now)
*   **Goal:** Resolve redundant JWT middleware and integrate token revocation checks.
*   **Requirements Research/Documentation:** Merge features of `auth.ts` (RBAC, ownership, rate limiting, `hono/jwt` verify) and `auth.middleware.ts` (DB revocation check, custom `verifyToken`). Standardize on one approach.
*   **High-Level Implementation Steps:**
    1.  Modify `src/middleware/auth.ts`:
        *   Inject `IDatabaseService` dependency.
        *   Add DB check `await db.isTokenRevoked(token)` *before* calling `verify`.
        *   Ensure `verify` options (secret, algorithms) are correctly configured.
        *   Potentially remove the custom `verifyToken` util if `hono/jwt`'s `verify` is sufficient.
    2.  Refactor `createAuthMiddleware` pattern if necessary, or adapt `requireAuth` to include revocation check. Standardize middleware usage (e.g., always use `requireAuth` then `requireRole`).
    3.  Delete `src/middleware/auth.middleware.ts`.
    4.  Search codebase for usages of the old middleware/utils and update them.
*   **Verification/Testing Plan:**
    *   Update existing integration tests for `requireAuth` to include revoked token scenarios.
    *   Add integration tests verifying that revoked tokens are rejected even if otherwise valid.
    *   Ensure RBAC and ownership tests still pass.
*   **Key Commit Points:**
    *   `refactor(auth): integrate token revocation check into requireAuth middleware`
    *   `refactor(auth): remove redundant auth.middleware.ts and update usages`
    *   `test(auth): add integration tests for token revocation scenarios`

### 3. (Future/Decision Dependent) Feature Branch: `feature/implement-oauth2`
*   *(Plan to be detailed if this path is chosen over JWT)*

---

## Learnings & Next Steps
*   The most critical security gap is the lack of OB 3.0 key management. This needs immediate attention (Branch 1).
*   A decision must be made regarding JWT vs. OAuth 2.0 to resolve the conflict with Rule 005 and guide further auth development (Branch 2 or 3).
*   Security testing needs significant enhancement. 