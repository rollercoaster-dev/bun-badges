#!/bin/bash
set -e

echo "=== Safely organizing project files ==="

# Step 1: Create target directories
mkdir -p tests/utils/jsonb
mkdir -p docs/database
mkdir -p tools

# Step 2: Only move non-critical test files
echo "Moving JSONB test files..."
test_files=(
  "test-jsonb-usage.ts"
  "test-jsonb.ts"
  "test-jsonb-helper.ts"
  "test-jsonb-import.ts"
)

for file in "${test_files[@]}"; do
  if [ -f "$file" ]; then
    echo "Moving $file to tests/utils/jsonb/"
    cp "$file" "tests/utils/jsonb/"
    echo "Original remains in root for compatibility"
  fi
done

# Move JSONB notes to docs
if [ -f "JSONB-NOTES.md" ]; then
  echo "Copying JSONB-NOTES.md to docs/database/"
  cp "JSONB-NOTES.md" "docs/database/JSONB-NOTES.md"
  echo "Original remains in root for compatibility"
fi

# Step 3: Remove the upgrade-test directory
if [ -d "upgrade-test" ]; then
  echo "Removing upgrade-test directory..."
  rm -rf upgrade-test
fi

# Step 4: Create a new .env.example.reference if it doesn't exist
if [ ! -f ".env.example.reference" ] && [ -f ".env.example" ]; then
  echo "Creating a reference copy of .env.example..."
  cp .env.example .env.example.reference
fi

echo ""
echo "=== Safe project organization completed ==="
echo ""
echo "This script has taken a cautious approach:"
echo "1. Created organized directories for future use"
echo "2. Copied (not moved) existing files to their appropriate locations"
echo "3. Removed only the upgrade-test directory that's no longer needed"
echo ""
echo "Manual Steps:"
echo "1. Once you verify everything works, you can manually remove the original copies"
echo "2. Consider organizing Docker files with: ./scripts/organize-docker-files.sh"
echo "3. Check docs/project-structure.md for recommended project organization" 