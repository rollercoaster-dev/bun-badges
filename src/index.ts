import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import auth from '@routes/auth.routes';
import badges from '@routes/badges.routes';
import assertions from '@routes/assertions.routes';
import { createOAuthRouter } from '@routes/oauth.routes';
import { OAuthController } from '@controllers/oauth.controller';
import { errorHandler } from '@middleware/error-handler';
import { createAuthMiddleware } from '@middleware/auth.middleware';
import { DatabaseService } from '@services/db.service';

const app = new Hono();

// Initialize services and controllers
const db = new DatabaseService();
const oauthController = new OAuthController(db);

// Create the auth middleware
const authMiddleware = createAuthMiddleware(db);

// Middleware
app.use('*', logger());
app.use('*', cors());
app.use('*', secureHeaders());
app.use('*', errorHandler);

// Routes
app.route('/auth', auth);
app.route('/oauth', createOAuthRouter(oauthController));

// API routes with selective auth middleware
const api = new Hono();

// Apply auth middleware only to mutation operations
api.use('/badges', async (c, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(c.req.method)) {
    return authMiddleware(c, next);
  }
  await next();
});

api.use('/assertions', async (c, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(c.req.method)) {
    return authMiddleware(c, next);
  }
  await next();
});

// Mount the API routes
api.route('/badges', badges);
api.route('/assertions', assertions);
app.route('/api', api);

// Root route
app.get('/', (c) => c.json({ message: 'Bun Badges API' }));

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.0.1'
  });
});

// Start server
const port = parseInt(process.env.PORT || '6669', 10);
console.log(`Server starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port
});

export default app; 