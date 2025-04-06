import { Context } from "hono";
import { generateCode, isValidCodeFormat } from "@utils/auth/codeGenerator";
import { RateLimiter } from "@utils/auth/rateLimiter";
import {
  generateToken,
  getTokenExpirySeconds,
  verifyToken,
} from "@utils/auth/jwt";
import { DatabaseService } from "@services/db.service";
import logger from "@/utils/logger";
import { type Logger as PinoLogger } from "pino";
// Use Bun's built-in password hashing instead of bcrypt

type CodeRequestBody = {
  username: string;
};

type CodeVerifyBody = {
  username: string;
  code: string;
};

type RefreshTokenBody = {
  refreshToken: string;
};

type RevokeTokenBody = {
  token: string;
  type: "access" | "refresh";
};

type RegisterBody = {
  email: string;
  password: string;
  name?: string;
};

type LoginBody = {
  email: string;
  password: string;
};

export class AuthController {
  private rateLimiter: RateLimiter;
  private db: DatabaseService;
  private logger: PinoLogger;

  constructor(rateLimiter?: RateLimiter, db?: DatabaseService) {
    this.rateLimiter =
      rateLimiter ||
      new RateLimiter({
        maxAttempts: 5,
        windowMs: 3600000, // 1 hour
      });
    this.db = db || new DatabaseService();
    this.logger = logger.child({ context: "AuthController" });
  }

