import { Context } from "hono";
import { DatabaseService } from "../services/db.service";
import { generateToken } from "../utils/auth/jwt";
import { generateCode } from "../utils/auth/code";
import { BadRequestError, UnauthorizedError } from "../utils/errors";
import { OAUTH_SCOPES } from "../routes/oauth.routes";
import { z } from "zod";
import { verifyToken } from "../utils/auth/jwt";

// Client registration request schema
const clientRegistrationSchema = z.object({
  client_name: z.string().min(1),
  redirect_uris: z.array(z.string().url()).min(1),
  client_uri: z.string().url().optional(),
  logo_uri: z.string().url().optional(),
  tos_uri: z.string().url().optional(),
  policy_uri: z.string().url().optional(),
  software_id: z.string().optional(),
  software_version: z.string().optional(),
  scope: z.string().optional(),
  contacts: z.array(z.string().email()).optional(),
  grant_types: z
    .array(z.enum(["authorization_code", "refresh_token"]))
    .optional(),
  token_endpoint_auth_method: z
    .enum(["client_secret_basic", "client_secret_post", "none"])
    .optional(),
  response_types: z.array(z.enum(["code"])).optional(),
});

export class OAuthController {
  private db: DatabaseService;

  constructor(db: DatabaseService = new DatabaseService()) {
    this.db = db;
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

      // Create client record
      const client = await this.db.createOAuthClient({
        name: data.client_name,
        redirectUris: data.redirect_uris,
        scopes: data.scope?.split(" ") || [],
        grantTypes: data.grant_types || ["authorization_code"],
        tokenEndpointAuthMethod:
          data.token_endpoint_auth_method || "client_secret_basic",
      });

      // Generate registration access token
      const registrationToken = await generateToken({
        sub: client.id.toString(),
        type: "registration",
        scope: "registration",
      });

      // Return client information
      return c.json(
        {
          client_id: client.id,
          client_secret: client.secret,
          client_id_issued_at: Math.floor(Date.now() / 1000),
          client_secret_expires_at: 0, // Never expires
          registration_access_token: registrationToken,
          registration_client_uri: `${c.req.url}/${client.id}`,
          redirect_uris: data.redirect_uris,
          grant_types: data.grant_types || ["authorization_code"],
          token_endpoint_auth_method:
            data.token_endpoint_auth_method || "client_secret_basic",
          response_types: data.response_types || ["code"],
          client_name: data.client_name,
          client_uri: data.client_uri,
          logo_uri: data.logo_uri,
          scope: data.scope,
          contacts: data.contacts,
          tos_uri: data.tos_uri,
          policy_uri: data.policy_uri,
          software_id: data.software_id,
          software_version: data.software_version,
        },
        201,
      );
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

  // Handle token requests for authorization code and refresh token grants
  async token(c: Context) {
    try {
      const body = await c.req.json();
      const {
        grant_type,
        code,
        redirect_uri,
        refresh_token,
        client_id,
        client_secret,
        scope,
      } = body;

      // Validate required parameters
      if (!grant_type) {
        throw new BadRequestError("Missing grant_type parameter");
      }

      // Validate client credentials
      if (!client_id || !client_secret) {
        throw new UnauthorizedError("Missing client credentials");
      }

      const client = await this.db.getOAuthClient(client_id as string);
      if (!client || client.clientSecret !== client_secret) {
        throw new UnauthorizedError("Invalid client credentials");
      }

      let tokenResponse;

      if (grant_type === "authorization_code") {
        // Validate required parameters for authorization code grant
        if (!code || !redirect_uri) {
          throw new BadRequestError(
            "Missing required parameters for authorization code grant",
          );
        }

        // Verify authorization code
        const authCode = await this.db.getAuthorizationCode(code as string);
        if (!authCode) {
          throw new UnauthorizedError("Invalid authorization code");
        }

        // Verify the code belongs to this client and redirect URI
        if (
          authCode.clientId !== client.id ||
          authCode.redirectUri !== redirect_uri
        ) {
          throw new UnauthorizedError(
            "Invalid authorization code for this client or redirect URI",
          );
        }

        // Check if the code has expired
        if (new Date() > authCode.expiresAt) {
          throw new UnauthorizedError("Authorization code has expired");
        }

        // Check if the code has already been used
        if (authCode.isUsed) {
          throw new UnauthorizedError(
            "Authorization code has already been used",
          );
        }

        // Validate scopes from the authorization code
        const codeScopes = authCode.scope.split(" ");
        const clientScopes = client.scope ? client.scope.split(" ") : [];
        const validScopes = this.validateScopes(codeScopes, clientScopes);

        // Generate tokens with validated scopes
        const accessToken = await generateToken({
          sub: client.clientId,
          scope: validScopes.join(" "),
          type: "access",
        });

        const refreshToken = await generateToken({
          sub: client.clientId,
          scope: validScopes.join(" "),
          type: "refresh",
        });

        // Mark the code as used
        await this.db.deleteAuthorizationCode(code as string);

        // Return the token response
        tokenResponse = {
          access_token: accessToken,
          token_type: "Bearer",
          expires_in: 3600, // 1 hour
          refresh_token: refreshToken,
          scope: validScopes.join(" "),
        };
      } else if (grant_type === "refresh_token") {
        // Validate required parameters for refresh token grant
        if (!refresh_token) {
          throw new BadRequestError("Missing refresh_token parameter");
        }

        try {
          // Verify the refresh token
          const payload = await verifyToken(refresh_token as string);

          // Check if the token is a refresh token
          if (payload.type !== "refresh") {
            throw new UnauthorizedError("Invalid token type");
          }

          // Check if the token belongs to this client
          if (payload.sub !== client.clientId) {
            throw new UnauthorizedError("Token does not belong to this client");
          }

          // Check if the token has been revoked
          if (await this.db.isTokenRevoked(refresh_token as string)) {
            throw new UnauthorizedError("Token has been revoked");
          }

          // Get original scopes from the refresh token
          const originalScopes = (payload.scope || "")
            .split(" ")
            .filter(Boolean);

          // If scope parameter is provided, validate the requested scopes
          let validScopes = originalScopes;
          if (scope) {
            const requestedScopes = (scope as string).split(" ");
            // Ensure requested scopes are a subset of the original scopes
            validScopes = requestedScopes.filter((s) =>
              originalScopes.includes(s),
            );

            // If requested scopes are invalid, return an error
            if (requestedScopes.length > 0 && validScopes.length === 0) {
              throw new BadRequestError("Invalid scope requested");
            }
          }

          // Generate a new access token with validated scopes
          const accessToken = await generateToken({
            sub: client.clientId,
            scope: validScopes.join(" "),
            type: "access",
          });

          // Return the token response
          tokenResponse = {
            access_token: accessToken,
            token_type: "Bearer",
            expires_in: 3600, // 1 hour
            scope: validScopes.join(" "),
          };
        } catch {
          throw new UnauthorizedError("Invalid refresh token");
        }
      } else {
        throw new BadRequestError(`Unsupported grant type: ${grant_type}`);
      }

      return c.json(tokenResponse);
    } catch (error) {
      if (
        error instanceof BadRequestError ||
        error instanceof UnauthorizedError
      ) {
        throw error;
      }
      console.error("Token endpoint error:", error);
      throw new BadRequestError("Failed to process token request");
    }
  }

  // Implements RFC 7662 - OAuth 2.0 Token Introspection
  async introspect(c: Context) {
    try {
      const body = await c.req.json();
      const { token } = body;
      const clientId = c.req.header("Authorization")?.split(" ")[1];

      // Validate required parameters
      if (!token) {
        throw new BadRequestError("Missing token parameter");
      }

      // Validate client authentication
      if (!clientId) {
        throw new UnauthorizedError("Client authentication required");
      }

      // Verify client
      const client = await this.db.getOAuthClient(clientId);
      if (!client) {
        throw new UnauthorizedError("Invalid client");
      }

      try {
        // Check if the token has been revoked
        if (await this.db.isTokenRevoked(token as string)) {
          return c.json({ active: false });
        }

        // Verify the token
        const payload = await verifyToken(token as string);

        // Check if the token has expired
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          return c.json({ active: false });
        }

        // Return the introspection response
        return c.json({
          active: true,
          client_id: payload.sub,
          scope: payload.scope,
          token_type: payload.type === "access" ? "Bearer" : payload.type,
          exp: payload.exp,
          iat: payload.iat,
          sub: payload.sub,
          jti: payload.jti,
        });
      } catch {
        // Token is inactive
        return c.json({ active: false });
      }
    } catch (error) {
      if (
        error instanceof BadRequestError ||
        error instanceof UnauthorizedError
      ) {
        throw error;
      }
      console.error("Token introspection error:", error);
      throw new BadRequestError("Failed to process introspection request");
    }
  }

