#!/bin/bash
set -e

echo "=== Organizing project files ==="

# Create test utilities directory if it doesn't exist
mkdir -p tests/utils/jsonb

# Move JSONB test files to tests/utils/jsonb
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
    mv "$file" "tests/utils/jsonb/"
  fi
done

# Move JSONB notes to docs
if [ -f "JSONB-NOTES.md" ]; then
  echo "Moving JSONB-NOTES.md to docs/"
  mv "JSONB-NOTES.md" "docs/"
fi

# Create tools directory for utility scripts
mkdir -p tools

# Move standalone utility scripts to tools directory
echo "Moving utility scripts..."
util_scripts=(
  "verify-credential-service.ts"
  "compare-db-environments.ts"
)

for file in "${util_scripts[@]}"; do
  if [ -f "$file" ]; then
    echo "Moving $file to tools/"
    mv "$file" "tools/"
  fi
done

# Remove the upgrade-test directory
if [ -d "upgrade-test" ]; then
  echo "Removing upgrade-test directory..."
  rm -rf upgrade-test
fi

# Create docker directory and move Docker files
mkdir -p docker
echo "Creating docker/ directory for Docker configuration..."
echo "(Note: We're keeping the main Dockerfile and docker-compose.yml in the root for build compatibility)"
echo "You may want to consider moving docker-compose variants to docker/ directory manually"

# Update package.json to reference moved files
echo "Updating package.json to reference moved files..."
if [ -f "package.json" ]; then
  # Create backup
  cp package.json package.json.bak
  
  # Use sed to update paths in package.json
  sed -i.bak 's/verify-credential-service\.ts/tools\/verify-credential-service.ts/g' package.json
  sed -i.bak 's/compare-db-environments\.ts/tools\/compare-db-environments.ts/g' package.json
  
  # Clean up backup
  rm package.json.bak
fi

echo "=== Project file organization completed ==="
echo ""
echo "Recommendations:"
echo "1. Update CI/CD workflows if they reference moved files"
echo "2. Verify that all scripts work properly with new file locations"
echo "3. Update documentation to reflect new file structure"
echo ""
echo "Next Steps:"
echo "1. Review your Docker configuration organization:"
echo "   Consider moving secondary docker-compose files to docker/ directory:"
echo "   - docker-compose.dev.yml → docker/docker-compose.dev.yml"
echo "   - docker-compose.test.yml → docker/docker-compose.test.yml"
echo "   - docker-compose.light.yml → docker/docker-compose.light.yml"
echo ""
echo "2. Update your README.md with the new project structure" 