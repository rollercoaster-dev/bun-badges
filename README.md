# Bun Badges

An Open Badges server implementation using Bun and Hono, supporting Open Badges 2.0 specification with a roadmap for 3.0.

## Features

- Open Badges 2.0 compliant
- Badge baking for both PNG and SVG formats
- Assertion extraction from baked badges
- Built with Bun and Hono for high performance
- TypeScript with strict mode
- RESTful API design
- Extensible architecture
- Docker containerization for easy deployment

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
└── utils/        # Helper functions
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Badges
- `GET /badges` - List all badges
- `GET /badges/:id` - Get a specific badge
- `POST /badges` - Create a new badge
- `PUT /badges/:id` - Update a badge
- `DELETE /badges/:id` - Delete a badge
- `GET /badges/bake/:badgeId/:assertionId` - Bake an assertion into a badge image
- `POST /badges/extract` - Extract assertion from a baked badge

More endpoints coming soon...

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

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
