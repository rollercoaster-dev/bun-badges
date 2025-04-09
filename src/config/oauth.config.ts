import { env } from "../utils/env";

/**
 * OAuth 2.0 Configuration
 * Based on Open Badges 3.0 specification requirements
 */
export const oauthConfig = {
  // Authorization server configuration
  authorizationServer: {
    // The base URL of the authorization server
    baseUrl: env.OAUTH_SERVER_URL || "http://localhost:3000",
    // The authorization endpoint
    authorizationEndpoint: "/oauth/authorize",
    // The token endpoint
    tokenEndpoint: "/oauth/token",
    // The registration endpoint
    registrationEndpoint: "/oauth/register",
    // The revocation endpoint
    revocationEndpoint: "/oauth/revoke",
    // The introspection endpoint
    introspectionEndpoint: "/oauth/introspect",
    // The JWKS endpoint for public keys
    jwksEndpoint: "/oauth/jwks",
  },

  // Client configuration
  client: {
    // Default client registration settings
    defaultRegistration: {
      // The client name
      clientName: "Open Badges Client",
      // The client URI
      clientUri: env.CLIENT_URI || "http://localhost:3000",
      // The redirect URIs
      redirectUris: [env.REDIRECT_URI || "http://localhost:3000/callback"],
      // The logo URI
      logoUri: env.LOGO_URI || "http://localhost:3000/logo.png",
      // The client scope
      scope: "openid profile email",
      // The token endpoint auth method
      tokenEndpointAuthMethod: "client_secret_basic",
      // The grant types
      grantTypes: ["authorization_code", "refresh_token"],
      // The response types
      responseTypes: ["code"],
    },
  },

  // Token configuration
  token: {
    // Access token expiration time in seconds (default: 1 hour)
    accessTokenExpiresIn: parseInt(env.ACCESS_TOKEN_EXPIRES_IN || "3600", 10),
    // Refresh token expiration time in seconds (default: 30 days)
    refreshTokenExpiresIn: parseInt(
      env.REFRESH_TOKEN_EXPIRES_IN || "2592000",
      10,
    ),
    // JWT signing algorithm
    jwtAlgorithm: "RS256",
    // JWT issuer
    jwtIssuer: env.JWT_ISSUER || "http://localhost:3000",
    // JWT audience
    jwtAudience: env.JWT_AUDIENCE || "http://localhost:3000",
  },

  // Scopes configuration
  scopes: {
    // Available scopes
    available: [
      "openid",
      "profile",
      "email",
      "ob:credentials:read",
      "ob:credentials:create",
      "ob:profile:read",
      "ob:profile:write",
    ],
    // Scope descriptions
    descriptions: {
      openid: "OpenID Connect authentication",
      profile: "Access to profile information",
      email: "Access to email address",
      "ob:credentials:read": "Read Open Badges credentials",
      "ob:credentials:create": "Create Open Badges credentials",
      "ob:profile:read": "Read Open Badges profile",
      "ob:profile:write": "Update Open Badges profile",
    },
  },
};
