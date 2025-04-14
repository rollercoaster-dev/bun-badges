# BE-02: Docker Configuration Improvements

## Description
Enhance our Docker configuration based on lessons learned from Badge Engine while implementing significant improvements for better performance, security, and developer experience.

## Tasks
- [ ] Create a multi-stage Dockerfile optimized for Bun
- [ ] Implement proper layer caching for faster builds
- [ ] Add security enhancements (non-root user, proper permissions)
- [ ] Create a comprehensive docker-compose.yml for local development
- [ ] Configure volume mounts for efficient development workflow
- [ ] Add health checks for all services
- [ ] Create separate production-ready Docker configurations
- [ ] Document Docker setup and usage

## Implementation Details

### Multi-stage Dockerfile
Create a Dockerfile with separate build and runtime stages:
```dockerfile
# Build stage
FROM oven/bun:latest as builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Runtime stage
FROM oven/bun:latest
WORKDIR /app
COPY --from=builder /app/package.json /app/bun.lockb ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 3000
CMD ["bun", "start"]
```

### Docker Compose
Create a docker-compose.yml with all necessary services:
```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/badges
    depends_on:
      - db
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:14-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=badges
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

## Benefits
- Smaller, more efficient Docker images
- Better security through non-root execution
- Faster builds with proper caching
- Improved developer experience
- Consistent environment across development and production
- Better resource management

## References
- Badge Engine's Dockerfile: `../badge-engine/Dockerfile`
- Docker best practices: https://docs.docker.com/develop/develop-images/dockerfile_best-practices/
- Bun Docker documentation: https://bun.sh/guides/ecosystem/docker