  async register(c: Context) {
    const body = await c.req.json<RegisterBody>();

    if (!body.email || !body.password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    // Rate limiting to prevent registration abuse
    const clientIp = c.req.header("x-forwarded-for") || "unknown";
    const rateLimitKey = `register:${clientIp}`;

    if (!this.rateLimiter.attempt(rateLimitKey)) {
      const timeToReset = this.rateLimiter.getTimeToReset(rateLimitKey);
      return c.json(
        {
          error: "Too many registration attempts",
          retryAfter: Math.ceil(timeToReset / 1000),
        },
        429,
      );
    }

    try {
      // Check if user already exists
      const existingUser = await this.db.getUserByEmail(body.email);
      if (existingUser) {
        return c.json({ error: "User already exists" }, 409);
      }

      // Hash the password using Bun's built-in password functions
      const passwordHash = await Bun.password.hash(body.password, {
        algorithm: "bcrypt",
        cost: 10,
      });

      // Create the user
      const user = await this.db.createUser({
        email: body.email,
        passwordHash,
        name: body.name || null,
      });

      // Return a format that matches the test expectations
      return c.json(
        {
          id: user.userId, // Use userId but return it as id for compatibility
          email: user.email,
        },
        201,
      );
    } catch (error) {
      this.logger.error(error, "Registration error:");
      return c.json({ error: "Failed to register user" }, 500);
    }
  }

  async login(c: Context) {
    const body = await c.req.json<LoginBody>();

    if (!body.email || !body.password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    // Rate limiting to prevent brute force attacks
    const clientIp = c.req.header("x-forwarded-for") || "unknown";
    const rateLimitKey = `login:${clientIp}:${body.email}`;

    if (!this.rateLimiter.attempt(rateLimitKey)) {
      const timeToReset = this.rateLimiter.getTimeToReset(rateLimitKey);
      return c.json(
        {
          error: "Too many login attempts",
          retryAfter: Math.ceil(timeToReset / 1000),
        },
        429,
      );
    }

    try {
      // Get user from database
      const user = await this.db.getUserByEmail(body.email);
      if (!user || !user.passwordHash) {
        return c.json({ error: "Invalid credentials" }, 401);
      }

      // Verify password using Bun's built-in password functions
      const passwordValid = await Bun.password.verify(
        body.password,
        user.passwordHash,
      );
      if (!passwordValid) {
        return c.json({ error: "Invalid credentials" }, 401);
      }

      // Generate tokens
      const accessToken = generateToken({
        sub: user.userId,
        type: "access",
        // Include additional claims for Open Badges 3.0 compatibility
        email: user.email,
        name: user.name || undefined,
      });

      // Return a format that matches the test expectations and OB3 needs
      return c.json(
        {
          token: accessToken,
          user: {
            id: user.userId,
            email: user.email,
            name: user.name || null,
          },
        },
        200,
      );
    } catch (error) {
      this.logger.error(error, "Login error:");
      return c.json({ error: "Failed to log in" }, 500);
    }
  }

  async requestCode(c: Context) {
    const body = await c.req.json<CodeRequestBody>();

    if (!body.username) {
      return c.json({ error: "Username is required" }, 400);
    }

    const clientIp = c.req.header("x-forwarded-for") || "unknown";
    const rateLimitKey = `code-request:${clientIp}:${body.username}`;

    if (!this.rateLimiter.attempt(rateLimitKey)) {
      const timeToReset = this.rateLimiter.getTimeToReset(rateLimitKey);
      return c.json(
        {
          error: "Too many code requests",
          retryAfter: Math.ceil(timeToReset / 1000),
        },
        429,
      );
    }

    const { code, expiresAt, ttl } = generateCode();

    // Store the code in the database
    await this.db.createVerificationCode({
      code,
      username: body.username,
      expiresAt,
      attempts: [],
    });

    // In production, this should be sent via the configured provider
    this.logger.info(`Generated code for ${body.username}: ${code}`);

    return c.json(
      {
        message: "Code generated successfully",
        expiresIn: ttl,
        // DEVELOPMENT ONLY - remove in production
        code,
      },
      200,
    );
  }

  async verifyCode(c: Context) {
    const body = await c.req.json<CodeVerifyBody>();

    if (!body.username || !body.code) {
      return c.json({ error: "Username and code are required" }, 400);
    }

    if (!isValidCodeFormat(body.code)) {
      return c.json({ error: "Invalid code format" }, 400);
    }

    const clientIp = c.req.header("x-forwarded-for") || "unknown";
    const rateLimitKey = `code-verify:${clientIp}:${body.username}`;

    if (!this.rateLimiter.attempt(rateLimitKey)) {
      const timeToReset = this.rateLimiter.getTimeToReset(rateLimitKey);
      return c.json(
        {
          error: "Too many verification attempts",
          retryAfter: Math.ceil(timeToReset / 1000),
        },
        429,
      );
    }

    // Verify code from database
    const verificationCode = await this.db.getVerificationCode(
      body.username,
      body.code,
    );
    if (!verificationCode) {
      return c.json({ error: "Invalid code" }, 401);
    }

    // Record this attempt
    await this.db.recordVerificationAttempt(verificationCode.id, clientIp);

    // Mark code as used
    await this.db.markCodeAsUsed(verificationCode.id);

    try {
      const accessToken = generateToken({
        sub: body.username,
        type: "access",
      });
      const refreshToken = generateToken({
        sub: body.username,
        type: "refresh",
      });

      return c.json(
        {
          message: "Code verified successfully",
          accessToken,
          refreshToken,
          expiresIn: getTokenExpirySeconds("access"),
          refreshExpiresIn: getTokenExpirySeconds("refresh"),
        },
        200,
      );
    } catch {
      return c.json(
        {
          error: "Failed to generate tokens",
        },
        500,
      );
    }
  }

  async refreshToken(c: Context) {
    const body = await c.req.json<RefreshTokenBody>();

    if (!body.refreshToken) {
      return c.json({ error: "Refresh token is required" }, 400);
    }

    const clientIp = c.req.header("x-forwarded-for") || "unknown";
    const rateLimitKey = `token-refresh:${clientIp}`;

    if (!this.rateLimiter.attempt(rateLimitKey)) {
      const timeToReset = this.rateLimiter.getTimeToReset(rateLimitKey);
      return c.json(
        {
          error: "Too many refresh attempts",
          retryAfter: Math.ceil(timeToReset / 1000),
        },
        429,
      );
    }

    try {
      // Check if token is revoked
      if (await this.db.isTokenRevoked(body.refreshToken)) {
        return c.json(
          {
            error: "Token has been revoked",
          },
          401,
        );
      }

      // Verify the refresh token
      const payload = await verifyToken(body.refreshToken);

      // Generate new access token
      const accessToken = generateToken({
        sub: payload.sub,
        type: "access",
      });

      return c.json(
        {
          message: "Token refreshed successfully",
          accessToken,
          expiresIn: getTokenExpirySeconds("access"),
        },
        200,
      );
    } catch {
      return c.json({ error: "Invalid refresh token" }, 401);
    }
  }

  async revokeToken(c: Context) {
    const body = await c.req.json<RevokeTokenBody>();

    if (!body.token || !body.type) {
      return c.json({ error: "Token and type are required" }, 400);
    }

    if (body.type !== "access" && body.type !== "refresh") {
      return c.json({ error: "Invalid token type" }, 400);
    }

    const clientIp = c.req.header("x-forwarded-for") || "unknown";
    const rateLimitKey = `token-revoke:${clientIp}`;

    if (!this.rateLimiter.attempt(rateLimitKey)) {
      const timeToReset = this.rateLimiter.getTimeToReset(rateLimitKey);
      return c.json(
        {
          error: "Too many revocation attempts",
          retryAfter: Math.ceil(timeToReset / 1000),
        },
        429,
      );
    }

    try {
      // Check if token is already revoked
      if (await this.db.isTokenRevoked(body.token)) {
        return c.json(
          {
            message: "Token was already revoked",
          },
          200,
        );
      }

      // Verify token type before revocation
      const payload = await verifyToken(body.token);

      // Store revoked token in database
      await this.db.revokeToken({
        token: body.token,
        type: body.type,
        username: payload.sub,
        expiresAt: new Date(payload.exp! * 1000),
      });

      this.logger.info(`Token revoked: ${body.token.substring(0, 10)}...`);

      return c.json(
        {
          message: "Token revoked successfully",
        },
        200,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Token has been revoked"
      ) {
        return c.json(
          {
            message: "Token was already revoked",
          },
          200,
        );
      }

      return c.json(
        {
          error: "Invalid token",
        },
        401,
      );
    }
  }
}
