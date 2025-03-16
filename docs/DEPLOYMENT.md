# Deployment Guide

This document provides detailed instructions for deploying the Bun Badges server in both development and production environments using Docker.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Development Deployment](#development-deployment)
- [Production Deployment](#production-deployment)
- [Environment Variables](#environment-variables)
- [Scaling](#scaling)
- [Backup and Restore](#backup-and-restore)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- Docker Engine (20.10.0+)
- Docker Compose (2.0.0+)
- Git

## Configuration

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/bun-badges.git
   cd bun-badges
   ```

2. Create an environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file with your preferred configuration:
   - Update database credentials
   - Set JWT secret key
   - Configure ports if needed

## Development Deployment

For local development with hot-reloading:

```bash
# Start the development environment
docker-compose -f docker-compose.dev.yml up -d

# Check container status
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose -f docker-compose.dev.yml logs -f api

# Stop and remove containers
docker-compose -f docker-compose.dev.yml down
```

The development server will be available at http://localhost:7777 (or your configured PORT).

## Production Deployment

For production deployment:

```bash
# Build and start the containers
docker-compose up -d

# Check container status
docker-compose ps

# View logs
docker-compose logs -f api

# Stop and remove containers
docker-compose down
```

The production server will be available at http://localhost:7777 (or your configured PORT).

### Deployment Checks

After deployment, verify:

1. Health endpoint is accessible: `curl http://localhost:7777/health`
2. Database connection is working
3. API endpoints respond as expected

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `7777` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `DB_HOST` | Database host | `localhost` | Yes |
| `DB_PORT` | Database port | `5432` | No |
| `DB_NAME` | Database name | `badges` | Yes |
| `DB_USER` | Database username | `badges_user` | Yes |
| `DB_PASSWORD` | Database password | `badges_password` | Yes |
| `DATABASE_URL` | Full database connection string | Constructed from above | No |
| `JWT_SECRET` | Secret key for JWT tokens | `your-secret-key` | Yes (change in production) |
| `JWT_EXPIRY` | JWT token expiration | `15m` | No |
| `REFRESH_TOKEN_EXPIRY` | Refresh token expiration | `7d` | No |

## Scaling

For horizontal scaling in production:

1. Use a load balancer in front of multiple API containers
2. Ensure database is configured for higher loads
3. Consider using a managed PostgreSQL service for production

Example `docker-compose.scale.yml`:

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    deploy:
      replicas: 3
    # ... rest of configuration
```

## Backup and Restore

### Database Backup

```bash
# Backup PostgreSQL database
docker exec bun-badges-db pg_dump -U badges_user badges > backup.sql

# Restore from backup
cat backup.sql | docker exec -i bun-badges-db psql -U badges_user badges
```

## Troubleshooting

### Common Issues

1. **Container fails to start**
   - Check logs: `docker-compose logs api`
   - Verify environment variables
   - Ensure PostgreSQL is running

2. **Database connection issues**
   - Check if PostgreSQL container is healthy
   - Verify database credentials
   - Test connection: `docker exec bun-badges-db pg_isready -U badges_user -d badges`

3. **API returns 500 errors**
   - Check application logs
   - Verify database migrations have run

### Getting Help

If you encounter issues not covered here, please:
1. Check existing GitHub issues
2. Open a new issue with relevant logs and details 