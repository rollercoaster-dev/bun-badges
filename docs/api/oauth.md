# OAuth 2.0 API Documentation

This document describes the OAuth 2.0 endpoints implemented in the Bun Badges API. The implementation follows the OAuth 2.0 specifications as defined in various RFCs.

## Base URL

All API endpoints are relative to the base URL: `https://api.example.com` (replace with your actual API base URL)

## Endpoints Overview

| Endpoint | Method | Description | RFC |
|----------|--------|-------------|-----|
| `/oauth/register` | POST | Client registration | [RFC 7591](https://tools.ietf.org/html/rfc7591) |
| `/oauth/authorize` | GET/POST | Authorization endpoint | [RFC 6749](https://tools.ietf.org/html/rfc6749) |
| `/oauth/token` | POST | Token endpoint | [RFC 6749](https://tools.ietf.org/html/rfc6749) |
| `/oauth/introspect` | POST | Token introspection | [RFC 7662](https://tools.ietf.org/html/rfc7662) |
| `/oauth/revoke` | POST | Token revocation | [RFC 7009](https://tools.ietf.org/html/rfc7009) |

## Supported Scopes

The following scopes are supported by the API:

| Scope | Description |
|-------|-------------|
| `badge:create` | Create badges on behalf of the user |
| `badge:read` | Read user's badges |
| `badge:update` | Update user's badges |
| `badge:delete` | Delete user's badges |
| `assertion:create` | Issue badge assertions on behalf of the user |
| `assertion:read` | Read user's badge assertions |
| `assertion:update` | Update user's badge assertions |
| `assertion:delete` | Delete user's badge assertions |
| `profile:read` | Read user's profile information |
| `profile:update` | Update user's profile information |
| `offline_access` | Access user's data when they are not present (enables refresh tokens) |

## Client Registration

### POST /oauth/register

Register a new OAuth client.

#### Request

```http
POST /oauth/register HTTP/1.1
Content-Type: application/json

{
  "client_name": "Example Client",
  "redirect_uris": ["https://client.example.com/callback"],
  "client_uri": "https://client.example.com",
  "logo_uri": "https://client.example.com/logo.png",
  "scope": "badge:read profile:read",
  "grant_types": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_method": "client_secret_basic"
}
```

#### Required Parameters

- `client_name`: Human-readable name of the client
- `redirect_uris`: Array of allowed redirect URIs

#### Optional Parameters

- `client_uri`: URL of the client's homepage
- `logo_uri`: URL of the client's logo
- `scope`: Space-separated list of requested scopes
- `grant_types`: Array of grant types (`authorization_code`, `refresh_token`)
- `token_endpoint_auth_method`: Authentication method for token endpoint (`client_secret_basic`, `client_secret_post`, `none`)
- `response_types`: Array of response types (only `code` is supported)
- `tos_uri`: URL of the client's terms of service
- `policy_uri`: URL of the client's privacy policy
- `software_id`: Identifier for the client software
- `software_version`: Version of the client software
- `contacts`: Array of email addresses for client administrators

#### Response

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "client_id": "client-12345",
  "client_secret": "secret-12345",
  "client_id_issued_at": 1591620373,
  "client_secret_expires_at": 0,
  "registration_access_token": "reg-token-12345",
  "registration_client_uri": "https://api.example.com/oauth/register/client-12345",
  "redirect_uris": ["https://client.example.com/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_method": "client_secret_basic",
  "response_types": ["code"],
  "client_name": "Example Client",
  "client_uri": "https://client.example.com",
  "logo_uri": "https://client.example.com/logo.png",
  "scope": "badge:read profile:read"
}
```

#### Error Responses

- `400 Bad Request`: Invalid request parameters
- `500 Internal Server Error`: Server error

## Authorization Endpoint

### GET /oauth/authorize

Initiates the authorization code flow.

#### Request

```http
GET /oauth/authorize?response_type=code&client_id=client-12345&redirect_uri=https://client.example.com/callback&scope=badge:read%20profile:read&state=random-state HTTP/1.1
```

#### Required Parameters

- `response_type`: Must be `code`
- `client_id`: Client identifier
- `redirect_uri`: Redirect URI registered with the client

#### Optional Parameters

- `scope`: Space-separated list of requested scopes
- `state`: Opaque value used for CSRF protection

#### Response

The authorization endpoint will display a consent page to the user. After the user makes a decision, they will be redirected to the `redirect_uri` with either:

**Success:**
```
https://client.example.com/callback?code=auth-code-12345&state=random-state
```

**Error:**
```
https://client.example.com/callback?error=access_denied&error_description=The+user+denied+the+authorization+request&state=random-state
```

### POST /oauth/authorize

Handles the user's authorization decision.

#### Request

```http
POST /oauth/authorize HTTP/1.1
Content-Type: application/x-www-form-urlencoded

client_id=client-12345&
redirect_uri=https://client.example.com/callback&
scope=badge:read%20profile:read&
state=random-state&
response_type=code&
user_decision=approve
```

#### Required Parameters

- `client_id`: Client identifier
- `redirect_uri`: Redirect URI registered with the client
- `response_type`: Must be `code`
- `user_decision`: User's decision (`approve` or `deny`)

#### Optional Parameters

- `scope`: Space-separated list of requested scopes
- `state`: Opaque value used for CSRF protection

#### Response

The user will be redirected to the `redirect_uri` with either a code or an error, as described in the GET response.

## Token Endpoint

### POST /oauth/token

Exchange an authorization code for tokens or refresh an access token.

#### Authorization Code Grant

```http
POST /oauth/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=auth-code-12345&
redirect_uri=https://client.example.com/callback&
client_id=client-12345&
client_secret=secret-12345
```

#### Required Parameters

- `grant_type`: Must be `authorization_code`
- `code`: Authorization code received from the authorization endpoint
- `redirect_uri`: Must match the redirect URI used in the authorization request
- `client_id`: Client identifier
- `client_secret`: Client secret

#### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "access-token-12345",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh-token-12345",
  "scope": "badge:read profile:read"
}
```

#### Refresh Token Grant

```http
POST /oauth/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token=refresh-token-12345&
client_id=client-12345&
client_secret=secret-12345&
scope=badge:read
```

#### Required Parameters

- `grant_type`: Must be `refresh_token`
- `refresh_token`: Refresh token received from a previous token response
- `client_id`: Client identifier
- `client_secret`: Client secret

#### Optional Parameters

- `scope`: Space-separated list of requested scopes (must be equal to or a subset of the original scopes)

#### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "new-access-token-12345",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "badge:read"
}
```

#### Error Responses

- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Invalid client credentials or token
- `500 Internal Server Error`: Server error

## Token Introspection

### POST /oauth/introspect

Introspect a token to determine its validity and metadata.

#### Request

```http
POST /oauth/introspect HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer client-12345

token=access-token-12345
```

#### Required Parameters

- `token`: The token to introspect

#### Response (Active Token)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "active": true,
  "client_id": "client-12345",
  "scope": "badge:read profile:read",
  "token_type": "Bearer",
  "exp": 1591623973,
  "iat": 1591620373,
  "sub": "user-12345",
  "jti": "token-id-12345"
}
```

#### Response (Inactive Token)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "active": false
}
```

#### Error Responses

- `401 Unauthorized`: Invalid client credentials
- `500 Internal Server Error`: Server error

## Token Revocation

### POST /oauth/revoke

Revoke an access token or refresh token.

#### Request

```http
POST /oauth/revoke HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Authorization: Basic Y2xpZW50LTEyMzQ1OnNlY3JldC0xMjM0NQ==

token=access-token-12345&
token_type_hint=access_token
```

#### Required Parameters

- `token`: The token to revoke

#### Optional Parameters

- `token_type_hint`: Type of the token (`access_token` or `refresh_token`)

#### Response

```http
HTTP/1.1 200 OK
```

The revocation endpoint always returns a 200 OK response, regardless of whether the token was valid or already revoked.

#### Error Responses

- `401 Unauthorized`: Invalid client credentials
- `500 Internal Server Error`: Server error

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "invalid_request",
  "error_description": "The request is missing a required parameter"
}
```

### 401 Unauthorized

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "invalid_client",
  "error_description": "Client authentication failed"
}
```

### 500 Internal Server Error

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": "server_error",
  "error_description": "An unexpected error occurred"
}
```

## Example OAuth Flow

1. Register a client
2. Redirect the user to the authorization endpoint
3. User approves the authorization request
4. Exchange the authorization code for tokens
5. Use the access token to make API requests
6. Refresh the access token when it expires
7. Revoke tokens when they are no longer needed

See the [example OAuth client](../../examples/oauth-client.js) for a complete implementation of this flow. 