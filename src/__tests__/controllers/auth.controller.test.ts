import { expect, test, describe } from 'bun:test';
import { Context } from 'hono';
import { AuthController } from '@controllers/auth.controller';
import { RateLimiter } from '@utils/auth/rateLimiter';
import { AUTH_ROUTES } from '@routes/aliases';
import { verifyToken, getTokenExpirySeconds, generateToken, isTokenRevoked } from '@utils/auth/jwt';

type AuthResponse = {
  message?: string;
  error?: string;
  code?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  refreshExpiresIn?: number;
  retryAfter?: number;
};

const createMockContext = (body: any, ip: string = 'test-ip') => {
  return {
    req: {
      json: () => Promise.resolve(body),
      header: () => ip,
    },
    json: (responseBody: any, status = 200) => {
      return Response.json(responseBody, { status });
    },
  } as unknown as Context;
};

describe('Auth Controller', () => {
  describe(AUTH_ROUTES.REQUEST_CODE, () => {
    test('requires username', async () => {
      const controller = new AuthController();
      const ctx = createMockContext({});

      const response = await controller.requestCode(ctx);
      const body = await response.json() as AuthResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe('Username is required');
    });

    test('generates code for valid request', async () => {
      const controller = new AuthController();
      const ctx = createMockContext({ username: 'test@example.com' });

      const response = await controller.requestCode(ctx);
      const body = await response.json() as AuthResponse;
      expect(response.status).toBe(200);
      expect(body.message).toBe('Code generated successfully');
      expect(body.code).toMatch(/^\d{6}$/);
      expect(body.expiresIn).toBe(300);
    });

    test('enforces rate limiting', async () => {
      const rateLimiter = new RateLimiter({
        maxAttempts: 5,
        windowMs: 1000,
      });
      const controller = new AuthController(rateLimiter);
      const ip = 'test-ip';

      // Make 5 successful requests
      for (let i = 0; i < 5; i++) {
        const ctx = createMockContext({ username: 'test@example.com' }, ip);
        const response = await controller.requestCode(ctx);
        expect(response.status).toBe(200);
      }

      // 6th request should be rate limited
      const ctx = createMockContext({ username: 'test@example.com' }, ip);
      const response = await controller.requestCode(ctx);
      const body = await response.json() as AuthResponse;
      expect(response.status).toBe(429);
      expect(body.error).toBe('Too many code requests');
      expect(body.retryAfter).toBeGreaterThan(0);
    });

    test('tracks rate limits separately by IP', async () => {
      const rateLimiter = new RateLimiter({
        maxAttempts: 5,
        windowMs: 1000,
      });
      const controller = new AuthController(rateLimiter);
      const ip1 = 'ip1';
      const ip2 = 'ip2';

      // Make 5 requests from first IP
      for (let i = 0; i < 5; i++) {
        const ctx = createMockContext({ username: 'test@example.com' }, ip1);
        const response = await controller.requestCode(ctx);
        expect(response.status).toBe(200);
      }

      // 6th request from first IP should be rate limited
      const ctx1 = createMockContext({ username: 'test@example.com' }, ip1);
      const response1 = await controller.requestCode(ctx1);
      const body1 = await response1.json() as AuthResponse;
      expect(response1.status).toBe(429);
      expect(body1.error).toBe('Too many code requests');

      // Request from second IP should succeed
      const ctx2 = createMockContext({ username: 'test@example.com' }, ip2);
      const response2 = await controller.requestCode(ctx2);
      const body2 = await response2.json() as AuthResponse;
      expect(response2.status).toBe(200);
      expect(body2.message).toBe('Code generated successfully');
    });
  });

  describe(AUTH_ROUTES.VERIFY_CODE, () => {
    test('requires username and code', async () => {
      const controller = new AuthController();
      
      // Missing both
      let ctx = createMockContext({});
      let response = await controller.verifyCode(ctx);
      let body = await response.json() as AuthResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe('Username and code are required');

      // Missing code
      ctx = createMockContext({ username: 'test@example.com' });
      response = await controller.verifyCode(ctx);
      body = await response.json() as AuthResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe('Username and code are required');

      // Missing username
      ctx = createMockContext({ code: '123456' });
      response = await controller.verifyCode(ctx);
      body = await response.json() as AuthResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe('Username and code are required');
    });

    test('validates code format', async () => {
      const controller = new AuthController();
      const ctx = createMockContext({ 
        username: 'test@example.com',
        code: '12345' // Too short
      });

      const response = await controller.verifyCode(ctx);
      const body = await response.json() as AuthResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid code format');
    });

    test('enforces rate limiting', async () => {
      const rateLimiter = new RateLimiter({
        maxAttempts: 5,
        windowMs: 1000,
      });
      const controller = new AuthController(rateLimiter);
      const ip = 'test-ip';

      // Make 5 verification attempts
      for (let i = 0; i < 5; i++) {
        const ctx = createMockContext({ 
          username: 'test@example.com',
          code: '123456'
        }, ip);
        const response = await controller.verifyCode(ctx);
        expect(response.status).toBe(200);
      }

      // 6th attempt should be rate limited
      const ctx = createMockContext({ 
        username: 'test@example.com',
        code: '123456'
      }, ip);
      const response = await controller.verifyCode(ctx);
      const body = await response.json() as AuthResponse;
      expect(response.status).toBe(429);
      expect(body.error).toBe('Too many verification attempts');
      expect(body.retryAfter).toBeGreaterThan(0);
    });

    test('returns valid JWT tokens on successful verification', async () => {
      const controller = new AuthController();
      const username = 'test@example.com';
      const ctx = createMockContext({ 
        username,
        code: '123456'
      });

      const response = await controller.verifyCode(ctx);
      const body = await response.json() as AuthResponse;
      expect(response.status).toBe(200);
      expect(body.message).toBe('Code verified successfully');
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.expiresIn).toBe(getTokenExpirySeconds('access'));
      expect(body.refreshExpiresIn).toBe(getTokenExpirySeconds('refresh'));

      // Verify the access token
      const accessPayload = await verifyToken(body.accessToken!, 'access');
      expect(accessPayload.sub).toBe(username);
      expect(accessPayload.type).toBe('access');
      expect(accessPayload.iat).toBeDefined();
      expect(accessPayload.exp).toBeDefined();
      expect(accessPayload.exp! - accessPayload.iat!).toBe(getTokenExpirySeconds('access'));

      // Verify the refresh token
      const refreshPayload = await verifyToken(body.refreshToken!, 'refresh');
      expect(refreshPayload.sub).toBe(username);
      expect(refreshPayload.type).toBe('refresh');
      expect(refreshPayload.iat).toBeDefined();
      expect(refreshPayload.exp).toBeDefined();
      expect(refreshPayload.exp! - refreshPayload.iat!).toBe(getTokenExpirySeconds('refresh'));
    });

    test('handles token generation failure', async () => {
      const controller = new AuthController();
      const ctx = createMockContext({ 
        username: '',  // Invalid username should cause token generation to fail
        code: '123456'
      });

      const response = await controller.verifyCode(ctx);
      const body = await response.json() as AuthResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe('Username and code are required');
    });
  });

  describe(AUTH_ROUTES.REFRESH_TOKEN, () => {
    test('requires refresh token', async () => {
      const controller = new AuthController();
      const ctx = createMockContext({});

      const response = await controller.refreshToken(ctx);
      const body = await response.json() as AuthResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe('Refresh token is required');
    });

    test('validates refresh token type', async () => {
      const controller = new AuthController();
      
      // Generate an access token but try to use it as refresh token
      const invalidToken = await generateToken('test@example.com', 'access');
      const ctx = createMockContext({ refreshToken: invalidToken });

      const response = await controller.refreshToken(ctx);
      const body = await response.json() as AuthResponse;
      expect(response.status).toBe(401);
      expect(body.error).toBe('Invalid refresh token');
    });

    test('enforces rate limiting', async () => {
      const rateLimiter = new RateLimiter({
        maxAttempts: 5,
        windowMs: 1000,
      });
      const controller = new AuthController(rateLimiter);
      const ip = 'test-ip';
      const refreshToken = await generateToken('test@example.com', 'refresh');

      // Make 5 refresh attempts
      for (let i = 0; i < 5; i++) {
        const ctx = createMockContext({ refreshToken }, ip);
        const response = await controller.refreshToken(ctx);
        expect(response.status).toBe(200);
      }

      // 6th attempt should be rate limited
      const ctx = createMockContext({ refreshToken }, ip);
      const response = await controller.refreshToken(ctx);
      const body = await response.json() as AuthResponse;
      expect(response.status).toBe(429);
      expect(body.error).toBe('Too many refresh attempts');
      expect(body.retryAfter).toBeGreaterThan(0);
    });

    test('returns new access token for valid refresh token', async () => {
      const controller = new AuthController();
      const username = 'test@example.com';
      const refreshToken = await generateToken(username, 'refresh');
      const ctx = createMockContext({ refreshToken });

      const response = await controller.refreshToken(ctx);
      const body = await response.json() as AuthResponse;
      expect(response.status).toBe(200);
      expect(body.message).toBe('Token refreshed successfully');
      expect(body.accessToken).toBeDefined();
      expect(body.expiresIn).toBe(getTokenExpirySeconds('access'));

      // Verify the new access token
      const payload = await verifyToken(body.accessToken!, 'access');
      expect(payload.sub).toBe(username);
      expect(payload.type).toBe('access');
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(payload.exp! - payload.iat!).toBe(getTokenExpirySeconds('access'));
    });
  });

  describe(AUTH_ROUTES.REVOKE_TOKEN, () => {
    test('requires token and type', async () => {
      const controller = new AuthController();
      
      // Missing both
      let ctx = createMockContext({});
      let response = await controller.revokeToken(ctx);
      let body = await response.json() as AuthResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe('Token and type are required');

      // Missing type
      ctx = createMockContext({ token: 'some-token' });
      response = await controller.revokeToken(ctx);
      body = await response.json() as AuthResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe('Token and type are required');

      // Missing token
      ctx = createMockContext({ type: 'access' });
      response = await controller.revokeToken(ctx);
      body = await response.json() as AuthResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe('Token and type are required');
    });

    test('validates token type', async () => {
      const controller = new AuthController();
      const ctx = createMockContext({ 
        token: 'some-token',
        type: 'invalid-type'
      });

      const response = await controller.revokeToken(ctx);
      const body = await response.json() as AuthResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid token type');
    });

    test('enforces rate limiting', async () => {
      const rateLimiter = new RateLimiter({
        maxAttempts: 5,
        windowMs: 1000,
      });
      const controller = new AuthController(rateLimiter);
      const ip = 'test-ip';
      const token = await generateToken('test@example.com', 'access');

      // Make 5 revocation attempts
      for (let i = 0; i < 5; i++) {
        const ctx = createMockContext({ token, type: 'access' }, ip);
        const response = await controller.revokeToken(ctx);
        expect(response.status).toBe(200);
      }

      // 6th attempt should be rate limited
      const ctx = createMockContext({ token, type: 'access' }, ip);
      const response = await controller.revokeToken(ctx);
      const body = await response.json() as AuthResponse;
      expect(response.status).toBe(429);
      expect(body.error).toBe('Too many revocation attempts');
      expect(body.retryAfter).toBeGreaterThan(0);
    });

    test('successfully revokes valid token', async () => {
      const controller = new AuthController();
      const token = await generateToken('test@example.com', 'access');
      const ctx = createMockContext({ token, type: 'access' });

      const response = await controller.revokeToken(ctx);
      const body = await response.json() as AuthResponse;
      expect(response.status).toBe(200);
      expect(body.message).toBe('Token revoked successfully');

      // Verify token is actually revoked
      expect(isTokenRevoked(token)).toBe(true);

      // Attempt to use revoked token
      try {
        await verifyToken(token, 'access');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe('Token has been revoked');
      }
    });

    test('handles already revoked token', async () => {
      const controller = new AuthController();
      const token = await generateToken('test@example.com', 'access');
      
      // Revoke token first time
      let ctx = createMockContext({ token, type: 'access' });
      let response = await controller.revokeToken(ctx);
      expect(response.status).toBe(200);

      // Try to revoke again
      ctx = createMockContext({ token, type: 'access' });
      response = await controller.revokeToken(ctx);
      const body = await response.json() as AuthResponse;
      expect(response.status).toBe(200);
      expect(body.message).toBe('Token was already revoked');
    });

    test('handles invalid token', async () => {
      const controller = new AuthController();
      const ctx = createMockContext({ 
        token: 'invalid-token',
        type: 'access'
      });

      const response = await controller.revokeToken(ctx);
      const body = await response.json() as AuthResponse;
      expect(response.status).toBe(401);
      expect(body.error).toBe('Invalid token');
    });

    test('validates token type matches actual token', async () => {
      const controller = new AuthController();
      const token = await generateToken('test@example.com', 'access');
      const ctx = createMockContext({ 
        token,
        type: 'refresh' // Wrong type
      });

      const response = await controller.revokeToken(ctx);
      const body = await response.json() as AuthResponse;
      expect(response.status).toBe(401);
      expect(body.error).toBe('Invalid token');
    });
  });
}); 