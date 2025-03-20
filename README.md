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
# Start development environment with hot-reloading
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop containers
docker-compose -f docker-compose.dev.yml down
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

This project uses Bun's built-in test runner with a comprehensive dual-approach testing strategy:

- **Unit Tests**: Fast tests using mocks for external dependencies
- **Integration Tests**: Complete tests with real database connections

For detailed information about testing strategy, see [TESTING.md](TESTING.md).

### Running Unit Tests (Recommended)

The simplest way to run tests is to use the unit tests, which don't require a database:

```bash
# Run unit tests only
./test.sh
# or
bun test:unit
```

### Running Integration Tests

Integration tests require a PostgreSQL database. You can run them in two ways:

#### Option 1: All-in-one script (Recommended)
```bash
# This will start the database, run tests, and clean up
bun test:integration:full
# or
./integration-test.sh
```

#### Option 2: Manual steps
If you need more control:

1. Start the test database:
   ```bash
   docker-compose -f docker-compose.test.yml up -d
   ```

2. Run the integration tests:
   ```bash
   bun test:integration
   ```

3. When done, stop the database:
   ```bash
   docker-compose -f docker-compose.test.yml down
   ```

### Running All Tests

To run both unit and integration tests in sequence:

```bash
# This will run unit tests, then start the database and run integration tests
bun test:all
# or
./test-all.sh
```

### Test Organization

Tests are organized as follows:

```
src/
├── __tests__/             # Top-level unit tests
│   ├── controllers/       # Controller tests
│   │   ├── integration/   # Controller integration tests
│   │   └── ...            # Controller unit tests
│   ├── middleware/        # Middleware tests
│   └── routes/            # Route tests
│       ├── integration/   # Route integration tests
│       └── ...            # Route unit tests
├── services/
│   └── __tests__/         # Service tests
│       ├── integration/   # Service integration tests
│       └── ...            # Service unit tests
└── utils/
    └── test/              # Test utilities
        ├── db-helpers.ts  # Database helpers for tests
        ├── setup.ts       # Main test setup file
        └── ...            # Other test utilities
```

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