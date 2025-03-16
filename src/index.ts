import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import auth from '@routes/auth.routes';
import badges from '@routes/badges.routes';
import { createOAuthRouter } from '@routes/oauth.routes';
import { OAuthController } from '@controllers/oauth.controller';
import { errorHandler } from '@middleware/error-handler';
import { DatabaseService } from '@services/db.service';

const app = new Hono();

// Initialize services and controllers
const db = new DatabaseService();
const oauthController = new OAuthController(db);

// Middleware
app.use('*', logger());
app.use('*', cors());
app.use('*', secureHeaders());
app.use('*', errorHandler);

// Routes
app.route('/auth', auth);
app.route('/oauth', createOAuthRouter(oauthController));
app.route('/api', badges);

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