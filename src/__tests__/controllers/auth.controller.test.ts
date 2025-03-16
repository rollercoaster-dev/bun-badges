import { expect, test, describe } from 'bun:test';
import { Context } from 'hono';
import { AuthController } from '../../controllers/auth.controller';
import { RateLimiter } from '../../utils/auth/rateLimiter';

type AuthResponse = {
  message?: string;
  error?: string;
  code?: string;
  expiresIn?: number;
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