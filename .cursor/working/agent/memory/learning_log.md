# Learning Log

## Project Insights
- *Date*: [Record date]
  - *Context*: [Brief context of work]
  - *Learning*: [Specific insight or pattern discovered]
  - *Applied to*: [Reference to task or component]
  
## Code Patterns
- *Date*: [Record date]
  - *Pattern*: [Description of code pattern]
  - *Context*: [Where it was encountered]
  - *Benefits*: [Why this pattern is useful]
  - *Examples*: [Reference to implementation examples]
  
## Technical Discoveries
- *Date*: [Record date]
  - *Discovery*: [Technical insight]
  - *Impact*: [How this affects the project]
  - *Follow-up*: [Any actions needed based on this]
  
## Developer Preferences
- *Date*: [Record date]
  - *Context*: [Work scenario]
  - *Observed Preference*: [What worked well]
  - *Applied to*: [How it was implemented]

## 2024-03-23: TypeScript Errors with Database Testing

### Problem
Found TypeScript errors in the integration tests where `testDb` was being used incorrectly. The errors were:
```
Property 'select' does not exist on type '() => NodePgDatabase<Record<string, unknown>> & { $client: NodePgClient; }'
```

### Root Cause
In `src/utils/test/integration-setup.ts`, `testDb` is exported as a function that returns a database object, but it was being used directly as if it were the database object in `tests/integration/credential.integration.test.ts`.

### Solution
Fixed by adding parentheses to call the `testDb()` function before accessing database methods:
```typescript
// Changed from:
const issuers = await testDb.select()...

// To:
const issuers = await testDb().select()...
```

### Related Knowledge
- The project uses Drizzle ORM for database operations
- `testDb` is intended to be used as a function to get a fresh database connection
- There may be other similar issues in other test files or documentation
- This follows a common pattern where database connections are wrapped in functions to control their lifecycle

### Related Tasks
- Found similar issues in `TESTING.md` documentation examples
- Related to `mock-context-fix.md` and `drizzle_orm_upgrade.task.md` tasks 

## March 26, 2025: Docker Development Environment Issues

Today I worked on fixing Docker development environment issues in the bun-badges project. Key learnings:

1. **Node.js Installation in Debian Containers**:
   - When using the Node.js setup script in Debian containers, it can sometimes fail to properly install npm
   - A more reliable approach is to manually set up the apt repository:
     - Install ca-certificates and gnupg first
     - Add the GPG key using proper gpg commands
     - Create the sources list file with the correct repository
     - Update apt before installing nodejs

2. **Docker Image Building Stages**:
   - The Dockerfile.dev uses a multi-stage build (marked with `AS dev`)
   - However, issues can arise when the final entrypoint references files created in earlier stages
   - It's important to verify that files created with RUN commands persist through all build stages

3. **Container Startup Script Issues**:
   - The project uses a custom startup script for development containers
   - Script creation appears correct in the Dockerfile but is not found at runtime
   - Possible causes include:
     - Volume mounts overwriting the /app directory where the script is stored
     - Permissions issues with the script
     - Entrypoint configuration in docker-compose.yml

4. **Docker Configuration Structure**:
   - The project uses a well-organized Docker setup with separate files for:
     - Production build (Dockerfile)
     - Development environment (Dockerfile.dev)
     - Various docker-compose files for different scenarios
   - This modular approach is good for maintainability but requires careful coordination

I'll continue investigating the start-dev.sh script issue to ensure a working development environment.
