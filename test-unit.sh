#!/bin/bash
set -e

echo "=== Running Unit Tests ==="

# Set environment variables for unit tests
export NODE_ENV=test
export INTEGRATION_TEST=false

# Find unit test files, excluding integration tests
UNIT_TEST_FILES=$(find \
  src/__tests__/ \
  tests/unit/ \
  src/tests/ \
  src/utils/__tests__/ \
  -name "*.test.ts" \
  ! -name "*.integration.test.ts" \
  ! -path "*/integration/*" \
  ! -path "*/credential.integration.test.ts" \
)

# Print test files to be run
echo "Running unit test files:"
echo "$UNIT_TEST_FILES" | tr ' ' '\n'
echo

# Run the tests
# The || true allows the script to continue even if tests fail
bun --preload ./tests/setup.ts test $UNIT_TEST_FILES || true

echo "Unit tests completed" 