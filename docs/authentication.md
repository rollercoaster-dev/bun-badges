# Authentication and Security

## Overview
The Open Badges 3.0 implementation includes a comprehensive security system with multiple authentication methods, robust authorization, and various security protections.

## Authentication Methods

### 1. JWT-Based Authentication
- Bearer token authentication using JWT
- Access and refresh token system
- Token revocation capabilities
- Scope-based permissions

### 2. Passwordless Authentication
- One-time code sent via email
- Time-limited token generation
- Rate limiting on code requests
- Secure code storage and validation

### 3. OAuth 2.0 Integration
- Full OAuth 2.0 server implementation
- Support for authorization code flow with PKCE
- Client credentials flow for server-to-server communication
- JWT-secured authorization requests (JAR)

## Security Implementation

### JWT Token System
```typescript
interface JWTPayload {
  sub: string;          // User ID
  iss: string;          // Issuer (bun-badges)
  aud: string;          // Audience (bun-badges-clients)
  iat: number;          // Issued at timestamp
  exp: number;          // Expiration timestamp
  jti: string;          // JWT ID (for revocation)
  type: "access" | "refresh" | "registration" | "verification";
  scope?: string;       // Space-separated permissions
}
```

### Token Management
- Access tokens (24 hour lifetime by default)
- Refresh tokens (7 day lifetime by default)
- Secure token rotation
- Database-backed token revocation system

### Authentication Middleware
```typescript
// Authentication middleware
const authMiddleware = createAuthMiddleware(db);

// Apply to protected routes
app.use("/api/*", authMiddleware);

// Role-based protection for specific endpoints
app.get("/protected/admin", requireRole(Role.ADMIN), (c) => {
  return c.json({ message: "Admin access granted" });
});
```

## Security Features

### Content Security Policy (CSP)
- Strict CSP to prevent XSS attacks
- CSP violation reporting
- Fine-grained control over allowed sources
- Report-only mode for development

```typescript
// CSP configuration
const cspConfig = {
  enabled: true,
  reportOnly: process.env.NODE_ENV === "development",
  reportUri: "/api/csp-report",
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    // Additional directives...
  }
};
```

### Cross-Site Request Forgery (CSRF) Protection
- Token-based CSRF protection
- Double-submit cookie pattern
- Protection for all state-changing operations
- CSRF token API for frontend applications

```typescript
// Get a CSRF token for frontend use
fetch('/api/csrf/token')
  .then(response => response.json())
  .then(data => {
    // Include in subsequent requests
    headers['X-CSRF-Token'] = data.csrfToken;
  });
```

### Rate Limiting
- Tiered rate limiting based on authentication status
- Different limits for public, authenticated, and admin users
- IP-based rate limiting for anonymous requests
- User-based rate limiting for authenticated requests

```typescript
// Rate limiting configuration
const rateLimitConfig = {
  public: {
    max: 100,        // requests
    period: 3600000, // 1 hour in milliseconds
  },
  authenticated: {
    max: 1000,
    period: 3600000,
  },
  admin: {
    max: 5000,
    period: 3600000,
  },
};
```

### CORS Configuration
- Strict CORS policy for production
- Configurable allowed origins, methods, and headers
- Credentials support for authenticated requests
- Exposed headers for CSRF token access

```typescript
// CORS configuration
app.use("*", cors({
  origin: process.env.NODE_ENV === "production" 
    ? [process.env.FRONTEND_URL || ""]
    : ["*"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  exposeHeaders: ["X-CSRF-Token"],
  credentials: true,
}));
```

## Security Headers

### Standard Security Headers
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()
- Strict-Transport-Security: max-age=31536000; includeSubDomains

### Content Security Policy
A comprehensive Content Security Policy is implemented to prevent various attacks:

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

## Input Validation and Sanitization
- Schema validation using Zod
- Input sanitization to prevent injection attacks
- Output encoding to prevent XSS
- Strict type checking with TypeScript

## Error Handling
- Secure error responses that don't leak sensitive information
- Comprehensive error logging
- Standardized error format
- Graceful failure handling

## Development Guidelines

### Security Testing
- Unit tests for security middleware
- Integration tests for authentication and authorization
- Security scanning with tools like OWASP ZAP
- Regular security audits

### Best Practices
- Use the authentication middleware for all protected routes
- Apply role-based or permission-based authorization for sensitive operations
- Always validate and sanitize user input
- Use CSRF protection for all state-changing operations
- Set appropriate CORS headers for cross-origin requests
- Implement rate limiting for all endpoints
- Use secure headers for all responses
- Log security events for monitoring and auditing
