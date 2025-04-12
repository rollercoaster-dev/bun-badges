# Port Configuration

This document explains the port configuration approach for the bun-badges project.

## Overview

The bun-badges project uses a standardized approach to port configuration across all environments (development, test, production). This ensures consistency and reliability when working with ports.

## Port Configuration File

The `.env.ports` file defines the default ports used by the application:

```
# Application Ports
APP_PORT=3000
APP_INTERNAL_PORT=6669

# Database Ports
DB_PORT=5432
DB_INTERNAL_PORT=5432

# Test Ports
TEST_DB_PORT=5433
TEST_APP_PORT=3001

# Development Tools Ports
PGADMIN_PORT=5050
DRIZZLE_STUDIO_PORT=3100
TEST_REPORTS_PORT=8080
```

## Port Mapping Strategy

We use a consistent port mapping strategy across all Docker Compose files:

1. **Fixed Internal Ports**: Inside containers, we use fixed ports (e.g., 6669 for the app, 5432 for the database)
2. **Dynamic External Ports**: On the host, we use configurable ports that can be overridden by environment variables
3. **Automatic Port Detection**: The `start-dev.ts` script automatically finds available ports if the default ports are in use

## Docker Compose Configuration

In Docker Compose files, we use the following pattern for port mapping:

```yaml
ports:
  - "${PORT:-3000}:${APP_INTERNAL_PORT:-6669}"  # For the application
  - "${DB_PORT:-5432}:${DB_INTERNAL_PORT:-5432}"  # For the database
```

This maps the host port (which can be overridden by the PORT environment variable) to the internal container port.

## Environment Variables

The following environment variables are used for port configuration:

- `PORT`: The host port for the application (default: 3000)
- `APP_INTERNAL_PORT`: The internal port for the application (default: 6669)
- `DB_PORT`: The host port for the database (default: 5432)
- `DB_INTERNAL_PORT`: The internal port for the database (default: 5432)

## Port Conflict Resolution

If a port conflict is detected, the `start-dev.ts` script automatically finds an available port:

1. It starts from the base port (e.g., 3000 for the app)
2. It checks if the port is available
3. If not, it increments the port number and checks again
4. Once an available port is found, it uses that port for the host mapping

## Best Practices

1. Always use the environment variables defined in `.env.ports` for port configuration
2. Use the `start-dev.ts` script to start the development environment
3. If you need to use a specific port, set the appropriate environment variable
4. Keep the `.env.ports` file up to date with any new ports used by the application
