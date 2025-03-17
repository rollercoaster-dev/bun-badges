# Task 2: Authorization Middleware Implementation

## Task Description
Implement authorization middleware for the Open Badges API to secure issuer management endpoints and ensure proper access control.

## Priority
High - Security critical component

## Estimated Time
2-3 days

## Dependencies
- Issuer management implementation
- Authentication system

## Detailed Steps

### Phase 1: Authorization Design (1 day) ✅
- [x] Define authorization roles and permissions:
  - [x] `ADMIN` - Full system access
  - [x] `ISSUER_ADMIN` - Manage all issuers
  - [x] `ISSUER_OWNER` - Manage owned issuers
  - [x] `ISSUER_VIEWER` - View issuer details
- [x] Design role-based access control (RBAC) schema
- [x] Document permission requirements for each endpoint
- [x] Plan integration with existing authentication system

### Phase 2: Middleware Implementation (1 day) ✅
- [x] Create base authorization middleware:
  - [x] JWT validation and role extraction
  - [x] Role-based permission checking
  - [x] Error handling for unauthorized access
- [x] Implement specific middleware functions:
  - [x] `requireAuth` - Basic authentication check
  - [x] `requireRole` - Role-based access control
  - [x] `requireOwnership` - Resource ownership validation
- [x] Add rate limiting for API endpoints

### Phase 3: Route Integration (0.5 days)
- [ ] Update issuer routes with authorization:
  - [ ] `GET /api/issuers` - Require `ISSUER_VIEWER`
  - [ ] `GET /api/issuers/:id` - Require `ISSUER_VIEWER`
  - [ ] `POST /api/issuers` - Require `ISSUER_ADMIN`
  - [ ] `PUT /api/issuers/:id` - Require `ISSUER_ADMIN` or ownership
  - [ ] `DELETE /api/issuers/:id` - Require `ISSUER_ADMIN` or ownership
  - [ ] `GET /api/issuers/:id/verify` - Public access
- [ ] Add ownership checks for relevant endpoints
- [ ] Implement proper error responses

### Phase 4: Testing (0.5 days)
- [ ] Write unit tests for middleware functions
- [ ] Create integration tests for protected routes
- [ ] Test error cases and edge conditions
- [ ] Test rate limiting functionality
- [ ] Verify proper role enforcement

## Acceptance Criteria
- [x] All middleware components implemented
- [x] Role-based access control implemented
- [x] Resource ownership validation implemented
- [x] Rate limiting implemented
- [ ] All routes properly protected
- [ ] Error responses follow API standards
- [ ] All tests pass with good coverage

## Implementation Details

### Authorization Levels ✅
```typescript
enum Role {
  ADMIN = 'ADMIN',
  ISSUER_ADMIN = 'ISSUER_ADMIN',
  ISSUER_OWNER = 'ISSUER_OWNER',
  ISSUER_VIEWER = 'ISSUER_VIEWER'
}

interface AuthUser {
  id: string;
  roles: Role[];
  organizationId?: string;
}
```

### Endpoint Permissions
| Endpoint | Method | Required Role | Notes | Status |
|----------|--------|---------------|-------|---------|
| `/api/issuers` | GET | `ISSUER_VIEWER` | List all accessible issuers | 🚧 |
| `/api/issuers/:id` | GET | `ISSUER_VIEWER` | View specific issuer | 🚧 |
| `/api/issuers` | POST | `ISSUER_ADMIN` | Create new issuer | 🚧 |
| `/api/issuers/:id` | PUT | `ISSUER_ADMIN`/`ISSUER_OWNER` | Update if admin or owner | 🚧 |
| `/api/issuers/:id` | DELETE | `ISSUER_ADMIN`/`ISSUER_OWNER` | Delete if admin or owner | 🚧 |
| `/api/issuers/:id/verify` | GET | Public | Verify issuer profile | 🚧 |

### Rate Limiting Rules ✅
- Public endpoints: 100 requests per hour
- Authenticated endpoints: 1000 requests per hour
- Admin endpoints: 5000 requests per hour

## Progress Notes
- ✅ Implemented role-based access control with proper role hierarchy
- ✅ Added JWT validation with type-safe payload checking
- ✅ Created resource ownership validation middleware
- ✅ Implemented rate limiting with different tiers
- ✅ Added middleware composition utility
- 🚧 Need to integrate middleware with routes
- 🚧 Need to write tests
- 🚧 Need to verify error responses

## Next Steps
1. Update issuer routes to use the new middleware
2. Write comprehensive tests
3. Document API security measures

## Notes
- Using Hono's built-in middleware support
- Implemented custom rate limiter with in-memory storage
- Added type-safe JWT validation
- Designed for future expansion of roles and permissions 