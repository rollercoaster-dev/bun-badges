# Security Implementation Guide

This document provides an overview of the security implementation in the Open Badges 3.0 server.

## Table of Contents
1. [Authentication](#authentication)
2. [Authorization](#authorization)
3. [Security Headers](#security-headers)
4. [CSRF Protection](#csrf-protection)
5. [Rate Limiting](#rate-limiting)
6. [Input Validation](#input-validation)
7. [Error Handling](#error-handling)
8. [Testing](#testing)

## Authentication

The application uses JWT-based authentication with support for access and refresh tokens.

### Key Files
- `src/utils/auth/jwt.ts` - JWT token generation and verification
- `src/middleware/auth.middleware.ts` - Authentication middleware
- `src/controllers/auth.controller.ts` - Authentication endpoints

### Token Types
- **Access Tokens**: Short-lived tokens for API access (default: 24 hours)
- **Refresh Tokens**: Long-lived tokens for obtaining new access tokens (default: 7 days)
- **Verification Tokens**: Used for email verification and passwordless authentication
- **Registration Tokens**: Used during the registration process

### Token Revocation
Tokens can be revoked using the token revocation endpoint. Revoked tokens are stored in the database to prevent their reuse.

## Authorization

The application implements role-based and permission-based authorization.

### Key Files
- `src/middleware/auth.ts` - Role-based authorization middleware
- `src/middleware/authorization.middleware.ts` - Permission-based authorization middleware

### Roles
- `ADMIN`: Full system access
- `ISSUER_ADMIN`: Administrative access to issuers
- `ISSUER_OWNER`: Owner access to specific issuers
- `ISSUER_VIEWER`: Read-only access to issuers

### Usage Example
```typescript
// Protect a route with role-based authorization
app.get("/protected/admin", requireRole(Role.ADMIN), (c) => {
  return c.json({ message: "Admin access granted" });
});

// Protect a route with permission-based authorization
app.post("/credentials", requirePermission("create:credential"), (c) => {
  return credentialController.createCredential(c);
});
```

## Security Headers

The application implements various security headers to protect against common web vulnerabilities.

### Key Files
- `src/middleware/security.middleware.ts` - Security middleware implementation
- `src/config/security.config.ts` - Security configuration

### Headers Implemented
- **Content-Security-Policy**: Prevents XSS and data injection attacks
- **X-XSS-Protection**: Additional XSS protection for older browsers
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts browser features
- **Strict-Transport-Security**: Enforces HTTPS

### Content Security Policy
The CSP is configured to allow resources only from trusted sources:

```
Content-Security-Policy: default-src 'self'; 
  script-src 'self'; 
  style-src 'self' 'unsafe-inline'; 
  img-src 'self' data: https:; 
  font-src 'self'; 
  connect-src 'self'; 
  object-src 'none'; 
  media-src 'self'; 
  frame-src 'self'; 
  form-action 'self'; 
  base-uri 'self'; 
  frame-ancestors 'self'; 
  upgrade-insecure-requests;
```

## CSRF Protection

The application implements CSRF protection for all state-changing operations.

### Key Files
- `src/utils/auth/csrf.ts` - CSRF token utilities
- `src/utils/auth/csrf-form.ts` - CSRF token form utilities
- `src/routes/csrf.routes.ts` - CSRF token endpoints

### Implementation
The CSRF protection uses the double-submit cookie pattern:
1. A CSRF token is generated and stored in a cookie
2. The same token must be included in the request (header, form field, or JSON body)
3. The server validates that the tokens match

### Usage in Frontend Applications
```javascript
// Get a CSRF token
fetch('/api/csrf/token')
  .then(response => response.json())
  .then(data => {
    // Include in subsequent requests
    headers['X-CSRF-Token'] = data.csrfToken;
  });
```

## Rate Limiting

The application implements rate limiting to prevent abuse.

### Key Files
- `src/middleware/rate-limiter.ts` - Rate limiting implementation
- `src/config/security.config.ts` - Rate limiting configuration

### Rate Limits
- **Public**: 100 requests per hour per IP
- **Authenticated**: 1000 requests per hour per user
- **Admin**: 5000 requests per hour per user

### Implementation
Rate limiting is implemented using an in-memory store with cleanup to prevent memory leaks. In production, this should be replaced with a distributed store like Redis.

## Input Validation

The application validates all input to prevent injection attacks.

### Key Files
- Various controller files using Zod for validation

### Implementation
Input validation is implemented using Zod schemas:

```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const data = await schema.parseAsync(body);
```

## Error Handling

The application implements secure error handling to prevent information leakage.

### Key Files
- `src/middleware/error-handler.ts` - Global error handler
- `src/utils/errors.ts` - Error classes

### Implementation
Errors are caught by the global error handler and transformed into standardized responses that don't leak sensitive information.

## Testing

The security implementation is tested using unit and integration tests.

### Key Files
- `tests/unit/middleware/security.middleware.test.ts` - Security middleware tests
- `tests/unit/utils/csrf.test.ts` - CSRF utility tests

### Running Tests
```bash
bun test
```

## Security Best Practices

1. **Always use authentication middleware** for protected routes
2. **Apply authorization checks** for sensitive operations
3. **Validate all input** using Zod schemas
4. **Use CSRF protection** for all state-changing operations
5. **Set appropriate CORS headers** for cross-origin requests
6. **Implement rate limiting** for all endpoints
7. **Use secure headers** for all responses
8. **Log security events** for monitoring and auditing
