# Bun Badges Project Structure

This document outlines the recommended organization for the Bun Badges project files and directories.

## Root Directory

The root directory should be kept as clean as possible, containing only essential configuration files and the main entry points for the application.

### Essential Files in Root

- `package.json` - Project dependencies and scripts
- `bun.lock` - Bun lockfile for dependencies
- `build.ts` - Custom build script for the application
- `Dockerfile` - Main production Docker configuration
- `docker-compose.yml` - Main Docker Compose configuration
- `README.md` - Project documentation
- `CHANGES.md` - Changelog
- `.env.example` - Example environment variables
- `.gitignore` - Git ignore configuration
- `.dockerignore` - Docker ignore configuration
- `tsconfig.json` - Main TypeScript configuration
- `eslint.config.js` - ESLint configuration
- `drizzle.config.ts` - Drizzle ORM configuration

## Directory Structure

### `/src` - Application Source Code

- Main application code
- Organized by feature/module
- Includes routes, controllers, models, and utilities

### `/dist` - Compiled Output

- Build output from the TypeScript compiler
- Code-split modules and assets

### `/tests` - Test Files

- Unit tests, integration tests, and E2E tests
- Test fixtures and utilities
- Test configuration

### `/docs` - Documentation

- Project documentation
- API documentation
- Development guides

### `/tools` - Utility Scripts

- Standalone utility scripts
- Database management tools
- Verification tools

### `/docker` - Docker Configuration

- Development and test Docker Compose files
- Docker-related documentation and scripts
- (Note: Main Dockerfile and docker-compose.yml stay in root)

### `/scripts` - Build and Maintenance Scripts

- Build scripts
- Deployment scripts
- Maintenance utilities

### `/examples` - Example Code

- Example usage of the application
- Sample code for integrations

### `/types` - TypeScript Type Definitions

- Global type definitions
- Third-party type extensions

### `/drizzle` - Database Migration Files

- Drizzle ORM migration files
- Database schema definition

## Environment Files

- `.env` - Local development environment variables
- `.env.example` - Example configuration (safe to commit)
- `.env.test` - Test environment variables
- `.env.ci` - CI environment variables
- `.env.docker` - Docker environment variables
- `.env.github` - GitHub Actions environment variables

## Database Storage

As per our PostgreSQL guidelines:

- We use PostgreSQL as the primary storage
- Drizzle ORM is used as our query builder
- Migrations are version-controlled in the `/drizzle` directory
- We use JSONB columns for flexible Open Badges JSON structures
- Key fields are indexed for performance

## Additional Notes

1. **Configuration Files**: TypeScript configuration is split into multiple files for different use cases:
   - `tsconfig.json` - Base configuration
   - `tsconfig.build.json` - Production build configuration
   - `tsconfig.test.json` - Test configuration
   - `tsconfig.src.json` - Source code specific configuration

2. **Docker Files**: While the main `Dockerfile` and `docker-compose.yml` remain in the root, variant files are organized in the `/docker` directory.

3. **Build Process**: Our custom `build.ts` script enables code splitting for better debugging and maintainability. 