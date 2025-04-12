# Docker Configuration Simplification Plan

This document outlines a comprehensive plan to simplify and improve the Docker configuration system for the bun-badges project.

## Background

The current Docker setup has several strengths but also suffers from complexity, inconsistency, and duplication. This plan aims to create a more maintainable, consistent, and developer-friendly Docker environment.

## Goals

- Simplify the Docker configuration system
- Standardize database initialization
- Create consistent port configuration
- Reduce script duplication
- Improve documentation

## Progress Summary

- ✅ Phase 1: Standardize Database Initialization (COMPLETED)
- ✅ Phase 2: Simplify Port Configuration (COMPLETED)
- ⬜ Phase 3: Consolidate Startup Scripts (IN PROGRESS)
- ⬜ Phase 4: Improve Docker Compose Configuration (PLANNED)
- ⬜ Phase 5: Add Clear Documentation (PLANNED)

## Phase 1: Standardize Database Initialization

**Priority: High**
**Estimated time: 1-2 days**

### Tasks

- [x] 1.1 Consolidate Database Scripts
  - [x] Make `src/db/schema/ensure-schema.ts` the standard database initialization script
  - [x] Update all Docker Compose files to use this script
  - [x] Add clear documentation to the script

- [x] 1.2 Update Package.json Scripts
  - [x] Update all test and development scripts to use `ensure-schema.ts`
  - [x] Remove or deprecate references to `migrate.ts`
  - [x] Add clear script descriptions in comments

- [x] 1.3 Create Database Initialization Helper
  - [x] Create a simple helper script that wraps `ensure-schema.ts`
  - [x] Add options for different environments (dev, test, prod)
  - [x] Include proper error handling and logging

## Phase 2: Simplify Port Configuration

**Priority: High**
**Estimated time: 1 day**

### Tasks

- [x] 2.1 Standardize Port Mapping
  - [x] Use fixed internal ports in all containers (e.g., 3000 for app, 5432 for DB)
  - [x] Map to configurable external ports in Docker Compose files
  - [x] Set PORT environment variable explicitly in all configurations

- [x] 2.2 Create Port Configuration File
  - [x] Create a `.env.ports` file for port configuration
  - [x] Document default ports and their purpose
  - [x] Implement port conflict detection and resolution

- [x] 2.3 Update Docker Compose Files
  - [x] Update all Docker Compose files to use consistent port mapping
  - [x] Add comments explaining port mapping strategy
  - [x] Ensure health checks use correct internal ports

## Phase 3: Consolidate Startup Scripts

**Priority: Medium**
**Estimated time: 1-2 days**

### Tasks

- [ ] 3.1 Create Unified Startup Script
  - [ ] Create a new `scripts/docker-start.sh` script
  - [ ] Combine functionality from existing scripts
  - [ ] Add clear logging for each step
  - [ ] Include database initialization
  - [ ] Add support for different environments (dev, test, prod)
  - [ ] Add command-line options for customization

- [ ] 3.2 Update Dockerfile Entrypoints
  - [ ] Update all Dockerfiles to use the unified startup script
  - [ ] Remove redundant environment variable settings
  - [ ] Ensure proper script permissions
  - [ ] Add health check support
  - [ ] Improve error handling and recovery

- [ ] 3.3 Simplify TypeScript Helpers
  - [ ] Refactor `start-dev.ts` to focus on port detection
  - [ ] Move Docker Compose execution to shell scripts
  - [ ] Improve error handling and reporting
  - [ ] Add better logging and user feedback
  - [ ] Create a TypeScript interface for the startup script

## Phase 4: Improve Docker Compose Configuration

**Priority: Medium**
**Estimated time: 1-2 days**

### Tasks

- [ ] 4.1 Create Base Docker Compose File
  - [ ] Create a base `docker-compose.base.yml` with common settings
  - [ ] Include shared volumes, networks, and service definitions
  - [ ] Document the purpose of each component
  - [ ] Add version control comments
  - [ ] Ensure compatibility with different Docker Compose versions

