# PKCE (Proof Key for Code Exchange) Implementation

## Overview

PKCE (RFC 7636) is implemented to enhance the security of the OAuth 2.0 authorization code flow, particularly for public clients such as mobile and single-page applications. This implementation requires PKCE for all public clients and optionally supports it for confidential clients.

## Implementation Details

### Supported Methods

- `plain`: Direct comparison of code verifier and challenge (not recommended)
- `S256`: SHA-256 hash of code verifier (recommended)

### Client Types

- **Public Clients**: PKCE is required (e.g., SPA, mobile apps)
- **Confidential Clients**: PKCE is optional but recommended

## Usage

### 1. Generate Code Verifier

The code verifier should be a random string using the characters [A-Z], [a-z], [0-9], "-", ".", "_", and "~", with a minimum length of 43 characters and a maximum length of 128 characters.

Example:
```javascript
function generateCodeVerifier() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const length = 64; // Recommended length
    let result = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
        result += chars[randomValues[i] % chars.length];
    }
    return result;
}
```

### 2. Generate Code Challenge

For S256 method (recommended):
```javascript
async function generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
```

### 3. Authorization Request

Add the following parameters to your authorization request:

```
GET /oauth/authorize
    ?response_type=code
    &client_id=YOUR_CLIENT_ID
    &redirect_uri=YOUR_REDIRECT_URI
    &code_challenge=YOUR_CODE_CHALLENGE
    &code_challenge_method=S256
```

### 4. Token Request

When exchanging the authorization code for tokens, include the original code verifier:

```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTHORIZATION_CODE
&redirect_uri=YOUR_REDIRECT_URI
&client_id=YOUR_CLIENT_ID
&code_verifier=YOUR_CODE_VERIFIER
```

## Error Responses

### Authorization Endpoint

- **Missing PKCE for Public Clients**
  ```json
  {
    "error": "invalid_request",
    "error_description": "PKCE is required for public clients"
  }
  ```

- **Invalid Code Challenge Method**
  ```json
  {
    "error": "invalid_request",
    "error_description": "Unsupported code challenge method"
  }
  ```

### Token Endpoint

- **Missing Code Verifier**
  ```json
  {
    "error": "invalid_request",
    "error_description": "Code verifier required for PKCE flow"
  }
  ```

- **Invalid Code Verifier**
  ```json
  {
    "error": "invalid_grant",
    "error_description": "Invalid code verifier"
  }
  ```

## Security Considerations

1. Always use the `S256` method instead of `plain`
2. Ensure code verifier has sufficient entropy
3. Store code verifier securely on the client
4. Never transmit code verifier in authorization request
5. Validate all PKCE parameters server-side

## Example Implementation

### Client-Side (TypeScript)
```typescript
async function initiateOAuthFlow() {
    // Generate and store code verifier
    const codeVerifier = generateCodeVerifier();
    sessionStorage.setItem('code_verifier', codeVerifier);
    
    // Generate code challenge
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Construct authorization URL
    const authUrl = new URL('/oauth/authorize', window.location.origin);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', 'YOUR_CLIENT_ID');
    authUrl.searchParams.set('redirect_uri', 'YOUR_REDIRECT_URI');
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    
    // Redirect to authorization endpoint
    window.location.href = authUrl.toString();
}

async function handleCallback() {
    // Get authorization code from URL
    const code = new URLSearchParams(window.location.search).get('code');
    
    // Get stored code verifier
    const codeVerifier = sessionStorage.getItem('code_verifier');
    
    // Exchange code for tokens
    const response = await fetch('/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: 'YOUR_REDIRECT_URI',
            client_id: 'YOUR_CLIENT_ID',
            code_verifier: codeVerifier,
        }),
    });
    
    const tokens = await response.json();
    // Handle tokens...
}
```

## Testing

Use the provided test suite to verify PKCE implementation:

```bash
bun test tests/integration/oauth-pkce.test.ts
``` 