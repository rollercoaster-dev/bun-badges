import { expect, test, describe, mock } from 'bun:test';
import { Context } from 'hono';
import { createAuthMiddleware, AuthContext } from '@middleware/auth.middleware';
import { generateToken } from '@utils/auth/jwt';
import { DatabaseService } from '@services/db.service';

type ErrorResponse = {
  error: string;
};

const createMockContext = (headers: Record<string, string> = {}) => {
  return {
    req: {
      header: (name: string) => headers[name],
    },
    json: (body: any, status = 200) => {
      return Response.json(body, { status });
    },
  } as unknown as Context;
};

const createMockDatabase = () => {
  const mockDb = {
    isTokenRevoked: mock((token: string) => {
      return Promise.resolve(token === 'revoked-token');
    }),
  };

  return mockDb as unknown as DatabaseService;
};

describe('Auth Middleware', () => {
  test('requires Authorization header', async () => {
    const mockDb = createMockDatabase();
    const middleware = createAuthMiddleware(mockDb);
    const ctx = createMockContext();
    const next = mock(() => Promise.resolve());

    const response = await middleware(ctx, next) as Response;
    const body = await response.json() as ErrorResponse;
    expect(response.status).toBe(401);
    expect(body.error).toBe('Authorization header is required');
    expect(next).not.toHaveBeenCalled();
  });

  test('requires Bearer token', async () => {
    const mockDb = createMockDatabase();
    const middleware = createAuthMiddleware(mockDb);
    const ctx = createMockContext({ Authorization: 'Basic token' });
    const next = mock(() => Promise.resolve());

    const response = await middleware(ctx, next) as Response;
    const body = await response.json() as ErrorResponse;
    expect(response.status).toBe(401);
    expect(body.error).toBe('Authorization header is required');
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects revoked token', async () => {
    const mockDb = createMockDatabase();
    const middleware = createAuthMiddleware(mockDb);
    const ctx = createMockContext({ Authorization: 'Bearer revoked-token' });
    const next = mock(() => Promise.resolve());

    const response = await middleware(ctx, next) as Response;
    const body = await response.json() as ErrorResponse;
    expect(response.status).toBe(401);
    expect(body.error).toBe('Token has been revoked');
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects invalid token', async () => {
    const mockDb = createMockDatabase();
    const middleware = createAuthMiddleware(mockDb);
    const ctx = createMockContext({ Authorization: 'Bearer invalid-token' });
    const next = mock(() => Promise.resolve());

    const response = await middleware(ctx, next) as Response;
    const body = await response.json() as ErrorResponse;
    expect(response.status).toBe(401);
    expect(body.error).toBe('Invalid token');
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts valid token and adds user to context', async () => {
    const mockDb = createMockDatabase();
    const middleware = createAuthMiddleware(mockDb);
    const username = 'test@example.com';
    const token = await generateToken(username, 'access');
    const ctx = createMockContext({ Authorization: `Bearer ${token}` });
    const next = mock(() => Promise.resolve());

    await middleware(ctx, next);
    
    expect(next).toHaveBeenCalledTimes(1);
    const authCtx = ctx as AuthContext;
    expect(authCtx.user).toBeDefined();
    expect(authCtx.user?.username).toBe(username);
    expect(authCtx.user?.tokenType).toBe('access');
  });
}); 