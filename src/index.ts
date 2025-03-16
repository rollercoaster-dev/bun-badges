import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import auth from './routes/auth.routes';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Mount routes
app.route('/auth', auth);

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