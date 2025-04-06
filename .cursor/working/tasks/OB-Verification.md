# Cursor Prompt: Open Badges Server Review & Improvement Plan

**AI Role:** You are an expert Code Reviewer and Software Architect specializing in Node.js/Bun backend development, security best practices, testing strategies, and the Open Badges specification (v2.0 & v3.0).

**Goal:** Review the current Open Badges server codebase within this workspace (`@workspace`), verify its implementation against the provided best-practice development plan, identify gaps or areas for improvement, and suggest concrete actions, including outlining implementation steps for major missing features as if planning new feature branches.

**Context & Benchmark:**
The primary benchmark for this review is the following comprehensive development plan for building an Open Badges 2.0 & 3.0 server using Bun, Hono, and Postgres. Evaluate the current codebase against the principles, phases, tasks, technologies (Bun, Hono, Postgres, TypeScript, Zod, etc.), and best practices outlined in this plan.

```plaintext
---[START DEVELOPMENT PLAN BENCHMARK]---

# Development Plan: Open Badges 2.0 & 3.0 Headless Server (Bun/Hono/Postgres)

## Project Goal
Create a secure, reliable, and maintainable headless server capable of issuing and verifying Open Badges 2.0 and 3.0 credentials, adhering to relevant specifications and best practices.

## Core Technologies
Bun (Runtime), Hono (Web Framework), PostgreSQL (Database w/ Bun.sql), TypeScript.

## Key Principles
* **Security First:** Prioritize secure design and implementation at every stage.
* **Test-Driven Development (TDD) / Behavior-Driven Development (BDD):** Write tests before or alongside implementation.
* **Continuous Integration/Continuous Deployment (CI/CD):** Automate testing and deployment processes early.
* **Infrastructure as Code (IaC):** Manage infrastructure setup programmatically where possible.
* **Iterative Development:** Build and release features incrementally.
* **Comprehensive Documentation:** Document code, APIs, and processes throughout.
* **Code Quality:** Enforce linting, formatting, and conduct code reviews.

---

## Development Plan Phases

### Phase 0: Planning & Architectural Design (Sprint 0)
* **Goal:** Define scope, architecture, security model, and project setup.
* **Tasks:**
    1.  **Detailed Requirements Gathering:**
        * Confirm core features: OB 2.0 Issuance/Verification, OB 3.0 Issuance/Verification.
        * Define support for specific features: Revocation (internal flag required, external list optional?), Evidence handling, Alignment objects, embedded vs. referenced entities.
        * Define target users/clients and authentication needs.
        * Establish non-functional requirements: Performance targets, security standards, compliance needs (if any).
    2.  **Technology Stack Confirmation & Library Selection:**
        * Confirm Bun, Hono, Postgres, Bun.sql.
        * Select libraries for:
            * Validation: Zod (highly recommended).
            * Cryptography: Leverage `node:crypto` where possible, potentially specialized VC/JWT libraries if needed for specific formats/algorithms.
            * Database Migrations: `node-pg-migrate` or similar.
            * Logging: Pino or similar structured logger.
            * Testing: `bun:test` (built-in).
    3.  **API Design:**
        * Design RESTful API endpoints (consider `/api/v1/...` for versioning).
        * Define standard request/response formats (including errors).
        * Choose API documentation standard: OpenAPI 3.x.
    4.  **Database Schema Design:**
        * Finalize table structures (refining the previous example), relationships, constraints, indexing strategy. Use UUIDs. Leverage JSONB appropriately.
    5.  **Security Architecture:**
        * Define Authentication Strategy: API Keys (hashed storage), JWT, OAuth2 Client Credentials? Choose based on client needs.
        * Define Authorization Strategy: Role-based access control (RBAC) if needed (e.g., different permissions for different API keys/users).
        * Define Secure Key Management Strategy (CRITICAL for OB 3.0): How will issuer private keys be generated, stored, accessed securely? (e.g., HashiCorp Vault, AWS/GCP/Azure Secrets Manager, secure environment variables - document the chosen method and risks).
    6.  **Setup Project Management:** Choose task tracking tool (Jira, GitHub Issues, etc.).
    7.  **Initial Task Breakdown:** Create high-level user stories/tasks for subsequent phases.
* **Testing:** N/A (Planning Phase).
* **Documentation:**
    * Project Scope Document.
    * Initial Architecture Diagram(s).
    * API Design Document (Draft OpenAPI Spec).
    * Database Schema Diagram/Definition.
    * Security Model Document (AuthN/AuthZ, Key Management).
* **Best Practices:** Thorough planning, involving security early, clear documentation of decisions.
* **Commit Point:** Design approved, initial backlog created.

### Phase 1: Project Foundation & CI/CD Setup (Sprint 1)
* **Goal:** Establish a working project structure, basic server, tooling, and CI pipeline.
* **Tasks:**
    1.  Initialize Project: `bun init`, setup `tsconfig.json`.
    2.  Install Core Dependencies: Hono, Zod, Bun.sql types (`bun-types`), logging library.
    3.  Setup Basic Hono Server: Create entry point (`index.ts`), add a simple health check route (`/health`).
    4.  Configure Linting/Formatting: ESLint, Prettier. Integrate with Git hooks (Husky + lint-staged).
    5.  Setup Version Control: Initialize Git, define branching strategy (e.g., Gitflow), setup `main` and `develop` branches.
    6.  Setup Basic CI Pipeline (e.g., GitHub Actions):
        * Trigger on push/PR to `develop`/`main`.
        * Jobs: Lint, Format Check, Build, Run basic tests (health check).
    7.  Environment Configuration: Setup `.env` handling (e.g., `dotenv`). Define structure for dev/test/prod variables.
    8.  Containerization Basics (Optional but Recommended): Create initial `Dockerfile` for development.
* **Testing:**
    * Write initial integration test for the `/health` endpoint using `bun:test`.
* **Documentation:**
    * README.md: Basic project setup, how to run locally, run linters.
    * Contribution Guidelines (branching strategy, code style).
    * CI/CD pipeline configuration documented.
* **Best Practices:** Automate early (CI, linting), establish consistent structure, version control discipline.
* **Commit Point:** Runnable basic server, CI pipeline passing basic checks.

### Phase 2: Core Infrastructure & Database Setup (Sprint 2)
* **Goal:** Implement database connectivity, migrations, logging, and error handling framework.
* **Tasks:**
    1.  Implement Database Connection Module: Create reusable module (`src/db.ts`) using Bun.sql, handling connection details from environment variables.
    2.  Setup Database Migration Tool: Integrate `node-pg-migrate` or chosen tool. Create configuration.
    3.  Create Initial Migration: Write the first migration script based on the designed schema (`sql/migrations/001_initial_schema.sql`).
    4.  Add Migration Scripts to `package.json`: `db:migrate`, `db:migrate:down`, `db:create`.
    5.  Implement Structured Logging: Integrate Pino (or chosen library). Configure basic request logging middleware in Hono. Set log levels via environment variables.
    6.  Implement Global Error Handling: Create custom error classes (e.g., `ApiError`, `NotFoundError`, `ValidationError`). Implement Hono middleware to catch errors, log them appropriately (with stack trace for server errors), and return standardized JSON error responses.
* **Testing:**
    * Integration tests: Verify DB connection, run migrations up/down (against a test DB), test error handling middleware responses for different error types.
* **Documentation:**
    * Update README: Explain database setup, running migrations, environment variables needed (DB_URL, LOG_LEVEL).
    * Document error response format in API design doc.
    * Document logging configuration.
* **Best Practices:** Manage schema changes systematically (migrations), centralize error handling, structured logging.
* **Commit Point:** Database setup complete, migrations working, core logging & error handling in place.

### Phase 3: Security Implementation (Sprint 3)
* **Goal:** Implement authentication, authorization, and secure key management.
* **Tasks:**
    1.  Implement Authentication Strategy:
        * If API Keys: Generate secure keys, store hashes, create middleware to validate incoming keys.
        * If JWT: Implement token generation/validation, potentially using a library like `hono/jwt`.
    2.  Implement Authorization Middleware: If needed, create middleware to check roles/permissions based on the authenticated identity.
    3.  Implement Secure Key Loading: Implement functions to securely load issuer private keys based on the strategy defined in Phase 0 (e.g., fetching from secrets manager). Ensure keys are not exposed in logs or error messages.
    4.  Apply Auth Middleware: Protect relevant Hono routes (initially maybe just a test route).
* **Testing:**
    * Unit tests: Test key loading logic (mocking secret stores), JWT validation logic.
    * Integration tests: Test AuthN/AuthZ middleware (valid/invalid credentials, correct/incorrect permissions). Test protected endpoints.
* **Documentation:**
    * Update README/API Docs: Explain how to authenticate API requests.
    * Document key management procedures and requirements for operators.
    * Update Security Model document with implementation details.
* **Best Practices:** Principle of least privilege, secure storage/handling of secrets, thorough testing of security controls.
* **Commit Point:** Authentication, authorization, and secure key loading mechanisms implemented and tested.

### Phase 4: Open Badges 2.0 Implementation (Sprint 4-5)
* **Goal:** Implement OB 2.0 issuance and verification endpoints.
* **Tasks:**
    1.  Define Models & Validation: Create Zod schemas for OB 2.0 Issuer, BadgeClass, Assertion structures. Use these for validation and TypeScript types.
    2.  Implement Issuance Endpoint (`POST /v1/badges/2.0/issue`):
        * Apply Auth middleware.
        * Validate request body using Zod schema.
        * Implement service logic: Find/create Issuer, find/create BadgeClass, create Assertion record in DB. Generate UUIDs.
        * Return assertion URL or JSON-LD response as per spec.
    3.  Implement Assertion Hosting Endpoint (if needed): `GET /v1/assertions/2.0/:assertionId` to serve the JSON.
    4.  Implement Verification Endpoint (`GET /v1/badges/2.0/verify/:assertionId` or `POST /v1/badges/2.0/verify`):
        * Validate input (ID or assertion data/URL).
        * Implement service logic: Fetch Assertion, BadgeClass, Issuer from DB. Handle cases where they might be external URLs (implement fetching logic). Check `revoked` status. (Optional: Implement basic revocation list check).
        * Return standardized verification result (`{ status: 'valid' }` or `{ status: 'invalid', reason: '...' }`).
* **Testing (TDD approach):**
    * Unit tests: Zod schema validation, service logic functions (mocking DB calls).
    * Integration tests: Test API endpoints thoroughly - successful issuance, validation errors, auth failures, not found errors, successful verification, revoked verification, verification of externally hosted components (if implemented).
    * E2E tests: Simulate client issuing a badge, then verifying it using the returned URL/ID.
* **Documentation:**
    * Document OB 2.0 API endpoints in OpenAPI spec (request/response schemas, auth).
    * Update README with examples using `curl` or similar.
* **Best Practices:** Strict validation, adherence to OB 2.0 spec, comprehensive testing covering edge cases.
* **Commit Point:** OB 2.0 functionality complete, tested, and documented.

### Phase 5: Open Badges 3.0 Implementation (Sprint 6-7)
* **Goal:** Implement OB 3.0 issuance and verification endpoints with cryptographic signing.
* **Tasks:**
    1.  Define Models & Validation: Create Zod schemas for OB 3.0 / Verifiable Credential structures (AchievementCredential, proof types like `Ed25519Signature2020`).
    2.  Implement Issuance Endpoint (`POST /v1/badges/3.0/issue`):
        * Apply Auth middleware.
        * Validate request body using Zod schema.
        * Implement service logic: Find/create Issuer, securely load issuer's private key.
        * Implement Cryptographic Signing: Generate the VC structure, apply necessary canonicalization (e.g., RDF Dataset Canonicalization), sign using the private key and chosen algorithm (e.g., EdDSA), create the `proof` object correctly.
        * Store relevant credential data (including proof/signature) in `achievement_credentials_3_0` table.
        * Return the full signed VC JSON-LD.
    3.  Implement Verification Endpoint (`POST /v1/badges/3.0/verify`):
        * Validate incoming VC JSON-LD structure.
        * Implement service logic: Parse credential, extract proof. Retrieve issuer's public key (from DB or potentially via DID resolution if implemented).
        * Implement Cryptographic Verification: Apply canonicalization to the credential data (matching the signing process), verify the signature using the public key and algorithm specified in the proof.
        * Check `revoked` status in DB, check `expirationDate`.
        * Return standardized verification result (`{ status: 'valid', verificationMethod: '...' }` or `{ status: 'invalid', reason: '...' }`).
* **Testing (TDD approach):**
    * Unit tests: **Crucially test signing and verification functions** (mocking keys, using known test vectors if possible). Test validation schemas.
    * Integration tests: Test API endpoints - successful issuance/verification, signature failures, key errors, validation errors, revoked/expired checks.
    * E2E tests: Simulate client issuing an OB 3.0 badge, then submitting it for verification.
* **Documentation:**
    * Document OB 3.0 API endpoints in OpenAPI spec (include details on expected proof formats).
    * Document the specific cryptographic suites supported.
* **Best Practices:** Strict adherence to VC/OB 3.0 specs, secure crypto implementation, thorough crypto testing, use established crypto libraries correctly.
* **Commit Point:** OB 3.0 functionality complete, tested (especially crypto), and documented.

### Phase 6: Testing Consolidation & Security Review (Sprint 8)
* **Goal:** Ensure comprehensive test coverage and perform a security audit.
* **Tasks:**
    1.  Test Coverage Analysis: Run `bun test --coverage`. Identify critical areas with low coverage and add tests.
    2.  Refactoring: Address any technical debt identified during development or testing. Improve code clarity and performance.
    3.  Manual Code Review/Security Audit: Focus on:
        * Authentication & Authorization logic.
        * Input validation (potential bypasses).
        * Cryptographic implementation (correctness, secure key handling).
        * Error handling (information leakage).
        * Dependency vulnerabilities (`bun pm audit` or similar).
        * Common web vulnerabilities (OWASP Top 10 checks).
    4.  Performance Testing (Optional): Basic load testing on key endpoints.
* **Testing:** Fill test coverage gaps, write tests for any refactored code.
* **Documentation:** Document results of security review and any actions taken. Update performance benchmark results if applicable.
* **Best Practices:** Dedicated security focus before release, aiming for high test coverage.
* **Commit Point:** Codebase stable, well-tested, security reviewed.

### Phase 7: Documentation Finalization & Deployment Prep (Sprint 9)
* **Goal:** Finalize all documentation and prepare for deployment.
* **Tasks:**
    1.  Finalize README: Ensure it covers overview, setup, config, testing, API usage, deployment notes.
    2.  Finalize API Documentation: Generate/polish OpenAPI spec. Ensure it's accurate and complete. Consider hosting it (e.g., using Swagger UI).
    3.  Write Operational Documentation: Notes for operators on deploying, configuring, monitoring, and backing up the server/database.
    4.  Prepare Production Build: Create/test production build scripts (`bun build`).
    5.  Finalize Containerization: Optimize `Dockerfile` for production (multi-stage builds, non-root user, etc.).
    6.  Prepare Infrastructure (IaC): Write/test Terraform/Pulumi scripts (or manual setup docs) for production environment (server instances/containers, database instance, secrets management, load balancer, DNS). Ensure HTTPS setup.
    7.  Configure Production CI/CD: Setup pipeline stages for deploying to staging and production environments. Include automated E2E tests against staging.
* **Testing:** Test production build process, test container image, test IaC scripts (dry-run).
* **Documentation:** All user-facing and operational documentation finalized.
* **Best Practices:** Treat documentation as a deliverable, automate infrastructure provisioning, prepare thoroughly for deployment.
* **Commit Point:** Ready for deployment to production.

### Phase 8: Deployment & Post-Launch (Sprint 10+)
* **Goal:** Deploy to production and establish monitoring and maintenance routines.
* **Tasks:**
    1.  Deploy to Staging: Use CI/CD pipeline.
    2.  Test Staging Environment: Run full E2E test suite, perform manual exploratory testing.
    3.  Deploy to Production: Use CI/CD pipeline (potentially with manual approval step).
    4.  Post-Deployment Checks: Monitor logs, check health endpoint, perform basic manual verification.
    5.  Setup Monitoring & Alerting: Configure monitoring tools (e.g., Prometheus/Grafana, Datadog) to track application performance, errors, resource usage. Set up alerts for critical errors or performance degradation.
    6.  Establish Maintenance Procedures: Schedule regular dependency updates, backups, security scans.
* **Testing:** Automated E2E tests against staging, manual testing post-deployment.
* **Documentation:** Update operational docs with any deployment-specific details. Create runbooks for common issues.
* **Best Practices:** Phased rollout (staging -> prod), automated deployment, proactive monitoring, regular maintenance.
* **Commit Point:** Application live in production, monitoring active.

---

This plan provides a robust framework. Remember to adapt it based on your specific project constraints, team size, and the complexity of the features you decide to implement. Good luck!

---[END DEVELOPMENT PLAN BENCHMARK]---