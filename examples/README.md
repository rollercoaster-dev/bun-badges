# Open Badges 3.0 Examples

This directory contains example scripts demonstrating the functionality of the Bun Badges system, particularly focusing on Open Badges 3.0 features.

## Development Environment

Before running the examples, you need to set up the development environment. You can run the application in two ways:

### Local Development

```bash
# Install dependencies
bun install

# Start the application in development mode
bun run dev
```

### Docker Development (Recommended)

The Docker development environment includes a PostgreSQL database and automatic hot reloading:

```bash
# Full development environment (includes Canvas for image processing)
bun run dev:docker

# Lightweight development environment (no Canvas dependency)
# Use this for Open Badges 3.0 development without image processing
bun run dev:light

# When finished, shut down the containers:
bun run dev:docker:down
# or
bun run dev:light:down
```

## Available Examples

### OB3 Workflow (`ob3-workflow.ts`)

This script demonstrates a complete Open Badges 3.0 lifecycle:

1. Issuer key generation
2. Status list creation
3. Badge credential creation and signing
4. Verification of the badge credential
5. Revocation of the badge
6. Re-verification to confirm revocation

## Running the Examples

### Prerequisites

- Ensure you have Bun installed
- Make sure the project dependencies are installed (`bun install`)

### Running an Example

```bash
# From the project root directory
bun run examples/ob3-workflow.ts
```

## Running Unit Tests

Unit tests for Open Badges 3.0 components are available in the `tests/unit/utils` directory:

```bash
# Run status list utility tests
bun test tests/unit/utils/status-list.test.ts

# Run credential signing verification tests
bun test tests/unit/utils/credential-signing.test.ts

# Run all unit tests
bun run test:unit
```

## Running the Database Migration

To apply the database migration for status list tables:

```bash
# Apply the status list migration
bun run db:migrate:status
```

## Additional Resources

For more information about Open Badges 3.0, see:

- [Project documentation](../docs/OPEN_BADGES_3.md)
- [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/)
- [Open Badges 3.0 Specification](https://w3id.org/badges/v3)
