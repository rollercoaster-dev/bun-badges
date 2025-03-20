#!/bin/bash

echo "🧪 Running unit tests..."
bun test:unit
UNIT_EXIT_CODE=$?

echo -e "\n🐳 Starting database for integration tests..."
docker-compose -f docker-compose.test.yml up -d test-db

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Try to connect to the database
echo "🔍 Checking database connection..."
for i in {1..5}; do
  if docker exec bun-badges-test-db pg_isready -U postgres -d bun_badges_test; then
    echo "✅ Database ready!"
    break
  fi
  
  if [ $i -eq 5 ]; then
    echo "❌ Database not ready after 5 attempts, skipping integration tests"
    docker-compose -f docker-compose.test.yml down
    exit $UNIT_EXIT_CODE
  fi
  
  echo "Attempt $i: Database not ready yet, waiting..."
  sleep 2
done

echo "🧪 Running integration tests..."
bun test:integration
INTEGRATION_EXIT_CODE=$?

echo "🧹 Cleaning up test environment..."
docker-compose -f docker-compose.test.yml down

# If either test suite failed, exit with error
if [ $UNIT_EXIT_CODE -ne 0 ] || [ $INTEGRATION_EXIT_CODE -ne 0 ]; then
  echo "❌ Tests failed!"
  exit 1
else
  echo "✅ All tests passed!"
  exit 0
fi 