#!/bin/bash
set -e

echo "=== Manual Cleanup Guide ==="
echo ""
echo "This script doesn't delete anything - it just provides guidance on what"
echo "you can manually clean up after verifying everything works."
echo ""

# Check which test files can be safely removed
echo "=== JSONB Test Files ==="
test_files=(
  "test-jsonb-usage.ts"
  "test-jsonb.ts"
  "test-jsonb-helper.ts"
  "test-jsonb-import.ts"
)

for file in "${test_files[@]}"; do
  if [ -f "$file" ] && [ -f "tests/utils/jsonb/$file" ]; then
    echo "✓ $file can be safely removed from root (copied to tests/utils/jsonb/)"
  fi
done

echo ""
echo "=== Documentation Files ==="
if [ -f "JSONB-NOTES.md" ] && [ -f "docs/database/JSONB-NOTES.md" ]; then
  echo "✓ JSONB-NOTES.md can be safely removed from root (copied to docs/database/)"
fi

echo ""
echo "=== Suggestions for Organizing Database Code ==="
echo "Following our PostgreSQL guidelines, consider organizing database code:"
echo "1. Keep migration files in the drizzle/ directory"
echo "2. Put database utilities in src/utils/db/"
echo "3. Use JSONB columns for flexible Open Badges JSON structures"
echo "4. Ensure key fields are indexed for optimal performance"

echo ""
echo "=== Next Steps ==="
echo "1. Verify all Docker builds and tests work correctly with copied files"
echo "2. Update README.md to reference the new project structure in docs/project-structure.md"
echo "3. Commit the changes with a descriptive message:"
echo "   git add ."
echo "   git commit -m \"chore: organize project files and improve directory structure\""
echo ""
echo "Remember: Do not delete original files until you are 100% sure everything works!" 