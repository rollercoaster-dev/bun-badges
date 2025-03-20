#!/bin/bash

# Test Integration Script
# Runs integration tests with Docker Compose test database

# Color codes for output formatting
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting test database...${NC}"

# Start the test database
docker-compose -f docker-compose.test.yml up -d test-db

# Wait for the database to be ready
echo -e "${YELLOW}Waiting for database to be ready...${NC}"
sleep 5

# Check if the database is ready
echo -e "${YELLOW}Checking database connection...${NC}"
RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $RETRIES ]; do
  docker exec bun-badges-test-db pg_isready -U postgres -d bun_badges_test
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Database is ready!${NC}"
    break
  fi
  
  echo -e "${YELLOW}Database not ready yet, waiting...${NC}"
  RETRY_COUNT=$((RETRY_COUNT+1))
  sleep 2
done

if [ $RETRY_COUNT -eq $RETRIES ]; then
  echo -e "${RED}Failed to connect to the database. Please check if it's running.${NC}"
  docker-compose -f docker-compose.test.yml logs test-db
  docker-compose -f docker-compose.test.yml down
  exit 1
fi

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
# Use the proper migration command
DATABASE_URL=postgres://postgres:postgres@localhost:5434/bun_badges_test bun run db:migrate
echo -e "${GREEN}Database migrations completed.${NC}"

# Run the integration tests
echo -e "${GREEN}Running integration tests...${NC}"
# Use our dedicated integration setup
DATABASE_URL=postgres://postgres:postgres@localhost:5434/bun_badges_test bun test --preload ./src/utils/test/integration-setup.ts ./src/__tests__/routes/assertions.routes.test.ts
TEST_EXIT_CODE=$?

# Stop the test database
echo -e "${YELLOW}Stopping test database...${NC}"
docker-compose -f docker-compose.test.yml down

# Exit with the test exit code
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}Integration tests passed!${NC}"
else
  echo -e "${RED}Integration tests failed!${NC}"
fi

exit $TEST_EXIT_CODE 