#!/bin/sh

# run-e2e.sh: A script to run all or a specific end-to-end (E2E) test.
#
# Usage:
#   ./run-e2e.sh           -> Runs all E2E tests
#   ./run-e2e.sh <testfile> -> Runs the specified E2E test file(s)
#
# The script supports both Docker mode (DOCKER_MODE=true) and local mode.

DOCKER_MODE=${DOCKER_MODE:-false}

if [ "$DOCKER_MODE" = "true" ]; then
    echo "Running E2E tests in Docker mode..."
    if [ "$#" -eq 0 ]; then
        # Run all tests in Docker mode
        docker-compose -f docker-compose.test.yml run --rm test_runner
    else
        # Run specific test file(s) in Docker mode
        docker-compose -f docker-compose.test.yml run --rm test_runner bun test --preload ./tests/setup.ts "$@"
    fi
else
    echo "Running E2E tests in local mode..."
    # Set environment variables for local testing
    export NODE_ENV=test
    export E2E_TEST=true
    export DATABASE_URL=${DATABASE_URL:-"postgres://postgres:postgres@localhost:5434/bun_badges_test"}

    if [ "$#" -eq 0 ]; then
        echo "Running all E2E tests..."
        bun test --preload ./tests/setup.ts
    else
        echo "Running E2E test file(s): $@"
        bun test --preload ./tests/setup.ts "$@"
    fi
fi 