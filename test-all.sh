#!/bin/bash

# Colors for better output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Running All Tests ===${NC}"

# Run unit tests first
echo -e "${YELLOW}🧪 Running unit tests...${NC}"
bun test:unit
UNIT_EXIT_CODE=$?

if [ $UNIT_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ Unit tests passed!${NC}"
else
  echo -e "${RED}❌ Unit tests failed!${NC}"
fi

echo -e "\n${BLUE}=== Starting Integration Tests ===${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
  exit 1
fi

# Stop any existing test-db container
echo -e "${YELLOW}🧹 Cleaning up any existing test containers...${NC}"
docker stop bun-badges-test-db > /dev/null 2>&1
docker rm bun-badges-test-db > /dev/null 2>&1

# Start the database
echo -e "${YELLOW}🐳 Starting database for integration tests...${NC}"
docker-compose -f docker-compose.test.yml up -d test-db

# Wait for database to be ready
echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
for i in {1..20}; do
  echo -e "${YELLOW}Checking database connection (attempt $i/20)...${NC}"
  if docker exec bun-badges-test-db pg_isready -U postgres -d bun_badges_test > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database ready!${NC}"
    DB_READY=true
    break
  fi
  
  if [ $i -eq 20 ]; then
    echo -e "${RED}❌ Database not ready after 20 attempts, skipping integration tests${NC}"
    docker-compose -f docker-compose.test.yml down
    exit $UNIT_EXIT_CODE
  fi
  
  sleep 2
done

# Run migrations
echo -e "${YELLOW}🔄 Running database migrations...${NC}"
DATABASE_URL=postgres://postgres:postgres@localhost:5434/bun_badges_test bun run db:migrate

# Run integration tests
echo -e "${YELLOW}🧪 Running integration tests...${NC}"
bun test:integration
INTEGRATION_EXIT_CODE=$?

if [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ Integration tests passed!${NC}"
else
  echo -e "${RED}❌ Integration tests failed!${NC}"
fi

echo -e "${YELLOW}🧹 Cleaning up test environment...${NC}"
docker-compose -f docker-compose.test.yml down

# Set exit code based on both test suites
if [ $UNIT_EXIT_CODE -eq 0 ] && [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed successfully!${NC}"
  exit 0
else
  echo -e "${RED}❌ Tests failed! Check the output above for details.${NC}"
  exit 1
fi 