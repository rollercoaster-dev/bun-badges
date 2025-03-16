export const AUTH_ROUTES = {
  REQUEST_CODE: '/auth/code/request',
  VERIFY_CODE: '/auth/code/verify',
  REFRESH_TOKEN: '/auth/token/refresh',
  REVOKE_TOKEN: '/auth/token/revoke',
} as const;

export const BADGE_ROUTES = {
  CREATE: '/badges',
  GET: '/badges/:id',
  LIST: '/badges',
  UPDATE: '/badges/:id',
  DELETE: '/badges/:id',
  VERIFY: '/badges/:id/verify',
  BAKE_BADGE: '/badges/bake/:badgeId/:assertionId',
  EXTRACT_BADGE: '/badges/extract',
} as const;

export const ISSUER_ROUTES = {
  CREATE: '/issuers',
  GET: '/issuers/:id',
  LIST: '/issuers',
  UPDATE: '/issuers/:id',
  DELETE: '/issuers/:id',
  VERIFY: '/issuers/:id/verify',
} as const; 