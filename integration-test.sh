#!/bin/bash

echo "🐳 Starting test database..."
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
    echo "❌ Database not ready after 5 attempts, aborting"
    docker-compose -f docker-compose.test.yml down
    exit 1
  fi
  
  echo "Attempt $i: Database not ready yet, waiting..."
  sleep 2
done

# Run migrations if needed (uncomment if you need this)
# echo "🔄 Running database migrations..."
# bun run db:migrate

echo "🧪 Running integration tests..."
bun test:integration

# Capture exit code
EXIT_CODE=$?

echo "🧹 Cleaning up test environment..."
docker-compose -f docker-compose.test.yml down

# Exit with the test's exit code
exit $EXIT_CODE 