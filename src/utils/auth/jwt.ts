import { SignJWT, jwtVerify } from 'jose';
import { createSecretKey } from 'crypto';

// In production, these should be loaded from environment variables
const JWT_SECRET = 'development-secret-key-change-me-in-production';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export interface JWTPayload {
  sub: string;  // username
  iat?: number; // issued at
  exp?: number; // expires at
  type?: 'access' | 'refresh'; // token type
}

export async function generateToken(username: string, type: 'access' | 'refresh' = 'access'): Promise<string> {
  const secretKey = createSecretKey(Buffer.from(JWT_SECRET));
  const expiresIn = type === 'access' ? JWT_EXPIRES_IN : REFRESH_TOKEN_EXPIRES_IN;
  
  const token = await new SignJWT({ sub: username, type })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
    
  return token;
}

export async function verifyToken(token: string, expectedType?: 'access' | 'refresh'): Promise<JWTPayload> {
  const secretKey = createSecretKey(Buffer.from(JWT_SECRET));
  
  try {
    const { payload } = await jwtVerify(token, secretKey);
    const jwtPayload = payload as JWTPayload;

    // Verify token type if expected type is provided
    if (expectedType && jwtPayload.type !== expectedType) {
      throw new Error(`Invalid token type: expected ${expectedType}`);
    }

    return jwtPayload;
  } catch (error) {
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