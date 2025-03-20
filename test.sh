#!/bin/bash

echo "🧪 Running unit tests..."
bun test:unit

# Capture exit code
EXIT_CODE=$?

# Exit with the test's exit code
exit $EXIT_CODE 