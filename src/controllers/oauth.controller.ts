import { Context } from "hono";
import { DatabaseService } from "../services/db.service";
import { generateToken } from "../utils/auth/jwt";
import { generateCode } from "../utils/auth/code";
import { BadRequestError, UnauthorizedError } from "../utils/errors";
import { OAUTH_SCOPES } from "../routes/oauth.routes";
import { z } from "zod";
import { verifyToken } from "../utils/auth/jwt";
import { OAuthJWTBridge } from "../utils/auth/oauth-jwt-bridge";

// Client registration request schema
const clientRegistrationSchema = z
  .object({
    client_name: z.string().min(1),
    redirect_uris: z.array(z.string().url()).optional(),
    client_uri: z.string().url().optional(),
    logo_uri: z.string().url().optional(),
    tos_uri: z.string().url().optional(),
    policy_uri: z.string().url().optional(),
    software_id: z.string().optional(),
    software_version: z.string().optional(),
    scope: z.string().optional(),
    contacts: z.array(z.string().email()).optional(),
    grant_types: z
      .array(
        z.enum(["authorization_code", "refresh_token", "client_credentials"]),
      )
      .optional(),
    token_endpoint_auth_method: z
      .enum(["client_secret_basic", "client_secret_post", "none"])
      .optional(),
    response_types: z.array(z.enum(["code"])).optional(),
  })
  .refine(
    (data) => {
      // If client credentials is the only grant type, redirect URIs are optional
      const hasClientCredentials =
        data.grant_types?.includes("client_credentials");
      const hasAuthCode = data.grant_types?.includes("authorization_code");
      const hasRedirectUris =
        data.redirect_uris && data.redirect_uris.length > 0;

      // Require redirect URIs for auth code flow
      if (hasAuthCode && !hasRedirectUris) {
        return false;
      }

      // For client credentials only, redirect URIs are optional
      if (hasClientCredentials && !hasAuthCode) {
        return true;
      }

      // Default case: require redirect URIs
      return hasRedirectUris;
    },
    {
      message: "redirect_uris are required for authorization_code grant type",
    },
  );

export class OAuthController {
  private db: DatabaseService;
  private oauthJwtBridge: OAuthJWTBridge;

  constructor(db: DatabaseService = new DatabaseService()) {
    this.db = db;
    this.oauthJwtBridge = new OAuthJWTBridge(db);
  }

  // Utility method to validate scopes
  private validateScopes(
    requestedScopes: string[],
    clientScopes: string[],
  ): string[] {
    // If no scopes requested, return empty array
    if (!requestedScopes || requestedScopes.length === 0) {
      return [];
    }

    // Get all valid scopes from OAUTH_SCOPES
    const validScopes = Object.values(OAUTH_SCOPES) as string[];

    // Filter requested scopes to only include valid ones that the client is allowed to request
    const validRequestedScopes = requestedScopes.filter(
      (scope) =>
        validScopes.includes(scope) &&
        (clientScopes.length === 0 || clientScopes.includes(scope)),
    );

    return validRequestedScopes;
  }

  // Implements RFC 7591 - OAuth 2.0 Dynamic Client Registration Protocol
  async registerClient(c: Context) {
    try {
      // Parse and validate request body
      const body = await c.req.json();
      const validationResult = clientRegistrationSchema.safeParse(body);

      if (!validationResult.success) {
        throw new BadRequestError(
          `Invalid request: ${validationResult.error.message}`,
        );
      }

      const data = validationResult.data;

      // Check if client has client_credentials without redirect URIs (headless client)
      const isHeadlessClient =
        data.grant_types?.includes("client_credentials") &&
        !data.grant_types?.includes("authorization_code");

      // Create client record
      const client = await this.db.createOAuthClient({
        name: data.client_name,
        redirectUris: data.redirect_uris || [],
        scopes: data.scope?.split(" ") || [],
        grantTypes: data.grant_types || ["authorization_code"],
        tokenEndpointAuthMethod:
          data.token_endpoint_auth_method || "client_secret_basic",
        isHeadless: isHeadlessClient,
      });

      // Generate registration access token
      const registrationToken = await generateToken({
        sub: client.id.toString(),
        type: "registration",
        scope: "registration",
      });

      // Return client information and credentials
      return c.json({
        client_id: client.id,
        client_secret: client.secret,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_secret_expires_at: 0, // Never expires
        client_name: data.client_name,
        client_uri: data.client_uri,
        redirect_uris: data.redirect_uris,
        grant_types: client.grantTypes,
        token_endpoint_auth_method:
          data.token_endpoint_auth_method || "client_secret_basic",
        response_types: ["code"],
        registration_access_token: registrationToken,
        registration_client_uri: `${new URL(c.req.url).origin}/oauth/register/${client.id}`,
        scope: client.scopes.join(" "),
      });
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      console.error("Client registration error:", error);
      throw new BadRequestError("Failed to register client");
    }
  }

