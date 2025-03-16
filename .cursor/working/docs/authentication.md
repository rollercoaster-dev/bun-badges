# Authentication and Security

## Overview
Multi-factor authentication system with passwordless options and WebAuthn support.

## Authentication Methods

### 1. Passwordless Email Authentication
- Magic link or one-time code sent via email
- Time-limited token generation
- Rate limiting on email sends
- Secure token storage and validation

### 2. WebAuthn Authentication
- FIDO2 compliant implementation
- Support for security keys and biometrics
- Credential management and recovery
- Browser compatibility handling

### 3. OAuth Integration (Future)
- Support for major providers
- Secure token handling
- Profile data synchronization
- Role mapping configuration

## Security Implementation

### JWT Token System
```typescript
interface JWTPayload {
  sub: string;          // User ID
  iss: string;          // Issuer
  iat: number;          // Issued at
  exp: number;          // Expiration
  scope: string[];      // Permissions
  type: "access" | "refresh";
}
```

### Token Management
- Access tokens (15 minute lifetime)
- Refresh tokens (7 day lifetime)
- Secure token rotation
- Blacklist for revoked tokens

### Middleware Implementation
```typescript
// Authentication middleware
app.use("/api/*", async (c) => {
  const token = c.req.header("Authorization")?.split(" ")[1];
  if (!token) {
    return c.json({ error: "Authentication required" }, 401);
  }
  
  try {
    const payload = await verifyToken(token);
    c.set("user", payload);
    return await c.next();
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }
});

// Permission middleware
const requirePermission = (permission: string) => {
  return async (c) => {
    const user = c.get("user");
    if (!user.scope.includes(permission)) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }
    return await c.next();
  };
};
```

## Security Features

### Password Security
- Argon2id for password hashing
- Secure password reset flow
- Password strength requirements
- Breach detection integration

### Session Management
- Secure session handling
- Device tracking
- Concurrent session limits
- Forced logout capability

### Rate Limiting
```typescript
const rateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                  // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP"
});

app.use("/auth/*", rateLimiter);
```

### CORS Configuration
```typescript
app.use("/api/*", cors({
  origin: ["https://badges.example.com"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
```

## Security Best Practices

### Headers and Protection
- Helmet middleware configuration
- CSP (Content Security Policy)
- HSTS enforcement
- XSS protection
- CSRF tokens

### Audit and Monitoring
- Security event logging
- Failed authentication tracking
- Suspicious activity detection
- Regular security audits

### Data Protection
- Data encryption at rest
- Secure key management
- PII handling compliance
- Data retention policies

## Development Guidelines

### Security Testing
- Regular penetration testing
- Automated security scans
- Dependency vulnerability checks
- Code security reviews

### Error Handling
- Secure error messages
- No sensitive data in logs
- Structured error responses
- Graceful failure handling

### Documentation
- Security documentation
- Incident response plan
- Recovery procedures
- Compliance requirements 