# Docker Configuration Guide

This document explains the Docker configuration for the Bun Badges server, including the structure of Dockerfiles and docker-compose files.

## Docker Files Overview

The project includes the following Docker-related files:

- `Dockerfile` - Production container configuration with multi-stage build
- `Dockerfile.dev` - Development container configuration with hot reloading
- `docker-compose.yml` - Production deployment configuration
- `docker-compose.dev.yml` - Development deployment configuration
- `.dockerignore` - Files excluded from Docker context

## Dockerfile Structure

### Production Dockerfile

The production Dockerfile uses a multi-stage build approach to optimize the final image size and build caching:

```dockerfile
# Use the official Bun image
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies stage - improves caching
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock* ./temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Development dependencies - needed for builds
RUN mkdir -p /temp/prod
COPY package.json bun.lock* ./temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Build stage - compile with all development dependencies
FROM base AS build
COPY --from=install /temp/dev/node_modules ./node_modules
COPY . .
RUN bun run build

# Production stage - only include what's needed to run
FROM base AS release
COPY --from=install /temp/prod/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY package.json .

# Set production environment
ENV NODE_ENV=production
ENV PORT=7777

# Expose the port the app will run on
EXPOSE 7777

# Run migrations and start the application
CMD bun run db:migrate && bun run start
```

Key stages:
1. **Base** - Sets up the Bun runtime
2. **Install** - Separate stages for dev and prod dependencies to optimize caching
3. **Build** - Builds the application with development dependencies
4. **Release** - Final stage with only production dependencies and build artifacts

### Development Dockerfile

The development Dockerfile is simpler, designed for hot reloading during development:

```dockerfile
# Use the official Bun image
FROM oven/bun:1

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json bun.lock* ./
RUN bun install

# Copy the rest of the application code
COPY . .

# Set development environment
ENV NODE_ENV=development
ENV PORT=7777

# Expose the port the app will run on
EXPOSE 7777

# Start the app with hot reloading
CMD ["bun", "run", "dev"]
```

## Docker Compose Configuration

### Production

The `docker-compose.yml` file defines:

1. **API Service**:
   - Built from the production Dockerfile
   - Connects to the PostgreSQL database
   - Configures environment variables
   - Sets up health checks
   - Maps ports

2. **Database Service**:
   - Uses PostgreSQL 15
   - Configures credentials via environment variables
   - Persists data via named volume
   - Sets up health checks

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: bun-badges-api
    restart: unless-stopped
    depends_on:
      - db
    environment:
      NODE_ENV: production
      PORT: 7777
      DATABASE_URL: postgres://${POSTGRES_USER:-badges_user}:${POSTGRES_PASSWORD:-badges_password}@db:5432/${POSTGRES_DB:-badges}
      JWT_SECRET: ${JWT_SECRET:-your-secret-key}
      JWT_EXPIRY: ${JWT_EXPIRY:-15m}
      REFRESH_TOKEN_EXPIRY: ${REFRESH_TOKEN_EXPIRY:-7d}
    ports:
      - "${PORT:-7777}:7777"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7777/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    volumes:
      - ./dist:/app/dist
      - ./drizzle:/app/drizzle
    networks:
      - bun-badges-network

  db:
    image: postgres:15
    container_name: bun-badges-db
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-badges}
      POSTGRES_USER: ${POSTGRES_USER:-badges_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-badges_password}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-badges_user} -d ${POSTGRES_DB:-badges}"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - bun-badges-network

volumes:
  postgres_data:

networks:
  bun-badges-network:
    driver: bridge
```

### Development

The `docker-compose.dev.yml` file is similar but configured for development:

- Uses development Dockerfile
- Mounts the source code directory for hot reloading
- Uses a separate database volume
- Sets NODE_ENV to development

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: bun-badges-api-dev
    restart: unless-stopped
    depends_on:
      - db
    environment:
      NODE_ENV: development
      PORT: 7777
      DATABASE_URL: postgres://${POSTGRES_USER:-badges_user}:${POSTGRES_PASSWORD:-badges_password}@db:5432/${POSTGRES_DB:-badges}
      JWT_SECRET: ${JWT_SECRET:-your-secret-key}
      JWT_EXPIRY: ${JWT_EXPIRY:-15m}
      REFRESH_TOKEN_EXPIRY: ${REFRESH_TOKEN_EXPIRY:-7d}
    ports:
      - "${PORT:-7777}:7777"
    volumes:
      - .:/app
      - /app/node_modules
    command: bun run dev
    networks:
      - bun-badges-network-dev

  db:
    image: postgres:15
    container_name: bun-badges-db-dev
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-badges}
      POSTGRES_USER: ${POSTGRES_USER:-badges_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-badges_password}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data_dev:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-badges_user} -d ${POSTGRES_DB:-badges}"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - bun-badges-network-dev

volumes:
  postgres_data_dev:

networks:
  bun-badges-network-dev:
    driver: bridge
```

## .dockerignore

The `.dockerignore` file excludes unnecessary files from the Docker build context to reduce build time and image size:

```
# Node modules and logs
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.*
!.env.example

# Editors and OS
.idea
.vscode
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Docker files
Dockerfile*
docker-compose*
.dockerignore

# Git files
.git
.gitignore

# Documentation
README.md
LICENSE
docs/

# Build directories
dist/
build/
coverage/

# Temporary files
.tmp/
temp/

# Research and examples
research/
examples/

# Cursor workspace
.cursor/
```

## Best Practices

1. **Environment Variables**:
   - Never hardcode sensitive values
   - Use environment variables with sensible defaults
   - Document all required environment variables

2. **Security**:
   - Run containers as non-root when possible
   - Use health checks for service availability monitoring
   - Keep base images updated

3. **Performance**:
   - Use multi-stage builds to reduce image size
   - Leverage build caching with proper layer ordering
   - Minimize the number of RUN commands

4. **Development Workflow**:
   - Use volume mounts for hot reloading during development
   - Keep development and production configurations separate

5. **Database**:
   - Use named volumes for database persistence
   - Set up proper health checks for database availability
   - Include backup procedures

## Customizing the Configuration

To customize the Docker configuration:

1. **Change ports**: Update the `PORT` environment variable in `.env` file
2. **Modify resources**: Add resource limits to services (memory, CPU)
3. **Add services**: Extend docker-compose files with additional services (Redis, etc.)
4. **Custom networks**: Configure network settings for specific requirements 