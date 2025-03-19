#!/bin/bash

# Run tests in Docker containers
echo "Starting Docker containers for tests..."
docker-compose -f docker-compose.test.yml up -d test-db

# Wait for database to be ready
echo "Waiting for test database to be ready..."
sleep 5

# Run migrations
echo "Running database migrations..."
docker-compose -f docker-compose.test.yml run --rm test-runner bun run db:migrate

# Run tests
echo "Running tests..."
docker-compose -f docker-compose.test.yml run --rm test-runner bun test --preload ./src/utils/test/setup.ts

# Cleanup
echo "Cleaning up Docker containers..."
docker-compose -f docker-compose.test.yml down
