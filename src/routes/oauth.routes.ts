import { Hono } from "hono";
import { Context } from "hono";

// OAuth scopes for Open Badges 3.0
export const OAUTH_SCOPES = {
  // OpenID Connect scopes
  OPENID: "openid",
  PROFILE: "profile",
  EMAIL: "email",

  // Open Badges specific scopes
  CREDENTIALS_READ: "ob:credentials:read",
  CREDENTIALS_CREATE: "ob:credentials:create",
  PROFILE_READ: "ob:profile:read",
  PROFILE_WRITE: "ob:profile:write",

  // Legacy scopes (for backward compatibility)
  BADGE_CREATE: "badge:create",
  BADGE_UPDATE: "badge:update",
  BADGE_DELETE: "badge:delete",
  BADGE_READ: "badge:read",
  ASSERTION_CREATE: "assertion:create",
  ASSERTION_UPDATE: "assertion:update",
  ASSERTION_DELETE: "assertion:delete",
  ASSERTION_READ: "assertion:read",
  LEGACY_PROFILE_READ: "profile:read",
  LEGACY_PROFILE_UPDATE: "profile:update",

  // Special scopes
  OFFLINE_ACCESS: "offline_access", // For refresh tokens
} as const;

// Scope descriptions for service discovery
export const OAUTH_SCOPE_DESCRIPTIONS: Record<string, string> = {
  openid: "OpenID Connect authentication",
  profile: "Access to profile information",
  email: "Access to email address",
  "ob:credentials:read": "Read Open Badges credentials",
  "ob:credentials:create": "Create Open Badges credentials",
  "ob:profile:read": "Read Open Badges profile",
  "ob:profile:write": "Update Open Badges profile",
  offline_access: "Access your data when you're not using the app",

  // Legacy scope descriptions
  "badge:create": "Create badges on your behalf",
  "badge:update": "Update your badges",
  "badge:delete": "Delete your badges",
  "badge:read": "View your badges",
  "assertion:create": "Issue badge assertions on your behalf",
  "assertion:update": "Update your badge assertions",
  "assertion:delete": "Delete your badge assertions",
  "assertion:read": "View your badge assertions",
  "profile:read": "View your basic profile information",
  "profile:update": "Update your profile information",
};

// OAuth endpoint paths for Open Badges 3.0
export const OAUTH_ROUTES = {
  // Dynamic client registration
  REGISTER: "/register",

  // Authorization endpoints
  AUTHORIZE: "/authorize",
  TOKEN: "/token",

  // Token management
  INTROSPECT: "/introspect",
  REVOKE: "/revoke",

  // Service discovery
  SERVICE_DESCRIPTION: "/",
  JWKS: "/jwks",

  // Open Badges API endpoints
  CREDENTIALS: "/credentials",
  PROFILE: "/profile",
} as const;

// Create OAuth router with dependency injection for the controller
export const createOAuthRouter = (controller: {
  registerClient: (c: Context) => Promise<Response>;
  authorize: (c: Context) => Promise<Response>;
  token: (c: Context) => Promise<Response>;
  introspect: (c: Context) => Promise<Response>;
  revoke: (c: Context) => Promise<Response>;
  getServiceDescription?: (c: Context) => Promise<Response>;
  getJwks?: (c: Context) => Promise<Response>;
}) => {
  const oauth = new Hono();

  // Client registration endpoint
  oauth.post(OAUTH_ROUTES.REGISTER, (c) => controller.registerClient(c));

  // Authorization endpoints
  oauth.get(OAUTH_ROUTES.AUTHORIZE, (c) => controller.authorize(c));
  oauth.post(OAUTH_ROUTES.AUTHORIZE, (c) => controller.authorize(c));

  // Token endpoint
  oauth.post(OAUTH_ROUTES.TOKEN, (c) => controller.token(c));

  // Token introspection
  oauth.post(OAUTH_ROUTES.INTROSPECT, (c) => controller.introspect(c));

  // Token revocation
  oauth.post(OAUTH_ROUTES.REVOKE, (c) => controller.revoke(c));

  // Service discovery endpoints
  if (controller.getServiceDescription) {
    oauth.get(OAUTH_ROUTES.SERVICE_DESCRIPTION, (c) =>
      controller.getServiceDescription!(c),
    );
  }

  // JWKS endpoint for public keys
  if (controller.getJwks) {
    oauth.get(OAUTH_ROUTES.JWKS, (c) => controller.getJwks!(c));
  }

  return oauth;
};
