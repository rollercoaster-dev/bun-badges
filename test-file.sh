#!/bin/bash

# Script to automatically determine and run the correct test type
# Usage: ./test-file.sh path/to/test/file.ts

set -e

# Colors for pretty output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if a test file was provided
if [ "$#" -eq 0 ]; then
  echo -e "${RED}Error: No test file specified${NC}"
  echo -e "Usage: $0 path/to/test/file.ts"
  exit 1
fi

TEST_FILE=$1

# Check if the file exists
if [ ! -f "$TEST_FILE" ]; then
  echo -e "${RED}Error: Test file '${TEST_FILE}' not found${NC}"
  exit 1
fi

# Determine if it's an integration test or unit test
if [[ "$TEST_FILE" == *"integration"* ]]; then
  echo -e "${BLUE}Detected integration test: ${TEST_FILE}${NC}"
  echo -e "${YELLOW}Running with: npm run test:integration:file -- ${TEST_FILE}${NC}"
  bash ./test-integration.sh "$TEST_FILE"
else
  echo -e "${BLUE}Detected unit test: ${TEST_FILE}${NC}"
  echo -e "${YELLOW}Running with: npm run test:unit:file ${TEST_FILE}${NC}"
  bun test --preload ./tests/setup.ts "$TEST_FILE"
fi 