# Docker Configuration Guide

This document explains the Docker configuration for the Bun Badges server, including the structure of Dockerfiles and docker-compose files.

## Docker Files Overview

The project includes the following Docker-related files:

- `Dockerfile` - Production container configuration with multi-stage build
- `Dockerfile.dev` - Development container configuration with hot reloading and native module support
- `docker-compose.yml` - Production deployment configuration
- `docker-compose.dev.yml` - Development deployment configuration
- `docker-compose.test.yml` - Test environment configuration
- `.dockerignore` - Files excluded from Docker context

## Dockerfile Structure

### Production Dockerfile

The production Dockerfile uses a multi-stage build approach with Alpine Linux for a minimal footprint:

```dockerfile
FROM oven/bun:1.0-alpine as base
WORKDIR /app

# Install needed system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl \
    ca-certificates \
    curl

# Stage for installing dependencies
FROM base as install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --production=false

# Final build stage
FROM base as final
COPY --from=install /temp/dev/node_modules ./node_modules
COPY . .
CMD ["bun", "run", "src/index.ts"]
```

Key stages:
1. **Base** - Sets up the Bun runtime with Alpine Linux and system dependencies
2. **Install** - Handles dependency installation with production flag
3. **Final** - Creates the runtime environment with minimal layers

### Development Dockerfile

The development Dockerfile is optimized for native modules and development tools:

```dockerfile
# Start with the Node 18 image which has better support for native modules
FROM node:18-bullseye

WORKDIR /app

# Install Python and other dependencies needed for Canvas
RUN apt-get update && apt-get install -y \
    python3 \
    python-is-python3 \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    pkg-config \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Install canvas globally first to help with dependency resolution
RUN npm install -g canvas@2.11.2

# Copy package.json and install dependencies
COPY package.json ./

# Pin canvas to a specific version
RUN sed -i 's/"canvas": "^3.1.0"/"canvas": "2.11.2"/g' package.json

# Install dependencies
RUN bun install --no-cache

# Copy the rest of the application code
COPY . .

# Set development environment
ENV NODE_ENV=development
ENV PORT=7777
ENV DOCKER_CONTAINER=true

# Expose the port the app will run on
EXPOSE 7777

# Start the app with hot reloading
CMD ["bun", "run", "dev"]
```

## Docker Compose Configuration

### Test Environment

The `docker-compose.test.yml` file provides a complete test environment:

```yaml
version: '3.8'

services:
  # Test database service
  db_test:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: bun_badges_test
      POSTGRES_INITDB_ARGS: "--nosync"
      PGDATA: /var/lib/postgresql/data/pgdata
    command: postgres -c fsync=off -c synchronous_commit=off -c full_page_writes=off -c random_page_cost=1.0
    ports:
      - "5434:5432"
    volumes:
      - postgres_test_data:/var/lib/postgresql/data
      - ./scripts/init-test-db.sql:/docker-entrypoint-initdb.d/init-test-db.sql
      - ./scripts/test-db:/docker-entrypoint-initdb.d/schema
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Test runner service
  test_runner:
    build:
      context: .
      dockerfile: Dockerfile.dev
    environment:
      - NODE_ENV=test
      - E2E_TEST=true
      - DATABASE_URL=postgres://postgres:postgres@db_test:5432/bun_badges_test
      - JWT_SECRET=test-jwt-secret-for-e2e-tests
    volumes:
      - .:/app
      - node_modules:/app/node_modules
      - ./test-results:/app/test-results
    command: ["sh", "-c", "bun install && bun run db:migrate && bun test"]
```

## CI/CD Pipeline

The project uses GitHub Actions for automated container builds and publishing:

1. **Test Stage**:
   - Runs all tests in isolated containers
   - Uses `docker-compose.test.yml`
   - Ensures database migrations work

2. **Security Scan**:
   - Hadolint for Dockerfile best practices
   - Trivy for vulnerability scanning
   - Results uploaded to GitHub Security

3. **Build and Push**:
   - Multi-platform builds (amd64, arm64)
   - Automated versioning
   - GitHub Container Registry publishing

## Best Practices

1. **Container Security**:
   - Regular security scanning
   - Minimal base images
   - Proper permission management

2. **Build Optimization**:
   - Multi-stage builds
   - Layer caching
   - Platform-specific optimizations

3. **Development Workflow**:
   - Hot reloading support
   - Native module compatibility
   - Consistent environments

4. **Testing Strategy**:
   - Isolated test environments
   - Database optimizations for tests
   - Comprehensive E2E testing

5. **CI/CD Integration**:
   - Automated builds and tests
   - Security scanning
   - Multi-platform support

## Environment Variables

Key environment variables for different environments:

### Production
- `NODE_ENV`: Set to 'production'
- `PORT`: Application port (default: 7777)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing key

### Development
- `NODE_ENV`: Set to 'development'
- `DOCKER_CONTAINER`: Set to 'true'
- `PORT`: Application port (default: 7777)

### Test
- `NODE_ENV`: Set to 'test'
- `E2E_TEST`: Set to 'true' for E2E tests
- `DATABASE_URL`: Test database connection
- `JWT_SECRET`: Test JWT signing key

## Customizing the Configuration

1. **Platform Support**:
   - Add/remove platforms in GitHub Actions
   - Modify base images for specific needs

2. **Development Tools**:
   - Add development dependencies
   - Configure hot reloading
   - Set up debugging tools

3. **Test Environment**:
   - Customize test database settings
   - Add test-specific services
   - Configure test runners

4. **Security Settings**:
   - Adjust security scan thresholds
   - Configure vulnerability reporting
   - Set up additional scanners 