  // Handle authorization code grant flow
  async authorize(c: Context) {
    // Check if this is a form submission (POST) or initial request (GET)
    if (c.req.method === "POST") {
      return this.handleAuthorizationDecision(c);
    }

    // Initial authorization request (GET) - use function form consistently
    const response_type = c.req.query("response_type");
    const client_id = c.req.query("client_id");
    const redirect_uri = c.req.query("redirect_uri");
    const scope = c.req.query("scope");
    const state = c.req.query("state");

    // Validate required parameters
    if (!response_type || !client_id || !redirect_uri) {
      throw new BadRequestError("Missing required parameters");
    }

    // Verify client
    const client = await this.db.getOAuthClient(client_id);
    if (!client) {
      throw new UnauthorizedError("Invalid client");
    }

    // Verify redirect URI
    if (!client.redirectUris.includes(redirect_uri)) {
      throw new UnauthorizedError("Invalid redirect URI");
    }

    // Validate and filter requested scopes
    const requestedScopes = scope ? scope.split(" ") : [];
    const clientScopes = client.scope ? client.scope.split(" ") : [];
    const validScopes = this.validateScopes(requestedScopes, clientScopes);

    // If requested invalid scopes, redirect with error
    if (requestedScopes.length > 0 && validScopes.length === 0) {
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.set("error", "invalid_scope");
      redirectUrl.searchParams.set(
        "error_description",
        "The requested scope is invalid or unknown",
      );
      if (state) {
        redirectUrl.searchParams.set("state", state);
      }
      return c.redirect(redirectUrl.toString());
    }

    // For now, we'll assume the user is already authenticated
    // In a real implementation, we would check for a session and redirect to login if needed

    // Render consent page with validated scopes
    const html = this.renderConsentPage({
      clientName: client.clientName,
      clientUri: client.clientUri || "",
      scopes: validScopes,
      redirectUri: redirect_uri,
      state,
      clientId: client_id,
      responseType: response_type,
    });

    return c.html(html);
  }

