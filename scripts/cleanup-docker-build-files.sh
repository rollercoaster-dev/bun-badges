#!/bin/bash
set -e

echo "=== Cleaning up Docker build debugging files ==="

# Files to remove
FILES_TO_REMOVE=(
  "global-bitset.js"
  "patches/fast-bitset.js"
  "scripts/test-bitset.js"
  "scripts/canvas-diagnostic.js"
  "scripts/prepare-docker-build.js"
  "scripts/restore-package-json.js"
  "scripts/test-docker-build.sh"
  "scripts/verify-docker-build.sh"
  "scripts/verify-production-build.sh"
)

# Check each file and remove if exists
for file in "${FILES_TO_REMOVE[@]}"; do
  if [ -f "$file" ]; then
    echo "Removing $file"
    rm "$file"
  else
    echo "File $file already removed"
  fi
done

# Clean up patches directory if empty
if [ -d "patches" ] && [ -z "$(ls -A patches)" ]; then
  echo "Removing empty patches directory"
  rmdir patches
fi

echo "=== Cleanup complete ==="

echo -e "\n=== Files to keep ==="
echo "✅ build.ts - Main TypeScript build script"
echo "✅ src/utils/bitset.ts - Custom BitSet implementation"
echo "✅ src/utils/compatibility.ts - Compatibility utilities"
echo "✅ tsconfig.build.json - Build configuration"

echo -e "\n=== Recommended Git commands ==="
echo "To stage changes to build.ts and other core files:"
echo "git add build.ts tsconfig.build.json src/utils/bitset.ts src/utils/compatibility.ts"
echo ""
echo "To update the Dockerfile changes:"
echo "git add Dockerfile"
echo ""
echo "To update package.json:"
echo "git add package.json" 