- [ ] 4.2 Create Environment-Specific Overrides
  - [ ] Create specific overrides for dev, test, and production
  - [ ] Use Docker Compose `extends` feature
  - [ ] Keep environment-specific settings isolated
  - [ ] Add clear comments explaining the override strategy
  - [ ] Create a diagram showing the inheritance structure

- [ ] 4.3 Standardize Environment Variables
  - [ ] Create `.env.example` files for each environment
  - [ ] Document required and optional variables
  - [ ] Implement validation for critical variables
  - [ ] Add default values for all variables
  - [ ] Create a script to validate environment variables
  - [ ] Add warnings for deprecated or unused variables

## Phase 5: Add Clear Documentation

**Priority: Low**
**Estimated time: 1 day**

### Tasks

- [ ] 5.1 Create Docker README
  - [ ] Create a `docker/README.md` with comprehensive documentation
  - [ ] Explain the Docker setup architecture
  - [ ] Provide examples for common operations
  - [ ] Add troubleshooting section
  - [ ] Include performance optimization tips
  - [ ] Document security best practices

- [ ] 5.2 Add Inline Documentation
  - [ ] Add detailed comments to all Docker-related files
  - [ ] Explain the purpose of each section
  - [ ] Document any non-obvious behavior
  - [ ] Add version history comments
  - [ ] Include references to external documentation
  - [ ] Document known issues and workarounds

- [ ] 5.3 Create Quick Start Guide
  - [ ] Create a quick start guide for new developers
  - [ ] Include common commands and troubleshooting tips
  - [ ] Add diagrams explaining the Docker architecture
  - [ ] Create a cheat sheet of common commands
  - [ ] Add a FAQ section
  - [ ] Include examples for different development scenarios

- [ ] 5.4 Create Environment Setup Guide
  - [ ] Document the setup process for different operating systems
  - [ ] Include prerequisites and dependencies
  - [ ] Add troubleshooting tips for common issues
  - [ ] Create a step-by-step guide for first-time setup
  - [ ] Document how to update the Docker environment

## Implementation Approach

This plan is being implemented in phases, starting with the most critical issues:

1. ✅ **Completed**: Standardize database initialization (Phase 1)
   - Created a unified database initialization approach
   - Updated all scripts to use the schema validation utility
   - Added comprehensive documentation

2. ✅ **Completed**: Simplify port configuration (Phase 2)
   - Created a centralized port configuration file
   - Implemented consistent port mapping strategy
   - Added port conflict detection and resolution

3. 🔄 **In Progress**: Consolidate startup scripts (Phase 3)
   - Creating a unified startup script
   - Updating Dockerfile entrypoints
   - Simplifying TypeScript helpers

4. ⏱️ **Planned**: Improve Docker Compose configuration (Phase 4)
   - Creating a base Docker Compose file
   - Creating environment-specific overrides
   - Standardizing environment variables

5. ⏱️ **Planned**: Add clear documentation (Phase 5)
   - Creating comprehensive Docker documentation
   - Adding inline documentation
   - Creating quick start and environment setup guides

## Success Criteria

### Technical Success
- All integration tests pass consistently in Docker
- Database initialization is consistent across all environments
- Port conflicts are automatically detected and resolved
- Docker Compose files use a consistent structure and naming convention
- Environment variables are standardized and documented

### Developer Experience
- Developers can start the application with a single command
- Error messages are clear and actionable
- Documentation is comprehensive and up-to-date
- Common issues have documented solutions
- New developers can set up the environment in under 15 minutes

### Maintainability
- Docker configuration is modular and follows DRY principles
- Scripts are well-documented and have clear responsibilities
- Environment-specific settings are isolated and configurable
- Changes to one component don't require changes to multiple files
- Configuration follows Docker best practices
