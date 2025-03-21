#!/bin/bash

# E2E Test Runner Script
#
# This script runs E2E tests by:
# 1. Starting a PostgreSQL container for testing
# 2. Running database migrations
# 3. Running the specified E2E tests with either Bun or Vitest
# 4. Cleaning up after tests complete

set -e

# Configuration
TEST_DB_NAME="bun_badges_test"
TEST_DB_USER="postgres"
TEST_DB_PASSWORD="postgres"
TEST_DB_PORT="5434"
TEST_DB_HOST="localhost"
TEST_DB_URL="postgres://${TEST_DB_USER}:${TEST_DB_PASSWORD}@${TEST_DB_HOST}:${TEST_DB_PORT}/${TEST_DB_NAME}"
CONTAINER_NAME="bun-badges-test-db"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print messages
print_message() {
  echo -e "${BLUE}[E2E Test Runner]${NC} $1"
}

# Function to print errors
print_error() {
  echo -e "${RED}[E2E Test Error]${NC} $1"
}

# Function to print success messages
print_success() {
  echo -e "${GREEN}[E2E Test Success]${NC} $1"
}

# Function to print warnings
print_warning() {
  echo -e "${YELLOW}[E2E Test Warning]${NC} $1"
}

# Check for docker-compose command
if ! command -v docker-compose &> /dev/null; then
  print_error "docker-compose could not be found. Please install Docker Compose."
  exit 1
fi

# Default runner
RUNNER="vitest"
# Test file filter (default to all tests)
TEST_FILES=""

# Process arguments
if [ $# -gt 0 ]; then
  RUNNER=$1
  shift
  
  # Process test file parameter if provided
  if [ $# -gt 0 ]; then
    TEST_FILES=$@
  fi
fi

# Help text
if [ "$RUNNER" == "--help" ] || [ "$RUNNER" == "-h" ]; then
  echo "Usage: ./test-e2e.sh [runner] [test_file_paths...]"
  echo ""
  echo "Options:"
  echo "  runner           Test runner to use (vitest or bun)"
  echo "  test_file_paths  Optional test file paths to run specific tests"
  echo ""
  echo "Examples:"
  echo "  ./test-e2e.sh vitest                          # Run all E2E tests with Vitest"
  echo "  ./test-e2e.sh vitest src/tests/e2e/auth.spec.ts  # Run specific test file with Vitest"
  echo "  ./test-e2e.sh bun src/tests/e2e/              # Run all tests in directory with Bun"
  echo ""
  exit 0
fi

# Use Docker mode?
USE_DOCKER=true
if [ "$USE_DOCKER" = true ]; then
  print_message "Starting E2E tests in Docker environment..."
  
  # Check if the database is already running
  if docker-compose -f docker-compose.test.yml ps | grep -q "db_test.*Up"; then
    print_warning "Test database is already running. Using existing container."
  else
    print_message "Starting test database..."
    docker-compose -f docker-compose.test.yml up -d db_test
    
    # Wait for the database to be ready
    print_message "Waiting for test database to be ready..."
    timeout=30
    until docker-compose -f docker-compose.test.yml exec db_test pg_isready -U postgres || [ $timeout -le 0 ]; do
      echo -n "."
      sleep 1
      ((timeout--))
    done
    
    if [ $timeout -le 0 ]; then
      print_error "Database failed to start within the timeout period."
      docker-compose -f docker-compose.test.yml logs db_test
      docker-compose -f docker-compose.test.yml down
      exit 1
    fi
    
    print_success "Test database is ready."
  fi
  
  # Run database migrations
  print_message "Running database migrations..."
  docker-compose -f docker-compose.test.yml run --rm test_runner bun run db:migrate
  
  # Run the tests
  if [ -z "$TEST_FILES" ]; then
    print_message "Running all E2E tests with $RUNNER..."
    docker-compose -f docker-compose.test.yml run --rm test_runner bun "test:e2e:$RUNNER"
  else
    print_message "Running specific E2E tests with $RUNNER: $TEST_FILES"
    docker-compose -f docker-compose.test.yml run --rm test_runner bun "test:e2e:$RUNNER" $TEST_FILES
  fi
  
  # Capture the exit code
  EXIT_CODE=$?
  
  # Clean up if needed
  if [ "$1" = "--cleanup" ]; then
    print_message "Cleaning up test environment..."
    docker-compose -f docker-compose.test.yml down
  fi
  
  # Return the exit code from the tests
  if [ $EXIT_CODE -eq 0 ]; then
    print_success "E2E tests completed successfully!"
  else
    print_error "E2E tests failed with exit code $EXIT_CODE"
  fi
  
  exit $EXIT_CODE
else
  # Local mode
  print_message "Starting E2E tests in local environment..."
  
  # Set environment variables
  export NODE_ENV=test
  export E2E_TEST=true
  
  # Run the tests based on the provided runner
  if [ "$RUNNER" = "vitest" ]; then
    if [ -z "$TEST_FILES" ]; then
      print_message "Running all E2E tests with Vitest..."
      vitest run
    else
      print_message "Running specific E2E tests with Vitest: $TEST_FILES"
      vitest run $TEST_FILES
    fi
  elif [ "$RUNNER" = "bun" ]; then
    if [ -z "$TEST_FILES" ]; then
      print_message "Running all E2E tests with Bun..."
      bun test --preload ./tests/setup.ts
    else
      print_message "Running specific E2E tests with Bun: $TEST_FILES"
      bun test --preload ./tests/setup.ts $TEST_FILES
    fi
  else
    print_error "Unknown test runner: $RUNNER"
    exit 1
  fi
fi 