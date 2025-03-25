# Docker Setup for Bun Badges

This document explains how to use Docker with the Bun Badges application.

## Using the Docker Image

The Bun Badges application is available as a Docker image on GitHub Container Registry. You can run it using Docker Compose or directly with Docker.

### Using Docker Compose

The easiest way to run Bun Badges is using Docker Compose, which sets up both the application and its PostgreSQL database:

```bash
# Pull the latest images and start the services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Using Docker Directly

You can also run the container directly:

```bash
# Pull the latest image
docker pull ghcr.io/rollercoaster.dev/bun-badges:latest

# Run the container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://postgres:postgres@your-db-host:5432/bun_badges \
  -e JWT_SECRET=your-secret-key \
  ghcr.io/rollercoaster.dev/bun-badges:latest
```

## Environment Variables

The Docker image supports the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | The port on which the app listens | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | Secret for JWT token generation | Required |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |
| `NODE_ENV` | Environment (development, production) | `production` |

## Building the Docker Image Locally

You can build the image locally:

```bash
docker build -t bun-badges .
```

## Deployment

This application is configured to automatically build and publish Docker images to GitHub Container Registry when:

1. Changes are pushed to the `main` branch
2. A new tag is created (starting with "v", e.g., "v1.0.0")

These images are available at `ghcr.io/rollercoaster.dev/bun-badges`.

## Production Considerations

For production deployments:

1. Use a strong, unique `JWT_SECRET`
2. Consider using a managed PostgreSQL service instead of a containerized database
3. Set up proper database backups
4. Use a reverse proxy like Nginx or a load balancer for SSL termination
5. Consider using Docker Swarm or Kubernetes for high availability
