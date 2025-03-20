#!/bin/bash

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${BOLD}${BLUE}=============================================${NC}"
echo -e "${BOLD}${BLUE}   Running Integration Tests with Docker     ${NC}"
echo -e "${BOLD}${BLUE}=============================================${NC}"

# Function to check if Docker is running
check_docker() {
  if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running.${NC}"
    echo -e "${YELLOW}Please start Docker and try again.${NC}"
    exit 1
  fi
}

# Function to check if a container is running
check_container_running() {
  local name=$1
  if [ "$(docker ps -q -f name=$name)" ]; then
    return 0
  else
    return 1
  fi
}

# Step 1: Check if Docker is running
echo -e "${BLUE}Checking if Docker is running...${NC}"
check_docker
echo -e "${GREEN}✓ Docker is running${NC}"

# Step 2: Start the test database
echo -e "${BLUE}Starting test database container...${NC}"
if check_container_running "bun-badges-test-db"; then
  echo -e "${YELLOW}Test database container is already running${NC}"
else
  docker-compose -f docker-compose.test.yml up -d
  
  # Wait for database to be ready
  echo -e "${BLUE}Waiting for database to be ready...${NC}"
  for i in {1..10}; do
    if docker exec bun-badges-test-db pg_isready -h localhost -U postgres; then
      echo -e "${GREEN}✓ Database is ready${NC}"
      break
    fi
    
    if [ $i -eq 10 ]; then
      echo -e "${RED}Error: Database failed to start within the time limit${NC}"
      docker-compose -f docker-compose.test.yml down
      exit 1
    fi
    
    echo -e "${YELLOW}Waiting for database... (Attempt $i/10)${NC}"
    sleep 2
  done
fi

# Step 3: Run the integration tests
echo -e "${BLUE}Running integration tests...${NC}"

# Allow specific test files to be passed as arguments
if [ $# -gt 0 ]; then
  TEST_FILES="$@"
  echo -e "${BLUE}Running specific test files: ${TEST_FILES}${NC}"
  DATABASE_URL=postgres://postgres:postgres@localhost:5434/bun_badges_test bun test --preload ./tests/setup.ts $TEST_FILES
else
  echo -e "${BLUE}Running all integration tests...${NC}"
  DATABASE_URL=postgres://postgres:postgres@localhost:5434/bun_badges_test bun test --preload ./tests/setup.ts tests/integration 'src/**/*.integration.test.ts' 'src/services/__tests__/integration/' 'src/routes/__tests__/integration/'
fi

# Get the exit code from the tests
TEST_EXIT_CODE=$?

# Print summary
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✓ All integration tests passed!${NC}"
else
  echo -e "${RED}${BOLD}✗ Some integration tests failed${NC}"
fi

# Step 4: Offer to shut down the database container
read -p "Do you want to shut down the test database container? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${BLUE}Shutting down test database container...${NC}"
  docker-compose -f docker-compose.test.yml down
  echo -e "${GREEN}✓ Test database container shut down${NC}"
else
  echo -e "${YELLOW}Test database container left running${NC}"
fi

# Return the test exit code
exit $TEST_EXIT_CODE