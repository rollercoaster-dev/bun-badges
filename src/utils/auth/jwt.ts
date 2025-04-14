import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";

// In production, these should be loaded from environment variables
const JWT_EXPIRES_IN = "24h";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

// Removed in-memory store for revoked tokens
// const revokedTokens = new Map<string, number>();

// Removed interval cleanup for in-memory store
// setInterval(() => {
//   const now = Date.now();
//   for (const [token, expiry] of revokedTokens.entries()) {
//     if (expiry < now) {
//       revokedTokens.delete(token);
//     }
//   }
// }, 3600000); // Clean up every hour

export interface JWTPayload {
  sub: string; // username or user ID
  iat?: number; // issued at
  exp?: number; // expires at
  type?: "access" | "refresh" | "registration" | "verification"; // token type
  jti?: string; // JWT ID
  scope?: string; // permissions scope
  // Additional claims for Open Badges 3.0 support
  email?: string; // user email
  name?: string; // user name
  [key: string]: unknown; // Allow additional claims with unknown type
}

// Secret key for JWT signing
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  const errorMsg = "JWT_SECRET environment variable is not set.";
  // Log error appropriately if logger is available/imported here, otherwise just throw
  // logger.error(errorMsg);
  throw new Error(errorMsg);
}

const SECRET = new TextEncoder().encode(jwtSecret);

// Token types and their expiration times (in seconds)
const TOKEN_EXPIRATION = {
  access: 60 * 60, // 1 hour
  refresh: 30 * 24 * 60 * 60, // 30 days
  registration: 7 * 24 * 60 * 60, // 7 days
  verification: 10 * 60, // 10 minutes
};

// Generate a JWT token
export async function generateToken(payload: {
  sub: string;
  type: keyof typeof TOKEN_EXPIRATION;
  scope?: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
}): Promise<string> {
  const jwtId = nanoid();
  const expiration = TOKEN_EXPIRATION[payload.type];

  return new SignJWT({
    ...payload,
    jti: jwtId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiration)
    .setIssuer("bun-badges")
    .setAudience("bun-badges-clients")
    .sign(SECRET);
}

// Verify a JWT token
export async function verifyToken(
  token: string,
  tokenType: "access" | "refresh" = "access",
): Promise<
  JWTPayload & {
    sub: string;
    jti: string;
    exp: number;
    iat: number;
  }
> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      issuer: "bun-badges",
      audience: "bun-badges-clients",
    });

    // Verify token type if specified
    if (tokenType && payload.type && payload.type !== tokenType) {
      throw new Error(
        `Invalid token type: expected ${tokenType}, got ${payload.type}`,
      );
    }

    return {
      sub: payload.sub as string,
      type: payload.type as
        | "access"
        | "refresh"
        | "registration"
        | "verification",
      scope: payload.scope as string | undefined,
      jti: payload.jti as string,
      exp: payload.exp as number,
      iat: payload.iat as number,
      ...payload, // Include all other claims
    };
  } catch {
    throw new Error("Invalid token");
  }
}

export function getTokenExpirySeconds(
  type: "access" | "refresh" = "access",
): number {
  const duration =
    type === "access" ? JWT_EXPIRES_IN : REFRESH_TOKEN_EXPIRES_IN;
  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) throw new Error("Invalid expiry format");

  const [, value, unit] = match;
  const multipliers = { d: 86400, h: 3600, m: 60, s: 1 };
  return parseInt(value) * multipliers[unit as keyof typeof multipliers];
}
