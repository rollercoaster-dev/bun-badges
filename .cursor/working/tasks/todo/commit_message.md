Fix: Replace hard-coded credentials with non-credential placeholders

This commit addresses CodeQL security alerts about hard-coded credentials by:

1. Replacing hard-coded database credentials with non-credential placeholder values:
   - Updated `src/db/config.ts` to use descriptive placeholder values
   - Updated `src/db/schema/ensure-schema.ts` to use descriptive placeholder values
   - Updated `.github/workflows/ci.yml` to use CI-specific placeholder values

2. Improving environment variable handling:
   - Added proper fallbacks for GitHub secrets in CI workflow
   - Added clear comments indicating development-only values
   - Updated PostgreSQL service configuration in CI workflow

3. Enhancing documentation:
   - Added security notes to `.env.example`
   - Improved comments about credential handling
   - Added clear warnings about not committing actual credentials

These changes maintain the developer experience while addressing security concerns
about hard-coded credentials in the codebase.
