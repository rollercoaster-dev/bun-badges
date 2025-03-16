# Bun Badges API Documentation

## Authentication

### Authentication Endpoints

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| POST | `/auth/code/request` | Request an authentication code | No |
| POST | `/auth/code/verify` | Verify an authentication code and get JWT tokens | No |
| POST | `/auth/token/refresh` | Refresh an access token using a refresh token | No |
| POST | `/auth/token/revoke` | Revoke a token | No |

### JWT Authentication

Most mutation operations (POST, PUT, DELETE) on badge and assertion endpoints require authentication.

To authenticate:
1. Obtain a JWT token via the authentication endpoints
2. Include the token in the `Authorization` header: `Authorization: Bearer YOUR_TOKEN`

## Badge Management

### Badge Class Endpoints

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| GET | `/api/badges` | List all badge classes | No |
| GET | `/api/badges?issuerId={issuerId}` | List badges for a specific issuer | No |
| GET | `/api/badges/{id}` | Get a specific badge class | No |
| POST | `/api/badges` | Create a new badge class | **Yes** |
| PUT | `/api/badges/{id}` | Update a badge class | **Yes** |
| DELETE | `/api/badges/{id}` | Delete a badge class | **Yes** |
| GET | `/api/badges/bake/:badgeId/:assertionId` | Bake assertion data into badge image | No |
| POST | `/api/badges/extract` | Extract assertion data from a baked badge | No |

### Badge Assertion Endpoints

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| GET | `/api/assertions` | List all badge assertions | No |
| GET | `/api/assertions?badgeId={badgeId}` | List assertions for a specific badge | No |
| GET | `/api/assertions/{id}` | Get a specific badge assertion | No |
| POST | `/api/assertions` | Issue a badge to a recipient | **Yes** |
| POST | `/api/assertions/{id}/revoke` | Revoke a badge assertion | **Yes** |

## OAuth Endpoints

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| POST | `/oauth/register` | Register a new OAuth client | No |
| GET/POST | `/oauth/authorize` | Authorization endpoint | No |
| POST | `/oauth/token` | Token endpoint | No |
| POST | `/oauth/introspect` | Token introspection | No |
| POST | `/oauth/revoke` | Token revocation | No |

## Utility Endpoints

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| GET | `/` | API information | No |
| GET | `/health` | Health check | No |

## Request/Response Examples

### Creating a Badge Class (Authenticated)

**Request:**
```http
POST /api/badges
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "issuerId": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Code Ninja",
  "description": "Awarded for exceptional programming skills",
  "criteria": "Complete 10 complex coding challenges",
  "imageUrl": "https://example.com/badges/code-ninja.png"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "badgeId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Code Ninja",
    "description": "Awarded for exceptional programming skills",
    "criteria": "Complete 10 complex coding challenges",
    "imageUrl": "https://example.com/badges/code-ninja.png",
    "issuerId": "550e8400-e29b-41d4-a716-446655440001",
    "createdAt": "2023-03-16T12:00:00Z"
  }
}
```

### Issuing a Badge (Authenticated)

**Request:**
```http
POST /api/assertions
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "badgeId": "550e8400-e29b-41d4-a716-446655440000",
  "recipient": {
    "type": "email",
    "identity": "recipient@example.com",
    "hashed": true
  },
  "evidence": "https://example.com/evidence"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "assertionId": "550e8400-e29b-41d4-a716-446655440010",
    "badgeId": "550e8400-e29b-41d4-a716-446655440000",
    "issuedOn": "2023-03-16T12:30:00Z",
    "recipient": {
      "type": "email",
      "identity": "sha256$a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
      "hashed": true,
      "salt": "abcd1234"
    },
    "evidence": "https://example.com/evidence"
  }
}
```

## Error Responses

All endpoints use consistent error formatting:

```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

Common error codes:
- `VALIDATION` - Invalid or missing parameters
- `NOT_FOUND` - Requested resource does not exist
- `UNAUTHORIZED` - Authentication required or invalid credentials
- `FORBIDDEN` - Valid authentication but insufficient permissions
- `CONFLICT` - Cannot perform operation due to resource state
- `SERVER_ERROR` - Unexpected server error

## Badge Baking

Badge baking refers to the practice of embedding Open Badges metadata directly into image files, allowing the badge to be verified even when disconnected from the server.

### Baking a Badge

**Request:**
```http
GET /api/badges/bake/550e8400-e29b-41d4-a716-446655440000/550e8400-e29b-41d4-a716-446655440010
```

**Response:**
The response will be the badge image file (PNG or SVG) with embedded assertion data.
Content-Type will be either `image/png` or `image/svg+xml` depending on the original badge format.

### Extracting Badge Data

**Request:**
```http
POST /api/badges/extract
Content-Type: multipart/form-data

Form data:
- badge: [file upload]
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "assertion": {
      "@context": "https://w3id.org/openbadges/v2",
      "type": "Assertion",
      "id": "https://example.com/assertions/550e8400-e29b-41d4-a716-446655440010",
      "recipient": {
        "type": "email",
        "identity": "sha256$a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
        "hashed": true,
        "salt": "abcd1234"
      },
      "badge": "https://example.com/badges/550e8400-e29b-41d4-a716-446655440000",
      "issuedOn": "2023-03-16T12:30:00Z",
      "verification": {
        "type": "hosted"
      }
    },
    "format": "SVG"
  }
}
``` 