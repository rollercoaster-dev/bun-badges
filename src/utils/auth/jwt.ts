import { SignJWT, jwtVerify } from 'jose';
import { createSecretKey } from 'crypto';

// In production, this should be loaded from environment variables
const JWT_SECRET = 'development-secret-key-change-me-in-production';
const JWT_EXPIRES_IN = '24h';

export interface JWTPayload {
  sub: string;  // username
  iat?: number; // issued at
  exp?: number; // expires at
}

export async function generateToken(username: string): Promise<string> {
  const secretKey = createSecretKey(Buffer.from(JWT_SECRET));
  
  const token = await new SignJWT({ sub: username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secretKey);
    
  return token;
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const secretKey = createSecretKey(Buffer.from(JWT_SECRET));
  
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as JWTPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export function getTokenExpirySeconds(): number {
  // Parse JWT_EXPIRES_IN to seconds
  const match = JWT_EXPIRES_IN.match(/^(\d+)([hms])$/);
  if (!match) throw new Error('Invalid JWT_EXPIRES_IN format');
  
  const [, value, unit] = match;
  const multipliers = { h: 3600, m: 60, s: 1 };
  return parseInt(value) * multipliers[unit as keyof typeof multipliers];
} 