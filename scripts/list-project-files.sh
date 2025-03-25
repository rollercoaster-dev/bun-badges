#!/bin/bash
set -e

echo "=== Bun Badges Project File Analysis ==="
echo ""

# Count files in root directory 
ROOT_FILES=$(find . -maxdepth 1 -type f | wc -l | tr -d ' ')
ROOT_DIRS=$(find . -maxdepth 1 -type d | grep -v "^\.$" | wc -l | tr -d ' ')

echo "Root Directory Contains: $ROOT_FILES files and $ROOT_DIRS directories"
echo ""

# Display categorized files

echo "=== Configuration Files ==="
echo "These files configure TypeScript, ESLint, etc.:"
find . -maxdepth 1 -type f -name "*.json" -o -name "*.js" -o -name "*.ts" | grep -v "test-" | sort

echo ""
echo "=== Docker Files ==="
echo "Docker and container configuration:"
find . -maxdepth 1 -type f -name "Dockerfile*" -o -name "docker-compose*" | sort

echo ""
echo "=== Environment Files ==="
echo "Environment configuration files:"
find . -maxdepth 1 -type f -name ".env*" | sort

echo ""
echo "=== Documentation ==="
echo "Project documentation files:"
find . -maxdepth 1 -type f -name "*.md" | sort

echo ""
echo "=== Test Files ==="
echo "Test-related files in root (should be moved to tests/):"
find . -maxdepth 1 -type f -name "test-*" | sort

echo ""
echo "=== Script Files ==="
echo "Scripts in root directory:"
find . -maxdepth 1 -type f -name "*.sh" | sort

echo ""
echo "=== Directories ==="
echo "Subdirectories:"
find . -maxdepth 1 -type d | grep -v "^\.$" | sort

echo ""
echo "=== Recommendation ==="
echo "Review the files in the root directory and consider using the following:"
echo "1. ./scripts/safe-organize-project.sh - Safely organize test files and documentation"
echo "2. ./scripts/organize-docker-files.sh - Create a docker/ directory with copies of Docker files" 