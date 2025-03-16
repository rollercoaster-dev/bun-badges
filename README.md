# Bun Badges

An Open Badges server implementation using Bun and Hono, supporting Open Badges 2.0 specification with a roadmap for 3.0.

## Features

- Open Badges 2.0 compliant
- Built with Bun and Hono for high performance
- TypeScript with strict mode
- RESTful API design
- Extensible architecture

## Prerequisites

- Bun >= 1.0.0
- Node.js >= 18.0.0 (for development tools)

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

More endpoints coming soon...

## Environment Variables

- `PORT` - Server port (default: 3000)
- More variables will be added as needed

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
