import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import auth from './routes/auth.routes';
import { oauth } from './routes/oauth.routes';
import { errorHandler } from './middleware/error-handler';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());
app.use('*', secureHeaders());
app.use('*', errorHandler);

// Routes
app.route('/auth', auth);
app.route('/oauth', oauth);

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