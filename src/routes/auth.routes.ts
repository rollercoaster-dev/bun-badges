import { Hono } from 'hono';
import { AuthController } from '@controllers/auth.controller';
import { AUTH_ROUTES } from '@routes/aliases';

const auth = new Hono();
const controller = new AuthController();

// Code-based authentication
auth.post(AUTH_ROUTES.REQUEST_CODE, (c) => controller.requestCode(c));
auth.post(AUTH_ROUTES.VERIFY_CODE, (c) => controller.verifyCode(c));
auth.post(AUTH_ROUTES.REFRESH_TOKEN, (c) => controller.refreshToken(c));
auth.post(AUTH_ROUTES.REVOKE_TOKEN, (c) => controller.revokeToken(c));

// Future endpoints
// auth.post(AUTH_ROUTES.REVOKE_TOKEN, (c) => controller.revokeToken(c));

export default auth; 