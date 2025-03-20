import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { OAuthController } from "@controllers/oauth.controller";
import {
  seedTestData,
  clearTestData,
  createMockContext,
} from "@/utils/test/db-helpers";
import { DatabaseService } from "@/services/db.service";

// Define response types for better type checking
interface MockResponse {
  body?: any;
  status?: number;
  redirect?: string;
}

describe("OAuthController Integration Tests", () => {
  let controller: OAuthController;
  let testData: any;
  let dbService: DatabaseService;

  beforeEach(async () => {
    testData = await seedTestData();
    // Create a real DatabaseService instance that uses the actual database
    dbService = new DatabaseService();
    controller = new OAuthController(dbService);
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe("registerClient", () => {
    it("should register a new client", async () => {
      const ctx = createMockContext({
        body: {
          client_name: "Test Integration Client",
          redirect_uris: ["https://example.com/callback"],
          scope: "badge:read profile:read",
        },
      });

      const result = (await controller.registerClient(
        ctx as any,
      )) as MockResponse;

      expect(result.status).toBe(201);
      expect(result.body?.client_id).toBeDefined();
      expect(result.body?.client_secret).toBeDefined();
      expect(result.body?.client_name).toBe("Test Integration Client");

      // Verify the client was actually created in the database
      const client = await dbService.getOAuthClient(result.body?.client_id);
      expect(client).not.toBeNull();
      expect(client?.clientName).toBe("Test Integration Client");
    });

    it("should validate required fields", async () => {
      const ctx = createMockContext({
        body: {
          client_name: "Test Client",
          // Missing redirect_uris
        },
      });

      try {
        await controller.registerClient(ctx as any);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain("Invalid request");
      }
    });
  });

  describe("authorize", () => {
    it("should render consent page for valid request", async () => {
      // First register a client to use in the test
      const registerCtx = createMockContext({
        body: {
          client_name: "Authorization Test Client",
          redirect_uris: ["https://example.com/callback"],
          scope: "badge:read profile:read",
        },
      });

      const registerResult = (await controller.registerClient(
        registerCtx as any,
      )) as MockResponse;

      const clientId = registerResult.body?.client_id;

      // Now test the authorization flow
      const ctx = createMockContext({
        query: {
          response_type: "code",
          client_id: clientId,
          redirect_uri: "https://example.com/callback",
          scope: "badge:read profile:read",
          state: "test-state",
        },
      });

      const result = (await controller.authorize(ctx as any)) as MockResponse;

      expect(result.body).toContain("Authorization Request");
      expect(result.body).toContain("Authorization Test Client");
      expect(result.body).toContain("badge:read");
    });

    it("should handle authorization approval", async () => {
      // First register a client to use in the test
      const registerCtx = createMockContext({
        body: {
          client_name: "Authorization Approval Test Client",
          redirect_uris: ["https://example.com/callback"],
          scope: "badge:read profile:read",
        },
      });

      const registerResult = (await controller.registerClient(
        registerCtx as any,
      )) as MockResponse;

      const clientId = registerResult.body?.client_id;

      // Now test the authorization approval flow
      const ctx = createMockContext({
        method: "POST",
        body: {
          client_id: clientId,
          redirect_uri: "https://example.com/callback",
          scope: "badge:read profile:read",
          state: "test-state",
          response_type: "code",
          user_decision: "approve",
          // For integration test, we need a user ID
          user_id: testData.user.userId,
        },
      });

      const result = (await controller.authorize(ctx as any)) as MockResponse;

      expect(result.redirect).toContain("https://example.com/callback?code=");
      expect(result.redirect).toContain("state=test-state");
    });

    it("should handle authorization denial", async () => {
      // First register a client to use in the test
      const registerCtx = createMockContext({
        body: {
          client_name: "Authorization Denial Test Client",
          redirect_uris: ["https://example.com/callback"],
          scope: "badge:read profile:read",
        },
      });

      const registerResult = (await controller.registerClient(
        registerCtx as any,
      )) as MockResponse;

      const clientId = registerResult.body?.client_id;

      // Now test the authorization denial flow
      const ctx = createMockContext({
        method: "POST",
        body: {
          client_id: clientId,
          redirect_uri: "https://example.com/callback",
          scope: "badge:read profile:read",
          state: "test-state",
          response_type: "code",
          user_decision: "deny",
          // For integration test, we need a user ID
          user_id: testData.user.userId,
        },
      });

      const result = (await controller.authorize(ctx as any)) as MockResponse;

      expect(result.redirect).toContain("error=access_denied");
      expect(result.redirect).toContain("state=test-state");
    });
  });

  describe("token", () => {
    it("should exchange authorization code for tokens", async () => {
      // First register a client
      const registerCtx = createMockContext({
        body: {
          client_name: "Token Exchange Test Client",
          redirect_uris: ["https://example.com/callback"],
          scope: "badge:read profile:read",
        },
      });

      const registerResult = (await controller.registerClient(
        registerCtx as any,
      )) as MockResponse;

      const clientId = registerResult.body?.client_id;
      const clientSecret = registerResult.body?.client_secret;

      // Then create an authorization code
      const authorizeCtx = createMockContext({
        method: "POST",
        body: {
          client_id: clientId,
          redirect_uri: "https://example.com/callback",
          scope: "badge:read profile:read",
          state: "test-state",
          response_type: "code",
          user_decision: "approve",
          user_id: testData.user.userId,
        },
      });

      const authorizeResult = (await controller.authorize(
        authorizeCtx as any,
      )) as MockResponse;

      // Extract the code from the redirect URL
      const redirectUrl = new URL(authorizeResult.redirect as string);
      const code = redirectUrl.searchParams.get("code");

      // Now exchange the code for tokens
      const tokenCtx = createMockContext({
        body: {
          grant_type: "authorization_code",
          code: code,
          redirect_uri: "https://example.com/callback",
          client_id: clientId,
          client_secret: clientSecret,
        },
      });

      const tokenResult = (await controller.token(
        tokenCtx as any,
      )) as MockResponse;

      expect(tokenResult.body?.access_token).toBeDefined();
      expect(tokenResult.body?.token_type).toBe("Bearer");
      expect(tokenResult.body?.refresh_token).toBeDefined();
      expect(tokenResult.body?.expires_in).toBeGreaterThan(0);
    });
  });

  describe("introspect", () => {
    it("should return active status for valid token", async () => {
      // First register a client
      const registerCtx = createMockContext({
        body: {
          client_name: "Introspection Test Client",
          redirect_uris: ["https://example.com/callback"],
          scope: "badge:read profile:read",
        },
      });

      const registerResult = (await controller.registerClient(
        registerCtx as any,
      )) as MockResponse;

      const clientId = registerResult.body?.client_id;
      const clientSecret = registerResult.body?.client_secret;

      // Then create an authorization code
      const authorizeCtx = createMockContext({
        method: "POST",
        body: {
          client_id: clientId,
          redirect_uri: "https://example.com/callback",
          scope: "badge:read profile:read",
          state: "test-state",
          response_type: "code",
          user_decision: "approve",
          user_id: testData.user.userId,
        },
      });

      const authorizeResult = (await controller.authorize(
        authorizeCtx as any,
      )) as MockResponse;

      // Extract the code from the redirect URL
      const redirectUrl = new URL(authorizeResult.redirect as string);
      const code = redirectUrl.searchParams.get("code");

      // Exchange the code for tokens
      const tokenCtx = createMockContext({
        body: {
          grant_type: "authorization_code",
          code: code,
          redirect_uri: "https://example.com/callback",
          client_id: clientId,
          client_secret: clientSecret,
        },
      });

      const tokenResult = (await controller.token(
        tokenCtx as any,
      )) as MockResponse;
      const accessToken = tokenResult.body?.access_token;

      // Now test token introspection
      const introspectCtx = createMockContext({
        body: {
          token: accessToken,
        },
        authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      });

      const introspectResult = (await controller.introspect(
        introspectCtx as any,
      )) as MockResponse;

      expect(introspectResult.body?.active).toBe(true);
      expect(introspectResult.body?.client_id).toBeDefined();
      expect(introspectResult.body?.token_type).toBe("Bearer");
    });
  });

  describe("revoke", () => {
    it("should revoke a valid token", async () => {
      // First register a client
      const registerCtx = createMockContext({
        body: {
          client_name: "Token Revocation Test Client",
          redirect_uris: ["https://example.com/callback"],
          scope: "badge:read profile:read",
        },
      });

      const registerResult = (await controller.registerClient(
        registerCtx as any,
      )) as MockResponse;

      const clientId = registerResult.body?.client_id;
      const clientSecret = registerResult.body?.client_secret;

      // Then create an authorization code
      const authorizeCtx = createMockContext({
        method: "POST",
        body: {
          client_id: clientId,
          redirect_uri: "https://example.com/callback",
          scope: "badge:read profile:read",
          state: "test-state",
          response_type: "code",
          user_decision: "approve",
          user_id: testData.user.userId,
        },
      });

      const authorizeResult = (await controller.authorize(
        authorizeCtx as any,
      )) as MockResponse;

      // Extract the code from the redirect URL
      const redirectUrl = new URL(authorizeResult.redirect as string);
      const code = redirectUrl.searchParams.get("code");

      // Exchange the code for tokens
      const tokenCtx = createMockContext({
        body: {
          grant_type: "authorization_code",
          code: code,
          redirect_uri: "https://example.com/callback",
          client_id: clientId,
          client_secret: clientSecret,
        },
      });

      const tokenResult = (await controller.token(
        tokenCtx as any,
      )) as MockResponse;
      const accessToken = tokenResult.body?.access_token;

      // Now test token revocation
      const revokeCtx = createMockContext({
        body: {
          token: accessToken,
        },
        authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      });

      const revokeResult = (await controller.revoke(
        revokeCtx as any,
      )) as MockResponse;
      expect(revokeResult.status).toBe(200);

      // Check that the token is now inactive by introspecting it
      const introspectCtx = createMockContext({
        body: {
          token: accessToken,
        },
        authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      });

      const introspectResult = (await controller.introspect(
        introspectCtx as any,
      )) as MockResponse;
      expect(introspectResult.body?.active).toBe(false);
    });
  });
});