  // Handle the user's authorization decision
  private async handleAuthorizationDecision(c: Context) {
    const body = await c.req.parseBody();
    const { client_id, redirect_uri, scope, state, user_decision } = body;

    // Build the redirect URL
    const redirectUrl = new URL(redirect_uri as string);

    // Check if the user denied access
    if (user_decision !== "approve") {
      redirectUrl.searchParams.set("error", "access_denied");
      redirectUrl.searchParams.set(
        "error_description",
        "The user denied the authorization request",
      );
      if (state) {
        redirectUrl.searchParams.set("state", state as string);
      }
      return c.redirect(redirectUrl.toString());
    }

    // Verify client and validate scopes again
    const client = await this.db.getOAuthClient(client_id as string);
    if (!client) {
      throw new UnauthorizedError("Invalid client");
    }

    const requestedScopes = (scope as string)?.split(" ") || [];
    const clientScopes = client.scope ? client.scope.split(" ") : [];
    const validScopes = this.validateScopes(requestedScopes, clientScopes);

    // User approved - generate authorization code
    const code = await generateCode();

    // Store the authorization code with validated scopes
    await this.db.createAuthorizationCode({
      code,
      clientId: client_id as string,
      redirectUri: redirect_uri as string,
      scope: validScopes.join(" "),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Add code to redirect URL
    redirectUrl.searchParams.set("code", code);
    if (state) {
      redirectUrl.searchParams.set("state", state as string);
    }

    return c.redirect(redirectUrl.toString());
  }

  // Render a simple HTML consent page
  private renderConsentPage(params: {
    clientName: string;
    clientUri: string;
    logoUri?: string;
    scopes: string[];
    redirectUri: string;
    state?: string;
    clientId: string;
    responseType: string;
  }) {
    const scopeDescriptions: Record<string, string> = {
      "badge:create": "Create badges on your behalf",
      "badge:read": "Read your badges",
      "badge:update": "Update your badges",
      "badge:delete": "Delete your badges",
      "assertion:create": "Issue badge assertions on your behalf",
      "assertion:read": "Read your badge assertions",
      "assertion:update": "Update your badge assertions",
      "assertion:delete": "Delete your badge assertions",
      "profile:read": "Read your profile information",
      "profile:update": "Update your profile information",
      offline_access: "Access your data when you are not present",
    };

    const scopeHtml = params.scopes
      .map((scope) => {
        const description = scopeDescriptions[scope] || scope;
        return `<li><strong>${scope}</strong>: ${description}</li>`;
      })
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Request</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .client-info {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
          }
          .client-logo {
            width: 60px;
            height: 60px;
            margin-right: 15px;
            border-radius: 8px;
            object-fit: contain;
            background: #fff;
          }
          .client-name {
            font-size: 1.2em;
            font-weight: bold;
          }
          .client-uri {
            font-size: 0.9em;
            color: #666;
          }
          .scope-list {
            margin: 20px 0;
            padding-left: 20px;
          }
          .buttons {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
          }
          .btn {
            padding: 10px 20px;
            border-radius: 4px;
            border: none;
            font-size: 1em;
            cursor: pointer;
          }
          .btn-approve {
            background: #4CAF50;
            color: white;
          }
          .btn-deny {
            background: #f44336;
            color: white;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Authorization Request</h1>
          
          <div class="client-info">
            ${params.logoUri ? `<img src="${params.logoUri}" alt="${params.clientName} logo" class="client-logo">` : ""}
            <div>
              <div class="client-name">${params.clientName}</div>
              <div class="client-uri">${params.clientUri}</div>
            </div>
          </div>
          
          <p>The application is requesting permission to:</p>
          
          <ul class="scope-list">
            ${scopeHtml}
          </ul>
          
          <form method="post">
            <input type="hidden" name="client_id" value="${params.clientId}">
            <input type="hidden" name="redirect_uri" value="${params.redirectUri}">
            <input type="hidden" name="scope" value="${params.scopes.join(" ")}">
            <input type="hidden" name="state" value="${params.state || ""}">
            <input type="hidden" name="response_type" value="${params.responseType}">
            
            <div class="buttons">
              <button type="submit" name="user_decision" value="approve" class="btn btn-approve">Approve</button>
              <button type="submit" name="user_decision" value="deny" class="btn btn-deny">Deny</button>
            </div>
          </form>
        </div>
      </body>
      </html>
    `;
  }

  // Modify the token method to use our new OAuth-JWT bridge
  async token(c: Context) {
    try {
      const body = await c.req.parseBody();
      const { grant_type } = body;

      // Different grant types
      switch (grant_type) {
        case "authorization_code":
          return await this.handleAuthorizationCodeGrant(c, body);
        case "refresh_token":
          return await this.handleRefreshTokenGrant(c, body);
        case "client_credentials":
          return await this.handleClientCredentialsGrant(c, body);
        default:
          throw new BadRequestError(`Unsupported grant type: ${grant_type}`);
      }
    } catch (error) {
      if (
        error instanceof BadRequestError ||
        error instanceof UnauthorizedError
      ) {
        throw error;
      }
      console.error("Token endpoint error:", error);
      throw new BadRequestError("Token request failed");
    }
  }

  // Add the missing refresh token handler
  private async handleRefreshTokenGrant(c: Context, body: any) {
    const { refresh_token, client_id, client_secret, scope } = body;

    if (!refresh_token || !client_id || !client_secret) {
      throw new BadRequestError("Missing required parameters");
    }

    // Authenticate the client
    const client = await this.db.getOAuthClient(client_id as string);
    if (!client || client.clientSecret !== client_secret) {
      throw new UnauthorizedError("Invalid client authentication");
    }

    try {
      // Verify the refresh token
      const payload = await verifyToken(refresh_token as string, "refresh");

      // Check if the token has been revoked
      if (await this.db.isTokenRevoked(refresh_token as string)) {
        throw new UnauthorizedError("Token has been revoked");
      }

      // Get original scopes from the refresh token
      const originalScopes = (payload.scope || "").split(" ").filter(Boolean);

      // If scope parameter is provided, validate the requested scopes
      let validScopes = originalScopes;
      if (scope) {
        const requestedScopes = (scope as string).split(" ");
        // Ensure requested scopes are a subset of the original scopes
        validScopes = requestedScopes.filter((s) => originalScopes.includes(s));

        // If requested scopes are invalid, return an error
        if (requestedScopes.length > 0 && validScopes.length === 0) {
          throw new BadRequestError("Invalid scope requested");
        }
      }

      // Generate new tokens
      const accessToken = await generateToken({
        sub: payload.sub,
        type: "access",
        scope: validScopes.join(" "),
      });

      const newRefreshToken = await generateToken({
        sub: payload.sub,
        type: "refresh",
        scope: validScopes.join(" "),
      });

      // Store the access token
      await this.db.storeAccessToken({
        token: accessToken,
        clientId: client.id,
        userId: payload.sub,
        scope: validScopes.join(" "),
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
      });

      // Create a JWT token using our bridge
      await this.oauthJwtBridge.convertOAuthToJWT(
        accessToken,
        client.clientId,
        payload.sub,
        validScopes.join(" "),
      );

      // Revoke the old refresh token
      await this.db.revokeToken({
        token: refresh_token as string,
        type: "refresh",
        username: payload.sub,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      });

      // Return the tokens
      return c.json({
        access_token: accessToken,
        token_type: "Bearer",
        refresh_token: newRefreshToken,
        expires_in: 3600,
        scope: validScopes.join(" "),
      });
    } catch (error) {
      console.error("Refresh token error:", error);
      throw new UnauthorizedError("Invalid refresh token");
    }
  }

  // Update the client credentials grant to use our OAuth-JWT bridge
  private async handleClientCredentialsGrant(c: Context, body: any) {
    const { client_id, client_secret, scope } = body;

    if (!client_id || !client_secret) {
      throw new UnauthorizedError("Invalid client authentication");
    }

    // Authenticate the client
    const client = await this.db.getOAuthClient(client_id);
    if (!client || client.clientSecret !== client_secret) {
      throw new UnauthorizedError("Invalid client authentication");
    }

    // Check that client is allowed to use this grant type
    if (!client.grantTypes.includes("client_credentials")) {
      throw new BadRequestError("Client not authorized for this grant type");
    }

    // Parse and validate requested scopes
    const requestedScopes = scope ? scope.split(" ") : [];
    const clientScopes = client.scope ? client.scope.split(" ") : [];
    const validScopes = this.validateScopes(requestedScopes, clientScopes);

    if (requestedScopes.length > 0 && validScopes.length === 0) {
      throw new BadRequestError("Invalid scope");
    }

    // Generate tokens
    const accessToken = await generateToken({
      sub: client.clientId,
      type: "access",
      scope: validScopes.join(" "),
    });

    // Store the access token in the database
    await this.db.storeAccessToken({
      token: accessToken,
      clientId: client.id,
      userId: client.clientId, // Use client ID as user ID for client credentials
      scope: validScopes.join(" "),
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
    });

    // Create a JWT token using our bridge for internal use
    await this.oauthJwtBridge.createClientCredentialsJWT(
      client.clientId,
      validScopes,
    );

    // Return a standard OAuth2 token response
    return c.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      scope: validScopes.join(" "),
      // No refresh token for client credentials
    });
  }

  // Update the authorization code grant to use our OAuth-JWT bridge
  private async handleAuthorizationCodeGrant(c: Context, body: any) {
    const { code, redirect_uri, client_id, client_secret } = body;

    if (!code || !redirect_uri || !client_id) {
      throw new BadRequestError("Missing required parameters");
    }

    // Authenticate the client
    const client = await this.db.getOAuthClient(client_id);
    if (!client) {
      throw new UnauthorizedError("Invalid client");
    }

    // Verify client authentication based on token_endpoint_auth_method
    if (client.tokenEndpointAuthMethod === "client_secret_basic") {
      if (!client_secret || client.clientSecret !== client_secret) {
        throw new UnauthorizedError("Invalid client authentication");
      }
    }

    // Verify the authorization code
    const authCode = await this.db.getAuthorizationCode(code);
    if (!authCode || authCode.isUsed) {
      throw new UnauthorizedError("Invalid authorization code");
    }

    // Verify the code hasn't expired
    if (authCode.expiresAt < new Date()) {
      throw new UnauthorizedError("Authorization code expired");
    }

    // Verify the redirect URI matches
    if (authCode.redirectUri !== redirect_uri) {
      throw new UnauthorizedError("Invalid redirect URI");
    }

    // Mark the code as used to prevent replay attacks
    await this.db.deleteAuthorizationCode(code);

    // Get the client to ensure we have the client UUID
    const clientObj = await this.db.getOAuthClientById(authCode.clientId);
    if (!clientObj) {
      throw new BadRequestError("Client not found");
    }

    // Generate OAuth tokens
    const accessToken = await generateToken({
      sub: authCode.userId,
      type: "access",
      scope: authCode.scope,
    });

    const refreshToken = await generateToken({
      sub: authCode.userId,
      type: "refresh",
      scope: authCode.scope,
    });

    // Store the access token
    await this.db.storeAccessToken({
      token: accessToken,
      clientId: authCode.clientId,
      userId: authCode.userId,
      scope: authCode.scope,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
    });

    // Create a JWT token using our bridge for internal use
    await this.oauthJwtBridge.convertOAuthToJWT(
      accessToken,
      clientObj.clientId,
      authCode.userId,
      authCode.scope,
    );

    // Return the OAuth tokens
    return c.json({
      access_token: accessToken,
      token_type: "Bearer",
      refresh_token: refreshToken,
      expires_in: 3600,
      scope: authCode.scope,
    });
  }

  // Update the introspect method to use our OAuth-JWT bridge
  async introspect(c: Context) {
    try {
      const body = await c.req.parseBody();
      const { token } = body;

      if (!token) {
        return c.json({ active: false });
      }

      // Use our bridge to validate the token
      const accessToken = await this.db.getAccessToken(token as string);

      // If token not found or revoked
      if (!accessToken || accessToken.isRevoked) {
        return c.json({ active: false });
      }

      // If token expired
      if (accessToken.expiresAt < new Date()) {
        return c.json({ active: false });
      }

      // Get client information
      const client = await this.db.getOAuthClientById(accessToken.clientId);
      if (!client) {
        return c.json({ active: false });
      }

      // Token is valid, return full introspection response
      return c.json({
        active: true,
        client_id: client.clientId,
        username: accessToken.userId,
        scope: accessToken.scope,
        token_type: "Bearer",
        exp: Math.floor(accessToken.expiresAt.getTime() / 1000),
        iat: Math.floor(accessToken.createdAt.getTime() / 1000),
        sub: accessToken.userId,
        iss: new URL(c.req.url).origin,
      });
    } catch (error) {
      console.error("Token introspection error:", error);
      return c.json({ active: false });
    }
  }

  // Update the revoke method to use our OAuth-JWT bridge
  async revoke(c: Context) {
    try {
      const body = await c.req.parseBody();
      const { token } = body;

      if (!token) {
        throw new BadRequestError("Token is required");
      }

      // Use our bridge to revoke both the OAuth token and its JWT equivalent
      await this.oauthJwtBridge.revokeOAuthAndJWT(token as string);

      // RFC 7009 requires 200 OK for all revocation requests
      return c.json({});
    } catch (error) {
      console.error("Token revocation error:", error);
      // Always return 200 OK per RFC 7009
      return c.json({});
    }
  }
}
