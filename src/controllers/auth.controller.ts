import { Context } from 'hono';
import { generateCode, isCodeExpired, isValidCodeFormat } from '@utils/auth/codeGenerator';
import { RateLimiter } from '@utils/auth/rateLimiter';

type CodeRequestBody = {
  username: string;
};

type CodeVerifyBody = {
  username: string;
  code: string;
};

export class AuthController {
  private rateLimiter: RateLimiter;

  constructor(rateLimiter?: RateLimiter) {
    this.rateLimiter = rateLimiter || new RateLimiter({
      maxAttempts: 5,
      windowMs: 3600000, // 1 hour
    });
  }

  async requestCode(c: Context) {
    const body = await c.req.json<CodeRequestBody>();
    
    if (!body.username) {
      return c.json({ error: 'Username is required' }, 400);
    }

    const clientIp = c.req.header('x-forwarded-for') || 'unknown';
    const rateLimitKey = `code-request:${clientIp}:${body.username}`;

    if (!this.rateLimiter.attempt(rateLimitKey)) {
      const timeToReset = this.rateLimiter.getTimeToReset(rateLimitKey);
      return c.json({
        error: 'Too many code requests',
        retryAfter: Math.ceil(timeToReset / 1000),
      }, 429);
    }

    const { code, expiresAt, ttl } = generateCode();

    // TODO: Store code in database
    // For development, we'll return the code directly
    // In production, this should be sent via the configured provider
    return c.json({
      message: 'Code generated successfully',
      expiresIn: ttl,
      // DEVELOPMENT ONLY - remove in production
      code,
    }, 200);
  }

  async verifyCode(c: Context) {
    const body = await c.req.json<CodeVerifyBody>();
    
    if (!body.username || !body.code) {
      return c.json({ error: 'Username and code are required' }, 400);
    }

    if (!isValidCodeFormat(body.code)) {
      return c.json({ error: 'Invalid code format' }, 400);
    }

    const clientIp = c.req.header('x-forwarded-for') || 'unknown';
    const rateLimitKey = `code-verify:${clientIp}:${body.username}`;

    if (!this.rateLimiter.attempt(rateLimitKey)) {
      const timeToReset = this.rateLimiter.getTimeToReset(rateLimitKey);
      return c.json({
        error: 'Too many verification attempts',
        retryAfter: Math.ceil(timeToReset / 1000),
      }, 429);
    }

    // TODO: Verify code from database
    // For development, we'll just return success
    // In production, this should verify against stored codes
    return c.json({
      message: 'Code verified successfully',
      // TODO: Return JWT token here
      token: 'dummy-token',
    }, 200);
  }
} 