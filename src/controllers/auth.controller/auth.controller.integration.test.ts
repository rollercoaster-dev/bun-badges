import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { AuthController } from "@/controllers/auth.controller";
import {
  seedTestData,
  clearTestData,
  seedVerificationCode,
  createMockContext,
} from "@/utils/test/db-helpers";
import { verificationCodes, revokedTokens } from "@/db/schema";
import { testDb } from "@/utils/test/integration-setup";
import { eq } from "drizzle-orm";

// Define response types for type safety
interface CodeResponse {
  message?: string;
  code?: string;
  expiresIn?: number;
  error?: string;
  retryAfter?: number;
}

interface TokenResponse {
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  refreshExpiresIn?: number;
  error?: string;
  retryAfter?: number;
}

interface RefreshResponse {
  message?: string;
  accessToken?: string;
  expiresIn?: number;
  error?: string;
  retryAfter?: number;
}

interface RevokeResponse {
  message?: string;
  error?: string;
  retryAfter?: number;
}

describe("Auth Controller Integration Tests", () => {
  beforeEach(async () => {
    await seedTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe("requestCode", () => {
    test("should generate code for valid request", async () => {
      const controller = new AuthController();
      const ctx = createMockContext({
        body: { username: "test@example.com" },
      });

      const response = await controller.requestCode(ctx);

      expect(response.status).toBe(200);
      const body = (await response.json()) as CodeResponse;
      expect(body.message).toBe("Code generated successfully");
      expect(body.code).toMatch(/^\d{6}$/);
      expect(body.expiresIn).toBe(300);

      // Verify code is in the database
      const codes = await testDb
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.username, "test@example.com"));

      expect(codes.length).toBe(1);
      expect(codes[0].code).toBe(body.code || "");
    });

    test("should enforce rate limiting", async () => {
      const controller = new AuthController(undefined);
      const ip = "test-rate-limit-ip";

      // Make several requests to trigger rate limiting
      for (let i = 0; i < 5; i++) {
        const ctx = createMockContext({
          body: { username: "test@example.com" },
          ip,
        });
        await controller.requestCode(ctx);
      }

      // This request should be rate limited
      const ctx = createMockContext({
        body: { username: "test@example.com" },
        ip,
      });
      const response = await controller.requestCode(ctx);

      expect(response.status).toBe(429);
      const body = (await response.json()) as CodeResponse;
      expect(body.error).toMatch(/Too many code requests/i);
      expect(body.retryAfter).toBeGreaterThan(0);
    });

    test("should track rate limits separately by IP", async () => {
      const controller = new AuthController(undefined);
      const ip1 = "ip1";
      const ip2 = "ip2";

      // Make 5 requests from first IP
      for (let i = 0; i < 5; i++) {
        const ctx = createMockContext({
          body: { username: "test@example.com" },
          ip: ip1,
        });
        await controller.requestCode(ctx);
      }

      // 6th request from first IP should be rate limited
      const ctx1 = createMockContext({
        body: { username: "test@example.com" },
        ip: ip1,
      });
      const response1 = await controller.requestCode(ctx1);
      const body1 = (await response1.json()) as CodeResponse;
      expect(response1.status).toBe(429);
      expect(body1.error).toMatch(/Too many code requests/i);

      // Request from second IP should succeed
      const ctx2 = createMockContext({
        body: { username: "test@example.com" },
        ip: ip2,
      });
      const response2 = await controller.requestCode(ctx2);
      const body2 = (await response2.json()) as CodeResponse;
      expect(response2.status).toBe(200);
      expect(body2.message).toBe("Code generated successfully");
    });

    test("requires username", async () => {
      const controller = new AuthController();
      const ctx = createMockContext({
        body: {}, // Empty body, missing username
      });

      const response = await controller.requestCode(ctx);
      const body = (await response.json()) as CodeResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe("Username is required");
    });
  });

  describe("verifyCode", () => {
    test("should verify valid code and return tokens", async () => {
      // First seed a verification code
      const verificationCode = await seedVerificationCode(
        "test@example.com",
        "123456",
      );

      const controller = new AuthController();
      const ctx = createMockContext({
        body: {
          username: "test@example.com",
          code: "123456",
        },
      });

      const response = await controller.verifyCode(ctx);

      expect(response.status).toBe(200);
      const body = (await response.json()) as TokenResponse;
      expect(body.message).toBe("Code verified successfully");
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.expiresIn).toBeGreaterThan(0);
      expect(body.refreshExpiresIn).toBeGreaterThan(0);

      // Verify code is marked as used
      const codes = await testDb
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.id, verificationCode.id));

      expect(codes.length).toBe(1);
      expect(codes[0].usedAt).not.toBeNull();
    });

    test("should reject invalid code", async () => {
      await seedVerificationCode("test@example.com", "123456");

      const controller = new AuthController();
      const ctx = createMockContext({
        body: {
          username: "test@example.com",
          code: "999999", // Invalid code
        },
      });

      const response = await controller.verifyCode(ctx);

      expect(response.status).toBe(401);
      const body = (await response.json()) as TokenResponse;
      expect(body.error).toBe("Invalid code");
    });

    test("should enforce rate limiting for verification", async () => {
      await seedVerificationCode("test@example.com", "123456");

      const controller = new AuthController(undefined);
      const ip = "test-verify-limit-ip";

      // Make several verification attempts to trigger rate limiting
      for (let i = 0; i < 5; i++) {
        const ctx = createMockContext({
          body: {
            username: "test@example.com",
            code: "123456",
          },
          ip,
        });
        await controller.verifyCode(ctx);
      }

      // This request should be rate limited
      const ctx = createMockContext({
        body: {
          username: "test@example.com",
          code: "123456",
        },
        ip,
      });
      const response = await controller.verifyCode(ctx);

      expect(response.status).toBe(429);
      const body = (await response.json()) as TokenResponse;
      expect(body.error).toMatch(/Too many verification attempts/i);
      expect(body.retryAfter).toBeGreaterThan(0);
    });

    test("requires username and code", async () => {
      const controller = new AuthController();

      // Missing both
      let ctx = createMockContext({
        body: {},
      });
      let response = await controller.verifyCode(ctx);
      let body = (await response.json()) as TokenResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe("Username and code are required");

      // Missing code
      ctx = createMockContext({
        body: { username: "test@example.com" },
      });
      response = await controller.verifyCode(ctx);
      body = (await response.json()) as TokenResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe("Username and code are required");

      // Missing username
      ctx = createMockContext({
        body: { code: "123456" },
      });
      response = await controller.verifyCode(ctx);
      body = (await response.json()) as TokenResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe("Username and code are required");
    });

    test("validates code format", async () => {
      const controller = new AuthController();
      const ctx = createMockContext({
        body: {
          username: "test@example.com",
          code: "12345", // Too short
        },
      });

      const response = await controller.verifyCode(ctx);
      const body = (await response.json()) as TokenResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid code format");
    });
  });

  describe("refreshToken", () => {
    test("should issue new access token for valid refresh token", async () => {
      // First generate tokens by verifying a code
      await seedVerificationCode("token-test@example.com", "123456");

      const controller = new AuthController();
      const verifyCtx = createMockContext({
        body: {
          username: "token-test@example.com",
          code: "123456",
        },
      });

      const verifyResponse = await controller.verifyCode(verifyCtx);
      const verifyBody = (await verifyResponse.json()) as TokenResponse;
      const refreshToken = verifyBody.refreshToken;

      // Now test refreshing the token
      const refreshCtx = createMockContext({
        body: {
          refreshToken,
        },
      });

      const response = await controller.refreshToken(refreshCtx);

      expect(response.status).toBe(200);
      const body = (await response.json()) as RefreshResponse;
      expect(body.message).toBe("Token refreshed successfully");
      expect(body.accessToken).toBeDefined();
      expect(body.expiresIn).toBeGreaterThan(0);
    });

    test("requires refresh token", async () => {
      const controller = new AuthController();
      const ctx = createMockContext({
        body: {},
      });

      const response = await controller.refreshToken(ctx);
      const body = (await response.json()) as RefreshResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe("Refresh token is required");
    });

    test("should enforce rate limiting for refresh", async () => {
      // First generate tokens by verifying a code
      await seedVerificationCode("refresh-limit@example.com", "123456");

      const controller = new AuthController(undefined);
      const verifyCtx = createMockContext({
        body: {
          username: "refresh-limit@example.com",
          code: "123456",
        },
      });

      const verifyResponse = await controller.verifyCode(verifyCtx);
      const verifyBody = (await verifyResponse.json()) as TokenResponse;
      const refreshToken = verifyBody.refreshToken;

      const ip = "test-refresh-limit-ip";

      // Make several refresh attempts to trigger rate limiting
      for (let i = 0; i < 5; i++) {
        const ctx = createMockContext({
          body: { refreshToken },
          ip,
        });
        await controller.refreshToken(ctx);
      }

      // This request should be rate limited
      const ctx = createMockContext({
        body: { refreshToken },
        ip,
      });
      const response = await controller.refreshToken(ctx);

      expect(response.status).toBe(429);
      const body = (await response.json()) as RefreshResponse;
      expect(body.error).toMatch(/Too many refresh attempts/i);
      expect(body.retryAfter).toBeGreaterThan(0);
    });
  });

  describe("revokeToken", () => {
    test("should revoke a valid token", async () => {
      // First generate tokens by verifying a code
      await seedVerificationCode("revoke-test@example.com", "123456");

      const controller = new AuthController();
      const verifyCtx = createMockContext({
        body: {
          username: "revoke-test@example.com",
          code: "123456",
        },
      });

      const verifyResponse = await controller.verifyCode(verifyCtx);
      const verifyBody = (await verifyResponse.json()) as TokenResponse;
      const accessToken = verifyBody.accessToken;

      // Now test revoking the token
      const revokeCtx = createMockContext({
        body: {
          token: accessToken,
          type: "access",
        },
      });

      const response = await controller.revokeToken(revokeCtx);

      expect(response.status).toBe(200);
      const body = (await response.json()) as RevokeResponse;
      expect(body.message).toBe("Token revoked successfully");

      // Verify token is in the revoked tokens database
      const revokedTokensInDb = await testDb
        .select()
        .from(revokedTokens)
        .where(eq(revokedTokens.token, accessToken || ""));

      expect(revokedTokensInDb.length).toBe(1);
    });

    test("should detect already revoked token", async () => {
      // First generate tokens by verifying a code
      await seedVerificationCode("revoke-test@example.com", "123456");

      const controller = new AuthController();
      const verifyCtx = createMockContext({
        body: {
          username: "revoke-test@example.com",
          code: "123456",
        },
      });

      const verifyResponse = await controller.verifyCode(verifyCtx);
      const verifyBody = (await verifyResponse.json()) as TokenResponse;
      const accessToken = verifyBody.accessToken;

      // Revoke it first time
      const revokeCtx1 = createMockContext({
        body: {
          token: accessToken,
          type: "access",
        },
      });
      await controller.revokeToken(revokeCtx1);

      // Try to revoke it again
      const revokeCtx2 = createMockContext({
        body: {
          token: accessToken,
          type: "access",
        },
      });
      const response = await controller.revokeToken(revokeCtx2);

      expect(response.status).toBe(200);
      const body = (await response.json()) as RevokeResponse;
      expect(body.message).toBe("Token was already revoked");
    });

    test("requires token and type", async () => {
      const controller = new AuthController();

      // Missing both
      let ctx = createMockContext({
        body: {},
      });
      let response = await controller.revokeToken(ctx);
      let body = (await response.json()) as RevokeResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe("Token and type are required");

      // Missing type
      ctx = createMockContext({
        body: { token: "some-token" },
      });
      response = await controller.revokeToken(ctx);
      body = (await response.json()) as RevokeResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe("Token and type are required");

      // Missing token
      ctx = createMockContext({
        body: { type: "access" },
      });
      response = await controller.revokeToken(ctx);
      body = (await response.json()) as RevokeResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe("Token and type are required");
    });

    test("validates token type", async () => {
      const controller = new AuthController();
      const ctx = createMockContext({
        body: {
          token: "some-token",
          type: "invalid-type",
        },
      });

      const response = await controller.revokeToken(ctx);
      const body = (await response.json()) as RevokeResponse;
      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid token type");
    });

    test("should enforce rate limiting for revocation", async () => {
      // First generate tokens by verifying a code
      await seedVerificationCode("revoke-limit@example.com", "123456");

      const controller = new AuthController(undefined);
      const verifyCtx = createMockContext({
        body: {
          username: "revoke-limit@example.com",
          code: "123456",
        },
      });

      const verifyResponse = await controller.verifyCode(verifyCtx);
      const verifyBody = (await verifyResponse.json()) as TokenResponse;
      const accessToken = verifyBody.accessToken;

      const ip = "test-revoke-limit-ip";

      // Make several revocation attempts to trigger rate limiting
      for (let i = 0; i < 5; i++) {
        const ctx = createMockContext({
          body: {
            token: accessToken,
            type: "access",
          },
          ip,
        });
        await controller.revokeToken(ctx);
      }

      // This request should be rate limited
      const ctx = createMockContext({
        body: {
          token: accessToken,
          type: "access",
        },
        ip,
      });
      const response = await controller.revokeToken(ctx);

      expect(response.status).toBe(429);
      const body = (await response.json()) as RevokeResponse;
      expect(body.error).toMatch(/Too many revocation attempts/i);
      expect(body.retryAfter).toBeGreaterThan(0);
    });
  });
});
