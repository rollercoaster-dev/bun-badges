# Headless OAuth Implementation

This document provides information about the headless OAuth implementation in the Bun Badges server, which allows for machine-to-machine authentication without requiring user interaction or UI components.

## Overview

The headless OAuth implementation enables client applications to acquire tokens programmatically using the OAuth 2.0 Client Credentials grant type. This is particularly useful for server-to-server authentication scenarios where a human user is not present to authorize the request.

## Features

- **Client Credentials Grant**: Support for the OAuth 2.0 Client Credentials grant type (RFC 6749)
- **Headless Client Registration**: Ability to register clients specifically for machine-to-machine authentication
- **Token Management**: Enhanced token storage, introspection, and revocation for client credentials tokens
- **API-First Design**: All OAuth operations accessible via RESTful endpoints

## Endpoints

### Client Registration
- `POST /oauth/register` - Register a new OAuth client

Request body example for a headless client:
```json
{
  "client_name": "My Machine Client",
  "grant_types": ["client_credentials"],
  "scope": "badge:read badge:create assertion:read",
  "token_endpoint_auth_method": "client_secret_basic"
}
```

Response:
```json
{
  "client_id": "abc123",
  "client_secret": "xyz789",
  "client_id_issued_at": 1635765543,
  "client_secret_expires_at": 0,
  "grant_types": ["client_credentials"],
  "token_endpoint_auth_method": "client_secret_basic",
  "scope": "badge:read badge:create assertion:read"
}
```

### Token Endpoint
- `POST /oauth/token` - Request an access token

Request body example for client credentials:
```json
{
  "grant_type": "client_credentials",
  "client_id": "abc123",
  "client_secret": "xyz789",
  "scope": "badge:read"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "badge:read"
}
```

### Token Introspection
- `POST /oauth/introspect` - Validate a token and retrieve its metadata

Request body example:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Response for an active token:
```json
{
  "active": true,
  "client_id": "abc123",
  "scope": "badge:read",
  "token_type": "Bearer",
  "exp": 1635769143,
  "iat": 1635765543,
  "sub": "system"
}
```

### Token Revocation
- `POST /oauth/revoke` - Revoke a token

Request body example:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Response (always returns 200 OK per RFC 7009):
```json
{}
```

## Configuration

The headless OAuth implementation can be configured through environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `OAUTH_ALLOW_HEADLESS` | When true, enables headless OAuth features | `true` |
| `OAUTH_ACCESS_TOKEN_EXPIRY` | Default token expiration time (seconds) | `3600` (1 hour) |
| `OAUTH_REFRESH_TOKEN_EXPIRY` | Default refresh token expiration (seconds) | `2592000` (30 days) |

## Security Considerations

1. **Client Authentication**: Ensure strong client secrets are used for headless clients
2. **Scope Limitation**: Grant only the minimum required scopes to headless clients
3. **Token Expiration**: Consider using shorter expiration times for sensitive operations
4. **IP Restrictions**: Consider implementing IP-based restrictions for machine clients

## Implementation Details

The headless OAuth implementation includes:

1. **Database Storage**: OAuth clients are tracked in the `oauth_clients` table with an `is_headless` flag
2. **Token Storage**: Access tokens are stored in the `oauth_access_tokens` table
3. **Grant Types**: Support for `client_credentials` grant type
4. **Client Authentication**: Support for `client_secret_basic` and `client_secret_post` methods

## Example Use Cases

### Service-to-Service Authentication
```javascript
// Example: Obtaining a token for service-to-service communication
const response = await fetch('https://your-server.com/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + btoa('client_id:client_secret')
  },
  body: JSON.stringify({
    grant_type: 'client_credentials',
    scope: 'badge:read assertion:read'
  })
});

const token = await response.json();
// Use token.access_token for subsequent API calls
```

### Automated Badge Issuance
A headless client could be used to automatically issue badges based on events in another system, such as completion of a course or achievement of a certification.

### Scheduled Reports
A reporting system could use a headless client to regularly access badge data for generating reports without human intervention. 