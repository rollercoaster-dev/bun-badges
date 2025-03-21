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

The project includes both unit tests and integration tests. Use these commands to run tests:

```bash
# Run all tests (unit + integration)
bun test:all

# Run unit tests only (fast)
bun test:unit

# Run integration tests only (requires Docker)
bun test:integration

# Run a specific test file (auto-detects test type)
bun test:file path/to/test/file.ts

# Run a specific unit test file
bun test:unit:file path/to/unit/test.ts

# Run a specific integration test file
bun test:integration:file path/to/integration/test.ts
```

Integration tests require Docker to run a PostgreSQL database container.

For more details about testing, see [TESTING.md](docs/TESTING.md).

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