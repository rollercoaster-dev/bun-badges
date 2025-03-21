import { Hono } from "hono";
import { AuthController } from "@controllers/auth.controller";
import { AUTH_ROUTES } from "@routes/aliases";

const auth = new Hono();
const controller = new AuthController();

// User registration and login
auth.post(AUTH_ROUTES.REGISTER, (c) => controller.register(c));
auth.post(AUTH_ROUTES.LOGIN, (c) => controller.login(c));

// Code-based authentication
auth.post(AUTH_ROUTES.REQUEST_CODE, (c) => controller.requestCode(c));
auth.post(AUTH_ROUTES.VERIFY_CODE, (c) => controller.verifyCode(c));
auth.post(AUTH_ROUTES.REFRESH_TOKEN, (c) => controller.refreshToken(c));
auth.post(AUTH_ROUTES.REVOKE_TOKEN, (c) => controller.revokeToken(c));

// Future endpoints
// auth.post(AUTH_ROUTES.REVOKE_TOKEN, (c) => controller.revokeToken(c));

export default auth;
