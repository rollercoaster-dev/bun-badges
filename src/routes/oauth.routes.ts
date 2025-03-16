import { Hono } from 'hono';
import { Context } from 'hono';

// OAuth scopes for Open Badges
export const OAUTH_SCOPES = {
  // Badge issuer scopes
  BADGE_CREATE: 'badge:create',
  BADGE_UPDATE: 'badge:update',
  BADGE_DELETE: 'badge:delete',
  BADGE_READ: 'badge:read',
  
  // Badge assertion scopes
  ASSERTION_CREATE: 'assertion:create',
  ASSERTION_UPDATE: 'assertion:update',
  ASSERTION_DELETE: 'assertion:delete',
  ASSERTION_READ: 'assertion:read',
  
  // Profile scopes
  PROFILE_READ: 'profile:read',
  PROFILE_UPDATE: 'profile:update',
  
  // Special scopes
  OFFLINE_ACCESS: 'offline_access', // For refresh tokens
} as const;

// OAuth endpoint paths
export const OAUTH_ROUTES = {
  // Dynamic client registration
  REGISTER: '/register',
  
  // Authorization endpoints
  AUTHORIZE: '/authorize',
  TOKEN: '/token',
  
  // Token management
  INTROSPECT: '/introspect',
  REVOKE: '/revoke',
} as const;

// Create OAuth router with dependency injection for the controller
export const createOAuthRouter = (controller: {
  registerClient: (c: Context) => Promise<any>;
  authorize: (c: Context) => Promise<any>;
  token: (c: Context) => Promise<any>;
  introspect: (c: Context) => Promise<any>;
  revoke: (c: Context) => Promise<any>;
}) => {
  const oauth = new Hono();

  // Client registration endpoint
  oauth.post(OAUTH_ROUTES.REGISTER, (c) => controller.registerClient(c));

  // Authorization endpoints
  oauth.get(OAUTH_ROUTES.AUTHORIZE, (c) => controller.authorize(c));
  oauth.post(OAUTH_ROUTES.AUTHORIZE, (c) => controller.authorize(c));
  oauth.post(OAUTH_ROUTES.TOKEN, (c) => controller.token(c));

  // Token management endpoints
  oauth.post(OAUTH_ROUTES.INTROSPECT, (c) => controller.introspect(c));
  oauth.post(OAUTH_ROUTES.REVOKE, (c) => controller.revoke(c));

  return oauth;
}; 