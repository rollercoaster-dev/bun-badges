import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";

// In production, these should be loaded from environment variables
const JWT_EXPIRES_IN = "24h";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

// In-memory store for revoked tokens (replace with database in production)
const revokedTokens = new Map<string, number>();

// Clean up expired entries from revoked tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of revokedTokens.entries()) {
    if (expiry < now) {
      revokedTokens.delete(token);
    }
  }
}, 3600000); // Clean up every hour

export interface JWTPayload {
  sub: string; // username
  iat?: number; // issued at
  exp?: number; // expires at
  type?: "access" | "refresh"; // token type
  jti?: string; // JWT ID
}

// Secret key for JWT signing
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-secret-change-me",
);

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
): Promise<{
  sub: string;
  type: string;
  scope?: string;
  jti: string;
  exp: number;
  iat: number;
}> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      issuer: "bun-badges",
      audience: "bun-badges-clients",
    });

    // Verify token type if specified
    if (tokenType && payload.type !== tokenType) {
      throw new Error(
        `Invalid token type: expected ${tokenType}, got ${payload.type}`,
      );
    }

    return {
      sub: payload.sub as string,
      type: payload.type as string,
      scope: payload.scope as string | undefined,
      jti: payload.jti as string,
      exp: payload.exp as number,
      iat: payload.iat as number,
    };
  } catch (error) {
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

export async function revokeToken(token: string): Promise<void> {
  try {
    // Verify the token first to ensure it's valid and get its expiry
    const payload = await verifyToken(token);
    if (!payload.exp) {
      throw new Error("Token has no expiry");
    }

    // Store the token in revoked tokens until its original expiry
    revokedTokens.set(token, payload.exp * 1000);
  } catch (error) {
    // If token is invalid or already revoked, we can ignore
    if (error instanceof Error && error.message === "Token has been revoked") {
      return;
    }
    throw error;
  }
}

export function isTokenRevoked(token: string): boolean {
  return revokedTokens.has(token);
}
