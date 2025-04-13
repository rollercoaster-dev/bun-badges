# BE-01: Prisma Schema Modularization

## Description
Implement a modular approach to our Prisma schema organization similar to Badge Engine's implementation. This will improve maintainability and organization as our schema grows.

## Tasks
- [ ] Enable the `prismaSchemaFolder` preview feature in our Prisma configuration
- [ ] Create a base schema file with generator and datasource configurations
- [ ] Split our current schema into domain-specific files (e.g., user.prisma, badge.prisma, etc.)
- [ ] Ensure all relations between models are properly maintained across files
- [ ] Update our database migration and seeding processes to work with the new structure
- [ ] Document the new schema organization for future developers

## Implementation Details
Badge Engine uses the `prismaSchemaFolder` preview feature to split their schema into multiple files by domain. Each file focuses on a specific entity or group of related entities.

Example structure:
```
prisma/
  schema/
    _base.prisma (contains generator and datasource)
    user.prisma
    badge.prisma
    issuer.prisma
    etc.
```

## Benefits
- Improved code organization
- Better separation of concerns
- Easier navigation and maintenance
- More manageable pull requests and code reviews
- Clearer domain boundaries

## References
- Badge Engine's schema organization: `../badge-engine/prisma/schema/`
- Prisma documentation on schema organization: https://www.prisma.io/docs/guides/development-environment/environment-variables/prisma-schema-folder
