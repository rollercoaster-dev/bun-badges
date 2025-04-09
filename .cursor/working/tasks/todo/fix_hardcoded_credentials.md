# Fix Hard-coded Credentials

## 1. Goal
- **Objective:** Remove hard-coded database credentials from the codebase to pass CodeQL security checks
- **Energy Level:** Medium 🔋
- **Status:** 🟡 In Progress

## 2. Resources
- **Existing Tools/Files:**
  - `src/db/config.ts` - Database configuration with hard-coded credentials
  - `src/db/schema/ensure-schema.ts` - Schema validation with hard-coded credentials
  - `.github/workflows/ci.yml` - CI workflow with database configuration
  - GitHub secrets: DB_PASSWORD, POSTGRES_PASSWORD, JWT_SECRET, MASTER_ENCRYPTION_KEY, REFRESH_TOKEN_SECRET
- **Additional Needs:**
  - Potential additional environment variables for development
  - Updated documentation for environment setup
- **Related Files:**
  - `src/db/config.ts`
  - `src/db/schema/ensure-schema.ts`
  - `.github/workflows/ci.yml`
  - `.env.example`
  - `README.md` (for updated environment documentation)

## 3. Ideas & Challenges
- **Approaches:**
  - Replace hard-coded credentials with environment variables
  - Add clear fallbacks for development environments only
  - Use non-sensitive placeholder values for documentation
  - Add clear comments indicating development-only values
- **Potential Issues:**
  - CI pipeline might break if environment variables aren't properly set
  - Local development might be affected if defaults are removed
  - Need to balance security with developer experience
- **Decision Log:**
  - Decision: Use descriptive non-credential placeholder values instead of actual credentials
  - Reasoning: Prevents security issues while maintaining clear intent
  - Alternatives: Remove fallbacks entirely (rejected due to developer experience impact)

## 4. Plan
- **Quick Wins:**
  - [ ] Update `src/db/config.ts` to use non-credential placeholder values (10 mins)
  - [ ] Update `src/db/schema/ensure-schema.ts` to use non-credential placeholder values (10 mins)
- **Major Steps:**
  1. Analyze CodeQL alerts to identify all instances of hard-coded credentials (15 mins) 🎯
  2. Update database configuration files to use secure fallbacks (30 mins) 🎯
  3. Update CI workflow to properly use GitHub secrets (20 mins) 🎯
  4. Update documentation for environment setup (15 mins) 🎯
  5. Test changes locally and in CI (20 mins) 🎯

## 5. Execution
- **Progress Updates:**
  - [ ] Analyzed CodeQL alerts and identified affected files
  - [ ] Updated database configuration files
  - [ ] Updated CI workflow
  - [ ] Updated documentation
  - [ ] Tested changes
- **Context Resume Point:**
  Last working on: Analyzing CodeQL alerts
  Next planned action: Update database configuration files
  Current blockers: None

## 6. Next Actions & Blockers
- **Immediate Next Actions:** 
  - [ ] Analyze all CodeQL alerts to identify all instances of hard-coded credentials (15 mins)
  - [ ] Create a list of all files that need to be updated (5 mins)
- **Current Blockers:**
  - None identified yet

## 7. User Experience & Reflection
- **Friction Points:** To be determined
- **Flow Moments:** To be determined
- **Observations:** To be determined
- **Celebration Notes:** 🎉 To be determined
