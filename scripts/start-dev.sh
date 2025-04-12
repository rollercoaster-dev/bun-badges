#!/bin/bash
# Development startup script for bun-badges
# Usage: ./scripts/start-dev.sh

# Ensure we're in the project root directory
if [ ! -f "package.json" ]; then
  echo "Error: package.json not found. Please make sure you mount your project to /app"
  exit 1
fi

# Load environment variables if .env exists
if [ -f ".env" ]; then
  echo "Loading environment variables from .env"
  export $(grep -v '^#' .env | xargs)
fi

# Always install dependencies to ensure all packages are available
echo "Installing dependencies..."
bun install

# Run database initialization
echo "Initializing database..."
bun run scripts/db-init.ts --env=development

# Set development environment variables if not already set
export NODE_ENV=${NODE_ENV:-development}
# PORT should be set by docker-compose
export HOST=${HOST:-0.0.0.0}
export LOG_LEVEL=${LOG_LEVEL:-debug}

# Ensure PORT is set
if [ -z "$PORT" ]; then
  echo "ERROR: PORT environment variable is not set"
  exit 1
fi

echo "Starting development server on ${HOST}:${PORT}"
echo "Environment: ${NODE_ENV}"
echo "Log level: ${LOG_LEVEL}"

# Determine the location of the preload script based on how this script is called
# Check multiple possible locations for the preload script (local and Docker paths)
SCRIPT_DIR=$(dirname "$0")
POSSIBLE_PATHS=(
  "${SCRIPT_DIR}/preload-global-bitset.js"  # Local path when run as ./scripts/start-dev.sh
  "/usr/local/bin/preload-global-bitset.js" # Docker path when installed in /usr/local/bin
  "/docker-scripts/preload-global-bitset.js" # New Docker path in the script directory
)

# Find the first valid preload script path
PRELOAD_SCRIPT=""
for path in "${POSSIBLE_PATHS[@]}"; do
  if [ -f "$path" ]; then
    PRELOAD_SCRIPT="$path"
    break
  fi
done

# Make sure the preload script exists
if [ -z "$PRELOAD_SCRIPT" ]; then
  echo "Warning: BitSet preload script not found in any of the expected locations"
  echo "Falling back to default behavior without preload"
  # Start the development server directly
  exec bun --watch src/index.ts
else
  echo "Using BitSet preload script: $PRELOAD_SCRIPT"
  # Start with preload script
  exec bun --preload "$PRELOAD_SCRIPT" --watch src/index.ts
fi