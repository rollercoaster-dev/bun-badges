#!/bin/bash
set -e

echo "=== Safely organizing utility scripts ==="

# Create tools directory if it doesn't exist
mkdir -p tools
mkdir -p tools/database
mkdir -p tools/verification

# Copy utility scripts to tools directory
echo "Copying utility scripts..."
util_scripts=(
  "verify-credential-service.ts"
  "compare-db-environments.ts"
)

for file in "${util_scripts[@]}"; do
  if [ -f "$file" ]; then
    if [[ "$file" == *"db"* ]]; then
      echo "Copying $file to tools/database/"
      cp "$file" "tools/database/"
    else
      echo "Copying $file to tools/verification/"
      cp "$file" "tools/verification/"
    fi
    echo "Original remains in root for compatibility"
  fi
done

# Copy index.ts to tools directory if it exists and is small
if [ -f "index.ts" ] && [ $(wc -l < "index.ts") -lt 50 ]; then
  echo "Copying index.ts to tools/"
  cp "index.ts" "tools/"
  echo "Original remains in root for compatibility"
fi

echo ""
echo "=== Utility script organization completed ==="
echo ""
echo "Utility scripts have been copied to the tools/ directory."
echo "The original files remain in the root directory for compatibility."
echo ""
echo "When you verify that everything works correctly, you can:"
echo "1. Update package.json references to point to the new locations"
echo "2. Manually remove the original files from the root directory" 