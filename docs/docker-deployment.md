# Docker Deployment Guide

This guide provides detailed instructions for deploying Bun Badges using Docker.

## Quick Start

The fastest way to get started is using Docker Compose:

```bash
# Copy the example file
cp docker-compose.example.yml docker-compose.yml

# Start the services
docker-compose up -d
```

## Deployment Architecture

The Docker deployment consists of two main components:

```
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│   Bun Badges    │     │   PostgreSQL    │
│                 │     │                 │
│   API Server    │────▶│   Database      │
│   Port: 3000    │     │   Port: 5432    │
│                 │     │                 │
└─────────────────┘     └─────────────────┘
        ^                        ^
        │                        │
        └─ Container: app        └─ Container: db
           Image: bun-badges        Image: postgres:15-alpine
```

## Configuration Options

### Environment Variables

The Bun Badges container can be configured with the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | The port the server listens on | `3000` |
| `NODE_ENV` | Environment (production, development) | `production` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |
| `HOST` | Host to bind to | `0.0.0.0` |
| `JWT_SECRET` | Secret for JWT token signing | Required for auth |
| `JWT_EXPIRY` | JWT token expiry | `15m` |

### Customizing PostgreSQL

The PostgreSQL container can be configured with:

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | Database username | `postgres` |
| `POSTGRES_PASSWORD` | Database password | `postgres` |
| `POSTGRES_DB` | Database name | `bun_badges` |

## Using an External Database

If you prefer to use an external managed PostgreSQL database:

1. Remove the `db` service from the docker-compose.yml
2. Update the `DATABASE_URL` to point to your external database:

```yaml
services:
  app:
    # ... other settings ...
    environment:
      - DATABASE_URL=postgres://username:password@your-database-host:5432/your-database
```

## Production Best Practices

For production deployments, consider:

1. **Security**:
   - Never use the default database credentials
   - Set strong passwords
   - Restrict database access to only the application
   - Consider using environment variables from a secure vault

2. **Persistence**:
   - Use named volumes or bind mounts to persist PostgreSQL data
   - Implement regular database backups
   - Consider replication for critical deployments

3. **Networking**:
   - Use a reverse proxy (like Nginx or Traefik) for SSL termination
   - Consider setting up a bridge network for container communication

4. **Monitoring**:
   - Set up container monitoring and logging
   - Configure alerts for service disruptions
   - Regularly check the `/health` endpoint status

## Troubleshooting

Common issues and solutions:

1. **Database Connection Errors**:
   - Verify `DATABASE_URL` is correct
   - Ensure the database is reachable from the app container
   - Check PostgreSQL logs for connection attempts

2. **Container Starts But API Not Responsive**:
   - Check container logs: `docker-compose logs app`
   - Verify all required environment variables are set
   - Check the health endpoint: `curl http://localhost:3000/health` 