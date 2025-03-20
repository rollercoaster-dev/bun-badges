#!/bin/bash

# Colors for better output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check if a specific test file was provided
if [ "$#" -eq 1 ]; then
  TEST_FILE="$1"
  echo -e "${BLUE}=== Running Single Integration Test: ${TEST_FILE} ===${NC}"
  SINGLE_TEST=true
else
  echo -e "${BLUE}=== Running All Integration Tests ===${NC}"
  SINGLE_TEST=false
fi

# Start the test database
echo -e "${YELLOW}Starting test database...${NC}"
docker compose -f docker-compose.test.yml up -d test-db

# Wait for the database to be ready
echo -e "${YELLOW}Waiting for database to be ready...${NC}"
for i in {1..20}; do
  echo "Checking database connection..."
  if docker exec bun-badges-test-db pg_isready -U postgres -d bun_badges_test; then
    echo -e "${GREEN}Database is ready!${NC}"
    break
  fi
  if [ $i -eq 20 ]; then
    echo -e "${RED}Database didn't start within the expected time.${NC}"
    docker compose -f docker-compose.test.yml logs test-db
    docker compose -f docker-compose.test.yml down
    exit 1
  fi
  sleep 2
done

# Run database migrations
echo -e "${GREEN}Running database migrations...${NC}"
DATABASE_URL=postgres://postgres:postgres@localhost:5434/bun_badges_test bun run src/db/migrate.ts
echo -e "${GREEN}Database migrations completed.${NC}"

# Find test files to run
if [ "$SINGLE_TEST" = true ]; then
  # Use the provided test file
  TEST_FILES="$TEST_FILE"
  
  # Check if the file exists
  if [ ! -f "$TEST_FILE" ]; then
    echo -e "${RED}Error: Test file '${TEST_FILE}' not found${NC}"
    docker compose -f docker-compose.test.yml down
    exit 1
  fi
else
  # Find all integration test files
  echo -e "${YELLOW}Finding integration test files...${NC}"
  TEST_FILES=$(find src -name "*.integration.test.ts" | tr '\n' ' ')
fi

echo -e "${YELLOW}Test files to run:${NC}"
echo "$TEST_FILES"

# Run the tests with the database URL pointing to the Docker container
echo -e "${GREEN}Running tests...${NC}"
DATABASE_URL=postgres://postgres:postgres@localhost:5434/bun_badges_test bun test --preload ./src/utils/test/integration-setup.ts $TEST_FILES
TEST_EXIT_CODE=$?

# Stop and remove the test database
echo -e "${YELLOW}Stopping test database...${NC}"
docker compose -f docker-compose.test.yml down

# Exit with the test result
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}Integration tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Integration tests failed!${NC}"
  exit 1
fi 