#!/bin/bash
# CI Test Setup Script
# This script prepares and cleans up the CI test environment

set -e # Exit on error

# Display header
echo "============================="
echo "CI Test Environment Setup"
echo "============================="

# Read environment variables with defaults
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-bun_badges_test}
TEST_JWT_SECRET=${TEST_JWT_SECRET:-test-jwt-secret-for-ci-tests}

# Clean up environment
cleanup() {
  echo "🧹 Cleaning up test environment..."
  
  # Remove any stale containers
  if command -v docker &> /dev/null; then
    # Check if docker compose or docker-compose exists
    if docker compose version &> /dev/null; then
      docker compose -f docker-compose.test.yml down --volumes --remove-orphans 2>/dev/null || true
    elif docker-compose --version &> /dev/null; then
      docker-compose -f docker-compose.test.yml down --volumes --remove-orphans 2>/dev/null || true
    else
      echo "⚠️ Docker Compose not available, skipping container cleanup"
    fi
  else
    echo "⚠️ Docker not available, skipping container cleanup"
  fi
  
  # Remove any test artifacts
  echo "🗑️ Removing test artifacts..."
  rm -rf ./test-results/* 2>/dev/null || true
  rm -rf ./coverage/* 2>/dev/null || true
  
  # Reset environment files
  echo "🔄 Resetting environment files..."
  if [ -f .env.ci ]; then
    echo "✅ Found existing .env.ci file"
  else
    echo "⚠️ No .env.ci file found, creating one with current environment settings"
  fi
  
  # Always create a fresh .env.ci with current settings
  cat > .env.ci << EOF
# CI Environment Setup
NODE_ENV=test
CI=true
FORCE_MOCK_DB=${FORCE_MOCK_DB:-true}
SKIP_DOCKER=${SKIP_DOCKER:-true}
DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}
JWT_SECRET=${TEST_JWT_SECRET}
AUTH_TOKEN_EXPIRY=1d
LOG_LEVEL=${LOG_LEVEL:-error}
EOF
  
  cp .env.ci .env
  echo "✅ Environment files updated"
  
  # Export DATABASE_URL for subprocesses
  export DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  echo "✅ Set DATABASE_URL: postgres://${DB_USER}:****@${DB_HOST}:${DB_PORT}/${DB_NAME}"
}

# Setup test environment
setup() {
  # Ensure test directories exist
  echo "📁 Creating test directories..."
  mkdir -p ./test-results
  mkdir -p ./coverage
  
  # Check for Docker
  if command -v docker &> /dev/null; then
    echo "🐳 Docker is available"
    
    # Start test database if not using mock
    if [ "$FORCE_MOCK_DB" != "true" ] && [ "$SKIP_DOCKER" != "true" ]; then
      echo "🔄 Setting up test database..."
      
      # Update Docker environment variables dynamically
      export DB_USER
      export DB_PASSWORD
      export DB_NAME
      
      # Check if docker compose or docker-compose exists
      if docker compose version &> /dev/null; then
        docker compose -f docker-compose.test.yml up -d db_test
      elif docker-compose --version &> /dev/null; then
        docker-compose -f docker-compose.test.yml up -d db_test
      else
        echo "⚠️ Docker Compose not available, using mock database"
        export FORCE_MOCK_DB=true
      fi
      
      # Wait for database to be ready
      echo "⏳ Waiting for database to be ready..."
      for i in {1..20}; do
        if docker compose exec -T db_test pg_isready -U "$DB_USER" &> /dev/null || docker-compose exec -T db_test pg_isready -U "$DB_USER" &> /dev/null; then
          echo "✅ Database is ready"
          break
        fi
        
        if [ $i -eq 20 ]; then
          echo "⚠️ Database not ready after max attempts, using mock database"
          export FORCE_MOCK_DB=true
          break
        fi
        
        echo "Attempt $i/20: Waiting for database..."
        sleep 1
      done
      
      # Run migrations if database is ready
      if [ "$FORCE_MOCK_DB" != "true" ]; then
        echo "🔄 Running migrations..."
        bun run db:migrate || {
          echo "⚠️ Failed to run migrations, using mock database"
          export FORCE_MOCK_DB=true
        }
      fi
    else
      echo "⚠️ Using mock database (FORCE_MOCK_DB=$FORCE_MOCK_DB, SKIP_DOCKER=$SKIP_DOCKER)"
    fi
  else
    echo "⚠️ Docker not available, using mock database"
    export FORCE_MOCK_DB=true
  fi
}

# Main execution
main() {
  # Run cleanup first
  cleanup
  
  # Then setup
  setup
  
  echo "============================="
  echo "✅ CI Test Environment Ready"
  echo "✅ Database: postgres://${DB_USER}:****@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  echo "============================="
}

# Register trap for cleanup on exit (if running interactively)
if [[ $- == *i* ]]; then
  trap cleanup EXIT
fi

# Run main function
main 