#!/bin/bash
# Script to run tests with proper environment configuration

set -e  # Exit immediately if a command exits with a non-zero status

# Determine running environment
if [ "$CI" = "true" ]; then
  echo "📦 Running tests in CI environment"
  
  # Use CI-specific configuration
  export SKIP_DOCKER=true
  export NODE_ENV=test
  
  # Disable TTY output for CI
  export BUN_DISABLE_TTY=true
  
  # Load environment variables from .env.ci if it exists
  if [ -f ".env.ci" ]; then
    echo "📋 Loading CI environment variables from .env.ci"
    export $(grep -v '^#' .env.ci | xargs)
  else
    echo "⚠️ .env.ci not found, using default environment variables"
  fi
else
  echo "💻 Running tests in local environment"
  
  # Use Docker for local testing by default, unless explicitly disabled
  if [ "$SKIP_DOCKER" != "true" ]; then
    export SKIP_DOCKER=false
  fi
  
  export NODE_ENV=test
  
  # Load environment variables from .env.test if it exists
  if [ -f ".env.test" ]; then
    echo "📋 Loading test environment variables from .env.test"
    export $(grep -v '^#' .env.test | xargs)
  else
    echo "⚠️ .env.test not found, using default environment variables"
  fi
fi

echo "📊 Test Configuration:"
echo "  NODE_ENV: $NODE_ENV"
echo "  SKIP_DOCKER: $SKIP_DOCKER"
echo "  DATABASE_URL: ${DATABASE_URL//:.*@/:*****@}"
echo "  LOG_LEVEL: $LOG_LEVEL"

# Determine test type
TEST_TYPE="${1:-all}"
echo "🧪 Running tests: $TEST_TYPE"

# Run the appropriate tests
case "$TEST_TYPE" in
  "unit")
    echo "▶️ Running unit tests..."
    bun test tests/unit
    ;;
  "integration")
    echo "▶️ Running integration tests..."
    export INTEGRATION_TEST=true
    bun test tests/integration
    ;;
  "e2e")
    echo "▶️ Running end-to-end tests..."
    export E2E_TEST=true
    bun test tests/e2e
    ;;
  "database")
    echo "▶️ Running database connection tests..."
    export INTEGRATION_TEST=true
    bun test tests/integration/controllers/issuer/integration/db-test.integration.test.ts
    ;;
  "all")
    echo "▶️ Running all tests..."
    bun test
    ;;
  *)
    echo "⚠️ Unknown test type: $TEST_TYPE"
    echo "Usage: $0 [unit|integration|e2e|database|all]"
    exit 1
    ;;
esac

echo "✅ Tests completed" 