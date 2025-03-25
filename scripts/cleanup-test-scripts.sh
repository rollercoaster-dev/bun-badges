#!/bin/bash
set -e

echo "=== Cleaning up unnecessary test migration scripts ==="

# Files to remove
TEST_SCRIPTS_TO_REMOVE=(
  "scripts/migrate-tests.js"
  "scripts/migrate-tests.sh"
  "scripts/migrate-tests.ts"
  "scripts/migrate-all-tests.js"
  "scripts/cleanup-old-tests.js"
  "scripts/dedup-tests.js"
  "scripts/update-tests.js"
  "scripts/setup-lightweight.js"
  "scripts/fix-unused-vars.ts"
)

# Check each file and remove if exists
for file in "${TEST_SCRIPTS_TO_REMOVE[@]}"; do
  if [ -f "$file" ]; then
    echo "Removing $file"
    rm "$file"
  else
    echo "File $file already removed"
  fi
done

echo "=== Cleanup complete ==="

echo -e "\n=== Scripts to keep ==="
echo "✅ scripts/generate-certs.sh - Essential for HTTPS development"
echo "✅ scripts/init-test-db.sql - Database initialization script"
echo "✅ scripts/lint.ts - For code linting and quality"
echo "✅ scripts/run-tests.sh - Main test runner script"
echo "✅ scripts/cleanup-docker-build-files.sh - Docker build files cleanup"
echo "✅ scripts/cleanup-test-scripts.sh - This script"

echo -e "\n=== Recommendations ==="
echo "1. Update package.json to remove references to deleted scripts"
echo "2. Commit the changes with a message like:"
echo "   git commit -m \"chore: remove unused test migration scripts\"" 