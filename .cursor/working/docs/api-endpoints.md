# REST API Endpoints

## Overview
RESTful API design following Open Badges standards and best practices.

## Authentication Endpoints

### POST /auth/email/start
Start passwordless email authentication flow
```typescript
Request:
{
  email: string
}

Response:
{
  status: "success",
  message: "Authentication code sent"
}
```

### POST /auth/email/verify
Verify email authentication code
```typescript
Request:
{
  email: string,
  code: string
}

Response:
{
  status: "success",
  token: string
}
```

### POST /auth/webauthn/register
Register WebAuthn credential
```typescript
Request:
{
  credential: PublicKeyCredential
}

Response:
{
  status: "success"
}
```

### POST /auth/webauthn/authenticate
Authenticate with WebAuthn
```typescript
Request:
{
  credential: PublicKeyCredential
}

Response:
{
  status: "success",
  token: string
}
```

## Issuer Profile Endpoints

### POST /issuers
Create new issuer profile
```typescript
Request:
{
  name: string,
  url: string,
  description: string,
  email: string
}

Response:
{
  issuerId: string,
  profile: IssuerProfile
}
```

### GET /issuers/:issuerId
Get issuer profile
```typescript
Response:
{
  profile: IssuerProfile
}
```

### PUT /issuers/:issuerId
Update issuer profile
```typescript
Request:
{
  name?: string,
  url?: string,
  description?: string,
  email?: string
}

Response:
{
  profile: IssuerProfile
}
```

## Badge Class Endpoints

### POST /badges
Create new badge class
```typescript
Request:
{
  issuerId: string,
  name: string,
  description: string,
  criteria: string,
  image: File
}

Response:
{
  badgeId: string,
  badge: BadgeClass
}
```

### GET /badges/:badgeId
Get badge class
```typescript
Response:
{
  badge: BadgeClass
}
```

### PUT /badges/:badgeId
Update badge class
```typescript
Request:
{
  name?: string,
  description?: string,
  criteria?: string,
  image?: File
}

Response:
{
  badge: BadgeClass
}
```

## Badge Assertion Endpoints

### POST /assertions
Issue badge assertion
```typescript
Request:
{
  badgeId: string,
  recipient: {
    type: "email" | "url" | "telephone",
    identity: string,
    hashed: boolean
  },
  evidence?: string
}

Response:
{
  assertionId: string,
  assertion: BadgeAssertion
}
```

### GET /assertions/:assertionId
Get badge assertion
```typescript
Response:
{
  assertion: BadgeAssertion
}
```

### POST /assertions/:assertionId/revoke
Revoke badge assertion
```typescript
Request:
{
  reason: string
}

Response:
{
  status: "success"
}
```

## Verification Endpoints

### GET /verify/:assertionId
Verify badge assertion
```typescript
Response:
{
  valid: boolean,
  results: VerificationResult[]
}
```

## Implementation Details

### Response Format
All responses follow the structure:
```typescript
{
  status: "success" | "error",
  data?: any,
  error?: {
    code: string,
    message: string
  }
}
```

### Error Codes
- `AUTH_REQUIRED`: Authentication required
- `INVALID_TOKEN`: Invalid or expired token
- `NOT_FOUND`: Resource not found
- `FORBIDDEN`: Insufficient permissions
- `VALIDATION`: Invalid request data
- `SERVER_ERROR`: Internal server error

### Rate Limiting
- 100 requests per minute per IP
- 1000 requests per hour per authenticated user
- Custom limits for high-volume issuers

### Caching
- ETag support for GET requests
- Cache-Control headers
- Redis-based response caching 