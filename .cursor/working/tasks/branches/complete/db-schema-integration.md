# Database Schema Integration for Security Features

## Branch: `feat/db-schema-integration`

## Prerequisites and Dependencies
- PostgreSQL database must be running and accessible
- Drizzle ORM must be installed and configured
- Environment variables for database connection must be set

## Context and Background
Database schema integration is the foundation for all security features in Phase 3. It provides the data structures needed for storing and managing cryptographic keys, OAuth tokens, and credential status information.

The Open Badges 3.0 specification requires secure storage of keys, tokens, and credential status to ensure the integrity and security of the badge ecosystem. This implementation follows database security best practices and provides a solid foundation for the other security features.

Key design decisions:
- Use of UUIDs/CUIDs for primary keys to prevent enumeration attacks
- Separation of concerns with distinct tables for keys, tokens, and credentials
- Inclusion of timestamps for creation, expiration, and revocation for audit purposes
- Storage of sensitive data with proper encryption

### Current Status
- [x] Created database schema for keys
- [x] Created database schema for tokens
- [x] Created database schema for credentials
- [x] Added schemas to main schema index
- [x] Generated and applied migrations
- [x] Created database service methods for basic CRUD operations

### Implementation Plan
1. Create database schemas for security features
   - Keys schema for secure key management
   - Tokens schema for OAuth token management
   - Credentials schema for credential verification and status
2. Add schemas to main schema index
3. Generate and apply migrations
4. Create database service methods for basic CRUD operations
5. Write tests for database service methods

### Learnings
- Database schema design for security features requires careful consideration of relationships between entities
- Encryption of sensitive data (like private keys) should be handled at the application level before storing in the database
- Using CUID for primary keys provides better security and performance than sequential IDs
- Including timestamps for creation, expiration, and revocation helps with auditing and security management

### Next Steps
- ✅ Integration of schemas with the main schema index - Completed
- ✅ Migrations generated and applied - Completed
- ✅ Database service methods for basic CRUD operations - Completed
- ✅ Tests for database service methods - Completed
- Consider adding additional documentation for the schema design
- Review security practices for sensitive data storage

### Related Code Sections
- `src/db/schema/index.ts` - Main schema index file
- `src/db/migrations/` - Database migrations directory
- `src/services/db.service.ts` - Database service implementation

### Testing Strategy
- Unit tests for schema validation
- Integration tests for database operations
- Migration tests to verify schema changes

Test cases to cover:
1. Schema creation and validation
2. Migration application and rollback
3. Basic CRUD operations on each table
4. Foreign key constraints and relationships
5. Error handling for invalid data

### Rollback Plan
- Database migrations include down migrations for rollback
- Schema changes are versioned for tracking
- Backup of database before applying migrations

### Definition of Done
- ✅ All security-related schemas are created and integrated
- ✅ Migrations are generated and can be applied successfully
- ✅ Basic database service methods are implemented and tested
- ✅ Tests for database services are written and passing
- ✅ Documentation is updated with schema details
- Performance meets requirements (queries complete in < 100ms)

### References
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Open Badges 3.0 Specification](https://www.imsglobal.org/spec/ob/v3p0/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Security Best Practices](https://www.cisecurity.org/insights/white-papers/cis-postgresql-benchmark)
