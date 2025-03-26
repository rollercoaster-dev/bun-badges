#!/bin/bash
# Production startup script for bun-badges
# Usage: ./scripts/start-prod.sh

# Ensure we're in the project root directory
if [ ! -f "package.json" ]; then
  echo "Error: package.json not found. Please make sure you're running from the project root"
  exit 1
fi

# Ensure the dist directory exists
if [ ! -d "dist" ]; then
  echo "Error: dist directory not found. Please build the application first with 'bun run build'"
  exit 1
fi

# Load environment variables if .env exists
if [ -f ".env" ]; then
  echo "Loading environment variables from .env"
  export $(grep -v '^#' .env | xargs)
fi

# Set production environment variables if not already set
export NODE_ENV=production
export PORT=${PORT:-3000}
export HOST=${HOST:-0.0.0.0}
export LOG_LEVEL=${LOG_LEVEL:-info}

# Determine the script directory path
SCRIPT_DIR=$(dirname "$0")

# Determine the dist directory path (using current working directory)
DIST_PATH="./dist"

echo "Starting production server on ${HOST}:${PORT}"
echo "Environment: ${NODE_ENV}"
echo "Log level: ${LOG_LEVEL}"
echo "Using dist directory: ${DIST_PATH}"

# Run the production application directly
exec bun "${DIST_PATH}/index.js" 