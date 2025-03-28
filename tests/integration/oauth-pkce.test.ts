import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { honoApp as app } from "../../src/index";
import { DatabaseService } from "../../src/services/db.service";
import { generateCodeChallenge, verifyPKCE } from "../../src/utils/auth/pkce";
import { generateCode } from "../../src/utils/auth/code";

interface OAuthErrorResponse {
  error: string;
  error_description: string;
}

interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

describe("OAuth PKCE Integration Tests", () => {
  let db: DatabaseService;
  let testClientId: string;

  beforeAll(async () => {
    db = new DatabaseService();

    // Create a test client
    const client = await db.createOAuthClient({
      name: "Test PKCE Client",
      redirectUris: ["http://localhost:3000/callback"],
      scopes: ["profile:read"],
      grantTypes: ["authorization_code"],
      tokenEndpointAuthMethod: "none", // Public client
      clientUri: "http://localhost:3000",
      isHeadless: false,
    });

    testClientId = client.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.deleteOAuthClientById(testClientId);
  });

  describe("Authorization Endpoint with PKCE", () => {
    it("should require PKCE for public clients", async () => {
      const req = new Request(
        "http://localhost:3000/oauth/authorize?" +
          new URLSearchParams({
            response_type: "code",
            client_id: testClientId,
            redirect_uri: "http://localhost:3000/callback",
          }),
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(400);

      const body = (await res.json()) as OAuthErrorResponse;
      expect(body.error).toBe("invalid_request");
      expect(body.error_description).toBe(
        "PKCE is required for public clients",
      );
    });

    it("should accept valid PKCE parameters", async () => {
      const codeVerifier = generateCode();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      const req = new Request(
        "http://localhost:3000/oauth/authorize?" +
          new URLSearchParams({
            response_type: "code",
            client_id: testClientId,
            redirect_uri: "http://localhost:3000/callback",
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
          }),
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(302); // Redirect to login
      expect(res.headers.get("Location")).toContain("/login");
    });

    it("should reject invalid code challenge methods", async () => {
      const req = new Request(
        "http://localhost:3000/oauth/authorize?" +
          new URLSearchParams({
            response_type: "code",
            client_id: testClientId,
            redirect_uri: "http://localhost:3000/callback",
            code_challenge: "test_challenge",
            code_challenge_method: "invalid_method",
          }),
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(400);

      const body = (await res.json()) as OAuthErrorResponse;
      expect(body.error).toBe("invalid_request");
      expect(body.error_description).toBe("Unsupported code challenge method");
    });
  });

  describe("Token Endpoint with PKCE", () => {
    it("should require code verifier when code challenge was used", async () => {
      const req = new Request("http://localhost:3000/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: "test_code",
          redirect_uri: "http://localhost:3000/callback",
          client_id: testClientId,
        }),
      });

      const res = await app.fetch(req);
      expect(res.status).toBe(400);

      const body = (await res.json()) as OAuthErrorResponse;
      expect(body.error).toBe("invalid_request");
      expect(body.error_description).toBe(
        "Code verifier required for PKCE flow",
      );
    });

    it("should verify PKCE code verifier", async () => {
      const codeVerifier = generateCode();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // First, store a test authorization code with PKCE
      await db.createAuthorizationCode({
        code: "test_code_pkce",
        clientId: testClientId,
        userId: "test_user",
        redirectUri: "http://localhost:3000/callback",
        scope: "profile:read",
        expiresAt: new Date(Date.now() + 600000),
        codeChallenge,
        codeChallengeMethod: "S256",
      });

      const req = new Request("http://localhost:3000/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: "test_code_pkce",
          redirect_uri: "http://localhost:3000/callback",
          client_id: testClientId,
          code_verifier: codeVerifier,
        }),
      });

      const res = await app.fetch(req);
      expect(res.status).toBe(200);

      const body = (await res.json()) as OAuthTokenResponse;
      expect(body.access_token).toBeDefined();
    });

    it("should reject invalid code verifier", async () => {
      const codeVerifier = generateCode();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Store a test authorization code with PKCE
      await db.createAuthorizationCode({
        code: "test_code_pkce_invalid",
        clientId: testClientId,
        userId: "test_user",
        redirectUri: "http://localhost:3000/callback",
        scope: "profile:read",
        expiresAt: new Date(Date.now() + 600000),
        codeChallenge,
        codeChallengeMethod: "S256",
      });

      const req = new Request("http://localhost:3000/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: "test_code_pkce_invalid",
          redirect_uri: "http://localhost:3000/callback",
          client_id: testClientId,
          code_verifier: "invalid_verifier",
        }),
      });

      const res = await app.fetch(req);
      expect(res.status).toBe(400);

      const body = (await res.json()) as OAuthErrorResponse;
      expect(body.error).toBe("invalid_grant");
      expect(body.error_description).toBe("Invalid code verifier");
    });
  });

  describe("PKCE Utility Functions", () => {
    it("should verify valid PKCE code verifier with S256", async () => {
      const codeVerifier = generateCode();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      const isValid = verifyPKCE(codeVerifier, codeChallenge, "S256");
      expect(isValid).toBe(true);
    });

    it("should verify valid PKCE code verifier with plain method", () => {
      const codeVerifier = generateCode();
      const isValid = verifyPKCE(codeVerifier, codeVerifier, "plain");
      expect(isValid).toBe(true);
    });

    it("should reject invalid PKCE code verifier", async () => {
      const codeVerifier = generateCode();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      const isValid = verifyPKCE("invalid_verifier", codeChallenge, "S256");
      expect(isValid).toBe(false);
    });

    it("should reject unsupported challenge methods", () => {
      const codeVerifier = generateCode();
      const isValid = verifyPKCE(codeVerifier, codeVerifier, "unsupported");
      expect(isValid).toBe(false);
    });
  });
});
