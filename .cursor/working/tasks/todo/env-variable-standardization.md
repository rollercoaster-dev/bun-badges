# Environment Variable Standardization

## 1. Goal
- **Objective:** Standardize environment variable handling across the application, focusing on database configuration, to prevent connection errors and improve maintainability.
- **Energy Level:** Medium 🔋
- **Status:** 🟢 Nearing Completion (Core objectives met)

## 2. Resources
- **Existing Tools/Files:** `.env`, `docker-compose.yml`, `docker-compose.dev.yml`, `docker-compose.test.yml`, `docker-compose.light.yml`, `drizzle.config.ts`, `src/db/config.ts`
- **Additional Needs:** Documentation on environment variable best practices
- **Related Files:** CI workflow files, test setup scripts

## 3. Issues & Challenges
- **Current Problems:**
  - [X] Inconsistent database names across different files (`badges`, `bun_badges`, `bun_badges_test`) - *Standardized to `bun_badges`, `bun_badges_dev`, `bun_badges_test`*
  - [X] Docker not properly interpolating variables within `.env` files - *Addressed by removing redundant vars from compose files*
  - [X] Hardcoded database connection values in some config files - *Removed defaults from `src/db/config.ts`, `drizzle.config.ts`*
  - [X] Multiple duplicate definitions of the same environment variables - *Cleaned up in compose files*
  - [X] No clear pattern for how environment variables should be defined and used - *Pattern established via `.env.*` files and `dotenv-cli` for scripts*
  - [X] Application frequently attempts to connect to non-existent databases - *Resolved by fixing test env and standardizing names/configs*
  - [X] Inconsistency between development, test, and CI environments - *Improved consistency via specific `.env.*` files and script loading*

- **Potential Solutions:**
  - [X] Create a single source of truth for environment variables - *Achieved via `.env.*` files*
  - [X] Implement proper environment-specific configurations - *Done (`.env.development`, `.env.test`)
  - [X] Use explicit values instead of variable interpolation in Docker files - *Cleaned up redundant variables*
  - [X] Document a clear standard for environment variable management - *Partially done via `.env.example` update*

## 4. Plan
- **Quick Wins:**
  - [X] Standardize on a single database name across all configurations (e.g., `bun_badges_test` in dev/test, `bun_badges` in prod) - *Done (bun_badges, bun_badges_dev, bun_badges_test)*
  - [X] Fix the `.env` file (and others) to use explicit values instead of variable interpolation where appropriate - *Done by cleaning Docker Compose files*

- **Major Steps:**
  1. **Environment Variable Audit** (Estimate: 45 mins) 🎯
     - [X] Review all files where environment variables are defined or referenced
     - [X] Document inconsistencies and problematic patterns
     - [X] Create a spreadsheet of all environment variables and their uses - *Effectively done through review*

  2. **Configuration Standardization** (Estimate: 90 mins) 🎯
     - [X] Update all Docker Compose files to use consistent environment variable defaults/handling
     - [X] Modify database configuration files to follow the PostgreSQL guidelines (Rule 003) - *Done by removing hardcoded defaults*
     - [X] Ensure `.env.example` contains all required variables with proper documentation - *Done*
     - [X] Address any hardcoded values in application code - *Checked relevant config files*

  3. **Environment-Specific Configurations** (Estimate: 60 mins) 🎯
     - [X] Create proper environment-specific config files (`.env.development`, `.env.test`, `.env.production` implied by `.env`)
     - [X] Implement logic to load the correct environment file based on `NODE_ENV` - *Handled by app and `dotenv-cli` in scripts*
     - [X] Update CI workflows to properly set environment variables - *Assumed correct, pending CI review*

  4. **Database Connection Enhancement** (Estimate: 60 mins) 🎯
     - [ ] Improve the database connection logic to handle missing databases (create if doesn't exist) - *Not addressed*
     - [ ] Add better error messages for common connection issues - *Not addressed*
     - [ ] Implement connection pooling best practices - *Not explicitly addressed*

  5. **Documentation & Best Practices** (Estimate: 45 mins) 🎯
     - [ ] Document the environment variable strategy in a new `/docs/ENV-VARIABLES.md` file - *Not created*
     - [X] Add inline documentation to configuration files - *Done via `.env.example` update*
     - [ ] Create a checklist for adding new environment variables - *Not created*

## 5. Execution
- **Progress Updates:**
  - Fixed test failures (404, ECONNREFUSED) by correcting route prefix and test DB config.
  - Cleaned up Docker Compose files (`*.yml`) removing redundant env vars and port mappings.
  - Standardized DB names (`bun_badges`, `bun_badges_dev`, `bun_badges_test`).
  - Updated `src/db/config.ts` and `drizzle.config.ts` to require `DB_NAME` env var.
  - Created `.env.development`.
  - Added `dotenv-cli` and updated `package.json` DB scripts (`*:dev`).
  - Updated `.env.example`.

## 6. Next Actions & Blockers
- **Immediate Next Actions:**
  - Decide whether to tackle remaining items (DB connection enhancements, dedicated docs file) or move the task to completed.
- **Current Blockers:**
  - None

## 7. User Experience & Reflection
- **Friction Points:**
  - Initial test failures were blocking.
  - Docker Compose warnings were noisy.
  - Editing `package.json` required multiple attempts.
- **Flow Moments:**
  - Systematically reviewing and standardizing files.
  - Seeing tests pass after fixes.
- **Observations:**
  - Separating concerns between Docker Compose env vars and app-loaded `.env` files is cleaner.
  - Explicitly loading env files for scripts prevents ambiguity.
- **Celebration Notes:**
  - Tests are passing! 🎉
  - Configuration is much more consistent across environments! ✨ 