  // Implements RFC 7009 - OAuth 2.0 Token Revocation
  async revoke(c: Context) {
    try {
      const body = await c.req.json();
      const { token } = body;
      const clientId = c.req.header("Authorization")?.split(" ")[1];

      // Validate required parameters
      if (!token) {
        throw new BadRequestError("Missing token parameter");
      }

      // Validate client authentication
      if (!clientId) {
        throw new UnauthorizedError("Client authentication required");
      }

      // Verify client
      const client = await this.db.getOAuthClient(clientId);
      if (!client) {
        throw new UnauthorizedError("Invalid client");
      }

      try {
        // Check if the token is already revoked
        if (await this.db.isTokenRevoked(token as string)) {
          // RFC 7009 requires 200 OK even if token is already revoked
          return c.json({}, 200);
        }

        // Verify the token
        const payload = await verifyToken(token as string);

        // Check if the token belongs to this client
        if (payload.sub !== client.clientId) {
          // RFC 7009 requires 200 OK even if token doesn't belong to client
          return c.json({}, 200);
        }

        // Revoke the token
        await this.db.revokeToken({
          token: token as string,
          type: payload.type as string,
          username: payload.sub,
          expiresAt: new Date(payload.exp! * 1000),
        });

        return c.json({}, 200);
      } catch {
        // Return success even for invalid tokens (per RFC 7009)
        return c.json({}, 200);
      }
    } catch (error) {
      if (
        error instanceof BadRequestError ||
        error instanceof UnauthorizedError
      ) {
        throw error;
      }
      console.error("Token revocation error:", error);
      throw new BadRequestError("Failed to process revocation request");
    }
  }
}
