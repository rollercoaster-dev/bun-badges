import { SignJWT, jwtVerify } from 'jose';
import { createSecretKey } from 'crypto';

// In production, these should be loaded from environment variables
const JWT_SECRET = 'development-secret-key-change-me-in-production';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

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
  sub: string;  // username
  iat?: number; // issued at
  exp?: number; // expires at
  type?: 'access' | 'refresh'; // token type
  jti?: string; // JWT ID
}

export async function generateToken(username: string, type: 'access' | 'refresh' = 'access'): Promise<string> {
  const secretKey = createSecretKey(Buffer.from(JWT_SECRET));
  const expiresIn = type === 'access' ? JWT_EXPIRES_IN : REFRESH_TOKEN_EXPIRES_IN;
  
  const token = await new SignJWT({ sub: username, type })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setJti(crypto.randomUUID()) // Add unique identifier
    .sign(secretKey);
    
  return token;
}

export async function verifyToken(token: string, expectedType?: 'access' | 'refresh'): Promise<JWTPayload> {
  const secretKey = createSecretKey(Buffer.from(JWT_SECRET));
  
  try {
    // Check if token is revoked
    if (revokedTokens.has(token)) {
      throw new Error('Token has been revoked');
    }

    const { payload } = await jwtVerify(token, secretKey);
    const jwtPayload = payload as JWTPayload;

    // Verify token type if expected type is provided
    if (expectedType && jwtPayload.type !== expectedType) {
      throw new Error(`Invalid token type: expected ${expectedType}`);
    }

    return jwtPayload;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Invalid token');
  }
}

export function getTokenExpirySeconds(type: 'access' | 'refresh' = 'access'): number {
  const duration = type === 'access' ? JWT_EXPIRES_IN : REFRESH_TOKEN_EXPIRES_IN;
  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) throw new Error('Invalid expiry format');
  
  const [, value, unit] = match;
  const multipliers = { d: 86400, h: 3600, m: 60, s: 1 };
  return parseInt(value) * multipliers[unit as keyof typeof multipliers];
}

export async function revokeToken(token: string): Promise<void> {
  try {
    // Verify the token first to ensure it's valid and get its expiry
    const payload = await verifyToken(token);
    if (!payload.exp) {
      throw new Error('Token has no expiry');
    }

    // Store the token in revoked tokens until its original expiry
    revokedTokens.set(token, payload.exp * 1000);
  } catch (error) {
    // If token is invalid or already revoked, we can ignore
    if (error instanceof Error && error.message === 'Token has been revoked') {
      return;
    }
    throw error;
  }
}

export function isTokenRevoked(token: string): boolean {
  return revokedTokens.has(token);
} 