#!/bin/bash
set -e

echo "=== Safely organizing Docker files ==="

# Create docker directory if it doesn't exist
mkdir -p docker

# Copy Docker documentation to docker directory
if [ -f "DOCKER.md" ]; then
  echo "Copying DOCKER.md to docker/README.md"
  cp "DOCKER.md" "docker/README.md"
  echo "Original remains in root for compatibility"
fi

# Copy Docker Compose variants to docker directory
for file in docker-compose.dev.yml docker-compose.test.yml docker-compose.light.yml; do
  if [ -f "$file" ]; then
    echo "Copying $file to docker/$file"
    cp "$file" "docker/$file"
    echo "Original remains in root for compatibility"
  fi
done

# Copy Dockerfile.dev to docker directory
if [ -f "Dockerfile.dev" ]; then
  echo "Copying Dockerfile.dev to docker/Dockerfile.dev"
  cp "Dockerfile.dev" "docker/Dockerfile.dev"
  echo "Original remains in root for compatibility"
fi

echo ""
echo "=== Docker file organization guide ==="
echo ""
echo "Docker files have been copied to the docker/ directory."
echo "The original files remain in the root directory for compatibility."
echo ""
echo "IMPORTANT RECOMMENDATIONS:"
echo ""
echo "1. DO NOT modify your package.json scripts yet."
echo "   Continue using the original files in the root directory."
echo ""
echo "2. The main Dockerfile and docker-compose.yml should always remain in the root"
echo "   for compatibility with standard Docker and CI/CD tools."
echo ""
echo "3. After future refactoring, if you want to update paths, modify like this:"
echo "   FROM: \"dev:docker\": \"docker-compose -f docker-compose.dev.yml up\","
echo "   TO:   \"dev:docker\": \"docker-compose -f docker/docker-compose.dev.yml up\","
echo ""
echo "4. ALWAYS TEST YOUR CHANGES before removing original files." 