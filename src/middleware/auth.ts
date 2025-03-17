import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { verify } from "hono/jwt";
import { RateLimiter } from "./rate-limiter";

// Role-based access control
export enum Role {
  ADMIN = "ADMIN",
  ISSUER_ADMIN = "ISSUER_ADMIN",
  ISSUER_OWNER = "ISSUER_OWNER",
  ISSUER_VIEWER = "ISSUER_VIEWER",
}

// JWT payload structure
export interface JWTPayload {
  sub: string; // User ID
  roles: Role[];
  organizationId?: string;
  exp: number;
}

// Authenticated user information
export interface AuthUser {
  id: string;
  roles: Role[];
  organizationId?: string;
}

// Error messages
const AUTH_ERRORS = {
  INVALID_TOKEN: "Invalid or expired token",
  MISSING_TOKEN: "Authentication required",
  INSUFFICIENT_PERMISSIONS: "Insufficient permissions",
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded",
} as const;

// Rate limiters for different access levels
const publicLimiter = new RateLimiter({
  max: 100, // requests
  period: 60 * 60 * 1000, // 1 hour in milliseconds
});

const authenticatedLimiter = new RateLimiter({
  max: 1000,
  period: 60 * 60 * 1000,
});

const adminLimiter = new RateLimiter({
  max: 5000,
  period: 60 * 60 * 1000,
});

// Helper to check if user has required role
function hasRole(user: AuthUser, requiredRole: Role): boolean {
  if (user.roles.includes(Role.ADMIN)) return true;
  return user.roles.includes(requiredRole);
}

// Helper to check if user owns a resource
function isResourceOwner(user: AuthUser, ownerId: string): boolean {
  return user.id === ownerId;
}

// Basic authentication middleware
export async function requireAuth(
  c: Context,
  next: Next,
  options: { rateLimit?: boolean } = {},
): Promise<void> {
  try {
    // Check rate limit for public access
    if (options.rateLimit) {
      const ip = c.req.header("x-forwarded-for") || "unknown";
      const isRateLimited = await publicLimiter.isLimited(ip);
      if (isRateLimited) {
        throw new HTTPException(429, {
          message: AUTH_ERRORS.RATE_LIMIT_EXCEEDED,
        });
      }
    }

    // Get token from Authorization header
    const token = c.req.header("Authorization")?.split(" ")[1];
    if (!token) {
      throw new HTTPException(401, { message: AUTH_ERRORS.MISSING_TOKEN });
    }

    // Verify JWT and validate payload structure
    const payload = await verify(token, process.env.JWT_SECRET || "");

    // Type guard to validate JWT payload
    if (!isValidJWTPayload(payload)) {
      throw new HTTPException(401, { message: AUTH_ERRORS.INVALID_TOKEN });
    }

    const user: AuthUser = {
      id: payload.sub,
      roles: payload.roles,
      organizationId: payload.organizationId,
    };

    // Add user to context
    c.set("user", user);

    // Check rate limit for authenticated users
    if (options.rateLimit) {
      const isAdmin = user.roles.includes(Role.ADMIN);
      const limiter = isAdmin ? adminLimiter : authenticatedLimiter;
      const isRateLimited = await limiter.isLimited(user.id);
      if (isRateLimited) {
        throw new HTTPException(429, {
          message: AUTH_ERRORS.RATE_LIMIT_EXCEEDED,
        });
      }
    }

    await next();
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    throw new HTTPException(401, { message: AUTH_ERRORS.INVALID_TOKEN });
  }
}

// Type guard for JWT payload
function isValidJWTPayload(payload: unknown): payload is JWTPayload {
  if (typeof payload !== "object" || !payload) return false;

  const p = payload as Record<string, unknown>;

  if (typeof p.sub !== "string") return false;
  if (!Array.isArray(p.roles)) return false;
  if (
    !p.roles.every(
      (role) =>
        typeof role === "string" && Object.values(Role).includes(role as Role),
    )
  )
    return false;
  if (p.organizationId !== undefined && typeof p.organizationId !== "string")
    return false;
  if (typeof p.exp !== "number") return false;

  return true;
}

// Role-based authorization middleware
export function requireRole(role: Role) {
  return async function roleMiddleware(c: Context, next: Next): Promise<void> {
    const user = c.get("user") as AuthUser;
    if (!hasRole(user, role)) {
      throw new HTTPException(403, {
        message: AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
      });
    }
    await next();
  };
}

// Resource ownership middleware
export function requireOwnership(getOwnerId: (c: Context) => Promise<string>) {
  return async function ownershipMiddleware(
    c: Context,
    next: Next,
  ): Promise<void> {
    const user = c.get("user") as AuthUser;
    const ownerId = await getOwnerId(c);

    // Allow if user is admin or issuer admin
    if (
      user.roles.includes(Role.ADMIN) ||
      user.roles.includes(Role.ISSUER_ADMIN)
    ) {
      await next();
      return;
    }

    // Check ownership
    if (!isResourceOwner(user, ownerId)) {
      throw new HTTPException(403, {
        message: AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
      });
    }

    await next();
  };
}

// Combine multiple middleware functions
export function combineMiddleware(
  ...middleware: ((c: Context, next: Next) => Promise<void>)[]
) {
  return async function combinedMiddleware(
    c: Context,
    next: Next,
  ): Promise<void> {
    const executeMiddleware = async (index: number): Promise<void> => {
      if (index === middleware.length) {
        await next();
        return;
      }
      await middleware[index](c, () => executeMiddleware(index + 1));
    };
    await executeMiddleware(0);
  };
}
