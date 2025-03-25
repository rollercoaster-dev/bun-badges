# Bun Badges

[![CI/CD](https://github.com/rollercoaster-dev/bun-badges/actions/workflows/ci.yml/badge.svg)](https://github.com/rollercoaster-dev/bun-badges/actions/workflows/ci.yml)

A high-performance Open Badges server implementation using Bun and Hono, supporting both Open Badges 2.0 and 3.0 specifications.

## Features

- **Open Badges Standards Support**:
  - Open Badges 2.0 compliant
  - Open Badges 3.0 with W3C Verifiable Credentials implementation
  - Backward compatibility between versions
- **Badge Handling**:
  - Badge creation and issuance
  - Badge verification with cryptographic proofs
  - Badge baking for both PNG and SVG formats
  - Assertion extraction from baked badges
- **Authentication**:
  - Passwordless email authentication
  - WebAuthn support
  - OAuth integration (coming soon)
- **Modern Stack**:
  - Built with Bun and Hono for high performance
  - TypeScript with strict mode
  - PostgreSQL with Drizzle ORM
  - RESTful API design
- **Deployment**:
  - Docker containerization
  - Easy self-hosting
  - OpenAPI/Swagger documentation

## Prerequisites

- Bun >= 1.0.0
- Node.js >= 18.0.0 (for development tools)
- Docker and Docker Compose (for containerized deployment)

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/bun-badges.git
cd bun-badges

# Install dependencies
bun install
```

## Development

```bash
# Start development server with hot reload
bun run dev

# Type checking
bun run typecheck

# Build for production
bun run build

# Start production server
bun run start
```

### Using Docker for Development

```bash
# Full development environment (includes Canvas for image processing)
bun run dev:docker

# Start with rebuild (after dependency changes)
bun run dev:docker:build

# Lightweight development environment (no Canvas dependency)
bun run dev:light

# Lightweight environment with rebuild
bun run dev:light:build

# Stop containers
bun run dev:docker:down
# or
bun run dev:light:down
```

## Deployment

### Using Docker Compose (Recommended)

```bash
# Create .env file from example
cp .env.example .env
# Edit .env with your configuration

# Build and start containers in production mode
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### Using the Docker Image

The project provides a ready-to-use Docker image that can be pulled from GitHub Container Registry or built locally.

#### Pulling from GitHub Container Registry

```bash
# Pull the latest image
docker pull ghcr.io/rollercoaster-dev/bun-badges:latest

# Run the container
docker run -p 3000:3000 --name bun-badges \
  -e DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/bun_badges \
  -e NODE_ENV=production \
  ghcr.io/rollercoaster-dev/bun-badges:latest
```

#### Building Locally

```bash
# Build the image
docker build -t bun-badges:local .

# Run the container
docker run -p 3000:3000 --name bun-badges \
  -e DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/bun_badges \
  bun-badges:local
```

#### Using with Docker Compose

We provide a sample `docker-compose.example.yml` that you can use as a starting point:

```bash
# Copy the example file
cp docker-compose.example.yml docker-compose.yml

# Edit as needed
# Then run
docker-compose up -d
```

For more detailed instructions, configuration options, and best practices, see our [Docker Deployment Guide](docs/docker-deployment.md).

#### Environment Variables

When running the Docker image, you can configure it with the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | The port the server listens on | `3000` |
| `NODE_ENV` | Environment (production, development) | `production` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |
| `HOST` | Host to bind to | `0.0.0.0` |

#### Connecting to a Database

The application requires a PostgreSQL database. In a production environment, we recommend:

1. Using a managed PostgreSQL service
2. Or running PostgreSQL in a separate container (as shown in `docker-compose.example.yml`)
3. Properly securing your database connection with TLS and strong passwords

Following our [PostgreSQL Guidelines](#postgresql-guidelines), the application:
- Uses Drizzle ORM to interact with the database
- Maintains migrations in the `/drizzle` directory
- Uses JSONB columns for flexible Open Badges JSON structures
- Indexes key fields for optimal performance

### Manual Deployment

```bash
# Build for production
bun run build

# Start production server
bun run start
```

## Project Structure

```
src/
├── routes/       # API route definitions
├── controllers/  # Request handlers
├── services/     # Business logic
├── models/       # Data models
├── middleware/   # Custom middleware
├── utils/        # Helper functions
└── __tests__/    # Test directories - see Testing section for details
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication
- `POST /auth/email/start` - Start email authentication flow
- `POST /auth/email/verify` - Verify email authentication code
- `POST /auth/webauthn/register` - Register WebAuthn credential
- `POST /auth/webauthn/authenticate` - Authenticate with WebAuthn

### Issuers
- `GET /issuers` - List all issuers
- `GET /issuers/:id` - Get a specific issuer
- `POST /issuers` - Create a new issuer
- `PUT /issuers/:id` - Update an issuer

### Badges
- `GET /badges` - List all badges
- `GET /badges/:id` - Get a specific badge
- `POST /badges` - Create a new badge
- `PUT /badges/:id` - Update a badge
- `DELETE /badges/:id` - Delete a badge
- `GET /badges/bake/:badgeId/:assertionId` - Bake an assertion into a badge image
- `POST /badges/extract` - Extract assertion from a baked badge

### Assertions
- `GET /assertions` - List all assertions (with optional filtering)
- `GET /assertions/:id` - Get a specific assertion (add `?format=ob3` for Open Badges 3.0 format)
- `POST /assertions` - Issue a badge (add `"version": "ob3"` in request body for OB3.0)
- `POST /assertions/:id/revoke` - Revoke a badge assertion

### Verification
- `GET /verify/:id` - Verify a badge assertion
- `POST /verify` - Verify a badge assertion from provided JSON

See the [API Documentation](#api-documentation) section for more details on using these endpoints.

## Environment Variables

Copy `.env.example` to `.env` and update as needed:

```
# Server Configuration
PORT=7777
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=badges
DB_USER=badges_user
DB_PASSWORD=badges_password
DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# Docker Configuration
POSTGRES_DB=${DB_NAME}
POSTGRES_USER=${DB_USER}
POSTGRES_PASSWORD=${DB_PASSWORD}

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
```

## Testing

### Test Environment Setup

The project uses a comprehensive test suite including unit, integration, and end-to-end tests. To simplify running tests in different environments, we've implemented the following:

1. **Environment Configuration**:
   - `.env.test` - Local test environment configuration
   - `.env.ci` - CI environment configuration

2. **Test Setup Script**:
   - Located at `scripts/run-tests.sh`
   - Run specific test types: `scripts/run-tests.sh [unit|integration|e2e|database|all]`
   - Automatically detects environment and sets appropriate variables

3. **Docker Database Integration**:
   - Tests use a dedicated PostgreSQL container defined in `docker-compose.test.yml`
   - Set `SKIP_DOCKER=true` to use an existing database connection
   - CI environments automatically use service containers instead of Docker

4. **Database Connection**:
   - Automatic fallback and retry mechanisms
   - Connection pooling optimized for tests
   - Default configuration uses port 5434 to avoid conflicts with development database

### Running Tests

```bash
# Run all tests
bun test

# Run specific test types using the helper script
scripts/run-tests.sh unit       # Only unit tests
scripts/run-tests.sh integration # Only integration tests
scripts/run-tests.sh e2e        # Only end-to-end tests
scripts/run-tests.sh database   # Database connection tests

# Manual test configuration
SKIP_DOCKER=true bun test                  # Skip Docker setup, use existing database
INTEGRATION_TEST=true bun test tests/integration # Only run integration tests
E2E_TEST=true bun test tests/e2e           # Only run E2E tests
```

### CI/CD Pipeline

The CI/CD pipeline is configured to run tests in GitHub Actions:

1. Sets up a PostgreSQL service container
2. Creates and migrates the test database
3. Runs unit, integration, and E2E tests separately
4. Uses the CI-specific environment configuration

See `.github/workflows/ci-tests.yml` for the complete configuration.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT

## API Documentation

The API is documented using OpenAPI/Swagger. When running the server, you can access the API documentation at:

```
http://localhost:7777/docs
```

This provides an interactive interface to explore and test the API endpoints.

## Open Badges 3.0 Support

For detailed information about the Open Badges 3.0 implementation, including the Verifiable Credentials data model, cryptographic verification, and example usage, see [Open Badges 3.0 Documentation](docs/OPEN_BADGES_3.md).

## HTTPS Configuration

The application supports HTTPS for secure communication. Here's how to set it up:

### Development HTTPS Setup

1. Generate self-signed certificates for development:

```bash
bun run gen:certs
```

2. Update your `.env` file with the following settings:

```
USE_HTTPS=true
TLS_CERT_FILE=./certs/cert.pem
TLS_KEY_FILE=./certs/key.pem
```

3. Start the development server with HTTPS enabled:

```bash
bun run dev:https
```

### Production HTTPS Setup

For production, you should use proper certificates from a trusted certificate authority:

1. Obtain SSL/TLS certificates from a trusted Certificate Authority
2. Place the certificates in the `./certs` directory or another location of your choice
3. Set the environment variables in your `.env` file:

```
USE_HTTPS=true
TLS_CERT_FILE=/path/to/your/cert.pem
TLS_KEY_FILE=/path/to/your/key.pem
TLS_PASSPHRASE=your-passphrase-if-needed
```

The Docker configuration is already set up to mount the `./certs` directory into the container.

**Note:** Self-signed certificates are not suitable for production use and will trigger security warnings in browsers. Always use certificates from a trusted Certificate Authority for production environments.

**Current limitations:**
- Bun currently only supports HTTPS over HTTP/1.1
- HTTP/2 is not yet supported

## PostgreSQL Guidelines

This project uses PostgreSQL as its database system, following these principles:

### Core Database Approach

- **Primary Storage:** PostgreSQL is used as the primary database for all badge data
- **ORM Integration:** Drizzle ORM is used for database interactions, providing type safety and query building
- **Migration Strategy:** Database migrations are versioned and maintained in the `/drizzle` directory
- **Flexible Schema Design:** JSONB columns are used for storing dynamic Open Badges JSON structures
- **Performance Optimization:** Key fields are indexed for optimal query performance

### Database Setup

The application requires a PostgreSQL database (version 13 or higher recommended). Connection is configured via the `DATABASE_URL` environment variable, which should be in the following format:

```
postgres://username:password@hostname:port/database
```

### Schema Structure

The core schema includes tables for:
- Issuers (issuer_profiles)
- Badges (badge_classes)
- Assertions (badge_assertions)
- Keys and credentials (signing_keys)
- Status lists for revocation

Each table maintains both structured fields for querying and JSONB fields for the complete badge data.