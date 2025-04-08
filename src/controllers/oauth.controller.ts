import { Context } from "hono";
import { DatabaseService } from "../services/db.service";
import { generateToken } from "../utils/auth/jwt";
import { generateCode } from "../utils/auth/code";
import { BadRequestError, UnauthorizedError } from "../utils/errors";
import { OAUTH_SCOPES } from "../routes/oauth.routes";
import { z } from "zod";
import { verifyToken } from "../utils/auth/jwt";
import { OAuthJWTBridge } from "../utils/auth/oauth-jwt-bridge";
import { verifyPKCE } from "../utils/auth/pkce";
import { verifyJar } from "../utils/auth/jar";
import { VerificationService } from "../services/verification.service";
import logger from "@/utils/logger";
import { type Logger as PinoLogger } from "pino";

// Basic JWK schema (can be expanded if more validation is needed)
const jwkSchema = z
  .object({
    kty: z.string().optional(),
    kid: z.string().optional(),
    use: z.string().optional(),
    alg: z.string().optional(),
    // Add other common JWK properties as needed (e.g., n, e, crv, x, y)
  })
  .passthrough(); // Allow other properties not explicitly defined

// JWKS schema based on RFC 7517
const jwksSchema = z.object({
  keys: z.array(jwkSchema),
});

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
    // JAR (Request Object) related fields
    jwks: jwksSchema.optional(),
    jwks_uri: z.string().url().optional(),
    request_object_signing_alg: z.string().optional(), // Specific algs could be listed with z.enum()
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
  )
  // Add refinement for JWKS/JWKS URI - must provide one if alg is specified
  .refine(
    (data) => {
      if (data.request_object_signing_alg) {
        return data.jwks || data.jwks_uri;
      }
      return true; // No alg specified, so no JWKS needed
    },
    {
      message:
        "Either jwks or jwks_uri must be provided if request_object_signing_alg is specified",
      path: ["jwks"], // Associate error with jwks/jwks_uri field
    },
  )
  // Add refinement that jwks and jwks_uri cannot both be provided
  .refine((data) => !(data.jwks && data.jwks_uri), {
    message: "Cannot provide both jwks and jwks_uri",
    path: ["jwks_uri"],
  });

export class OAuthController {
  private db: DatabaseService;
  private oauthJwtBridge: OAuthJWTBridge;
  private verificationService: VerificationService;
  private logger: PinoLogger;

  constructor(db: DatabaseService = new DatabaseService()) {
    this.db = db;
    this.oauthJwtBridge = new OAuthJWTBridge(db);
    this.verificationService = new VerificationService();
    this.logger = logger.child({ context: "OAuthController" });
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
      const createdClientInfo = await this.db.createOAuthClient({
        name: data.client_name,
        redirectUris: data.redirect_uris || [],
        scopes: data.scope?.split(" ") || [],
        grantTypes: data.grant_types || ["authorization_code"],
        tokenEndpointAuthMethod:
          data.token_endpoint_auth_method || "client_secret_basic",
        clientUri: data.client_uri,
        logoUri: data.logo_uri,
        isHeadless: isHeadlessClient,
        // Pass JAR fields
        jwks: data.jwks,
        jwksUri: data.jwks_uri,
        requestObjectSigningAlg: data.request_object_signing_alg,
      });

      // Fetch the full client details to get all properties
      const client = await this.db.getOAuthClient(createdClientInfo.id);
      if (!client) {
        // This should theoretically not happen, but handle defensively
        throw new BadRequestError("Failed to retrieve newly created client");
      }

      // Generate registration access token
      const registrationToken = await generateToken({
        sub: client.id.toString(),
        type: "registration",
        scope: "registration",
      });

      // Return client information and credentials
      return c.json({
        client_id: client.clientId,
        client_secret: client.clientSecret,
        client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
        client_secret_expires_at: 0, // Never expires
        client_name: client.clientName,
        client_uri: client.clientUri,
        redirect_uris: client.redirectUris,
        grant_types: client.grantTypes,
        token_endpoint_auth_method: client.tokenEndpointAuthMethod,
        response_types: client.responseTypes,
        // Include JAR config in response
        jwks: client.jwks,
        jwks_uri: client.jwksUri,
        request_object_signing_alg: client.requestObjectSigningAlg,
        registration_access_token: registrationToken,
        registration_client_uri: `${new URL(c.req.url).origin}/oauth/register/${client.id}`,
        scope: client.scope,
      });
    } catch (error) {
      this.logger.error(error, "Client registration failed:");
      if (error instanceof BadRequestError) {
        return c.json(
          { error: "invalid_request", error_description: error.message },
          400,
        );
      }
      return c.json(
        {
          error: "server_error",
          error_description: "Failed to register client",
        },
        500,
      );
    }
  }

  // Handle authorization code grant flow
  async authorize(c: Context): Promise<Response> {
    try {
      const query = c.req.query();
      let {
        response_type,
        client_id,
        redirect_uri,
        scope,
        state,
        code_challenge,
        code_challenge_method,
      } = query;
      const requestJwt = query.request;

      // Validate required parameters
      if (!response_type || !client_id) {
        throw new BadRequestError("Missing required parameters");
      }

      // Only support 'code' response type for now
      if (response_type !== "code") {
        throw new BadRequestError("Unsupported response type");
      }

      // Get client information
      let client = await this.db.getOAuthClient(client_id);
      if (!client) {
        throw new BadRequestError("Invalid client");
      }

      // For public clients, require PKCE
      if (client.tokenEndpointAuthMethod === "none" && !code_challenge) {
        throw new BadRequestError("PKCE is required for public clients");
      }

      // Validate PKCE parameters if provided
      if (code_challenge) {
        // Validate challenge method
        if (
          code_challenge_method &&
          !["plain", "S256"].includes(code_challenge_method)
        ) {
          throw new BadRequestError("Unsupported code challenge method");
        }

        // Validate challenge format
        if (!/^[A-Za-z0-9-._~]{43,128}$/.test(code_challenge)) {
          throw new BadRequestError("Invalid code challenge format");
        }
      }

      // Check if this is a form submission (POST) or initial request (GET)
      if (c.req.method === "POST") {
        return this.handleAuthorizationDecision(c);
      }

      // Process JAR if present
      if (requestJwt) {
        const issuerUrl = new URL(c.req.url).origin;
        try {
          const jarResult = await verifyJar(
            requestJwt,
            client.clientId,
            issuerUrl,
            this.verificationService,
          );
          const jarPayload = jarResult.payload;

          response_type = jarPayload.response_type as string;
          redirect_uri = jarPayload.redirect_uri as string;
          scope = jarPayload.scope ?? scope;
          state = jarPayload.state ?? state;
          code_challenge = jarPayload.code_challenge ?? code_challenge;
          code_challenge_method =
            jarPayload.code_challenge_method ?? code_challenge_method;

          if (!redirect_uri) {
            throw new BadRequestError("redirect_uri missing in request object");
          }
          if (!client.redirectUris.includes(redirect_uri)) {
            throw new BadRequestError(
              "Request object redirect_uri is not registered for this client",
            );
          }
        } catch (error) {
          this.logger.error("JAR verification failed:", error);
          throw error;
        }
      }

      if (!response_type || !redirect_uri) {
        throw new BadRequestError(
          "Missing required parameters (response_type, redirect_uri after potential JAR processing)",
        );
      }

      if (!client.redirectUris.includes(redirect_uri)) {
        let errorRedirect =
          client.redirectUris.length > 0 ? client.redirectUris[0] : null;
        if (errorRedirect) {
          const errorUrl = new URL(errorRedirect);
          errorUrl.searchParams.set("error", "invalid_request");
          errorUrl.searchParams.set(
            "error_description",
            "Invalid redirect URI",
          );
          if (state) errorUrl.searchParams.set("state", state);
          return c.redirect(errorUrl.toString());
        } else {
          throw new UnauthorizedError(
            "Invalid redirect URI and no registered URI to redirect error",
          );
        }
      }

      if (
        code_challenge &&
        code_challenge_method &&
        code_challenge_method !== "plain" &&
        code_challenge_method !== "S256"
      ) {
        const redirectUrl = new URL(redirect_uri);
        redirectUrl.searchParams.set("error", "invalid_request");
        redirectUrl.searchParams.set(
          "error_description",
          "Unsupported code challenge method",
        );
        if (state) redirectUrl.searchParams.set("state", state);
        return c.redirect(redirectUrl.toString());
      }

      const requestedScopes = scope ? scope.split(" ") : [];
      const clientScopes = client.scope ? client.scope.split(" ") : [];
      const validScopes = this.validateScopes(requestedScopes, clientScopes);

      if (requestedScopes.length > 0 && validScopes.length === 0) {
        const redirectUrl = new URL(redirect_uri);
        redirectUrl.searchParams.set("error", "invalid_scope");
        redirectUrl.searchParams.set(
          "error_description",
          "The requested scope is invalid or unknown",
        );
        if (state) redirectUrl.searchParams.set("state", state);
        return c.redirect(redirectUrl.toString());
      }

      const user = await this.getUserFromContext(c);
      if (!user) {
        const returnTo = new URL(c.req.url);
        return c.redirect(
          `/login?returnTo=${encodeURIComponent(returnTo.toString())}`,
        );
      }

      try {
        const consentRecord = await this.db.getConsentRecord(
          user.id,
          client.id,
        );

        if (consentRecord) {
          const consentedScopes = consentRecord.scope.split(" ");
          const allScopesConsented = validScopes.every((scope) =>
            consentedScopes.includes(scope),
          );

          if (allScopesConsented) {
            return this.issueAuthorizationCode(c, {
              userId: user.id,
              clientId: client.id,
              redirectUri: redirect_uri,
              scope: validScopes.join(" "),
              state,
              codeChallenge: code_challenge,
              codeChallengeMethod: code_challenge_method,
            });
          }
        }

        // Show consent page using final parameter values
        // Wrap the HTML string in c.html() to return a Response
        return c.html(
          this.renderConsentPage({
            clientName: client.clientName,
            clientUri: client.clientUri || "",
            logoUri: client.logoUri || undefined,
            scopes: validScopes,
            redirectUri: redirect_uri,
            state,
            clientId: client_id,
            responseType: response_type,
            codeChallenge: code_challenge,
            codeChallengeMethod: code_challenge_method,
          }),
        );
      } catch (error) {
        this.logger.error("Error during consent check/rendering:", error);
        if (client.redirectUris.includes(redirect_uri)) {
          const errorUrl = new URL(redirect_uri);
          errorUrl.searchParams.set("error", "server_error");
          errorUrl.searchParams.set(
            "error_description",
            "Failed to process authorization request",
          );
          if (state) errorUrl.searchParams.set("state", state);
          try {
            return c.redirect(errorUrl.toString());
          } catch (redirectError) {
            this.logger.error("Failed to redirect error:", redirectError);
          }
        }
        throw new BadRequestError("Failed to process authorization request");
      }
    } catch (error) {
      this.logger.error(error, "Authorization error:");
      if (error instanceof BadRequestError) {
        return c.html(`<h1>Error</h1><p>${error.message}</p>`, 400);
      }
      return c.html("<h1>Internal Server Error</h1>", 500);
    }
  }

  // Handle the user's authorization decision
  private async handleAuthorizationDecision(c: Context) {
    try {
      const formData = await c.req.parseBody();
      const clientId = formData.client_id as string;
      const redirectUri = formData.redirect_uri as string;
      const state = formData.state as string;
      const scope = formData.scope as string;
      const approved = formData.approved === "true";
      // PKCE parameters
      const codeChallenge = formData.code_challenge as string;
      const codeChallengeMethod = formData.code_challenge_method as string;
      const remember = formData.remember === "true";

      // Get user from context
      const user = await this.getUserFromContext(c);
      if (!user) {
        throw new UnauthorizedError("User not authenticated");
      }

      // Get the client
      const client = await this.db.getOAuthClientById(clientId);
      if (!client) {
        throw new BadRequestError("Invalid client");
      }

      // If the user denied the request, redirect with error
      if (!approved) {
        const redirectUrl = new URL(redirectUri);
        redirectUrl.searchParams.set("error", "access_denied");
        redirectUrl.searchParams.set(
          "error_description",
          "The resource owner denied the request",
        );
        if (state) {
          redirectUrl.searchParams.set("state", state);
        }
        return c.redirect(redirectUrl.toString());
      }

      // Store the consent if the user opted to remember it
      if (remember) {
        // Look for existing consent
        const existingConsent = await this.db.getConsentRecord(
          user.id,
          clientId,
        );

        if (existingConsent) {
          // Update existing consent
          const combinedScopes = new Set([
            ...existingConsent.scope.split(" "),
            ...scope.split(" "),
          ]);

          await this.db.updateConsentRecord(user.id, clientId, {
            scope: Array.from(combinedScopes).join(" "),
          });
        } else {
          // Create new consent record
          await this.db.createConsentRecord({
            userId: user.id,
            clientId: clientId,
            scope: scope,
          });
        }
      }

      // Issue the authorization code
      return this.issueAuthorizationCode(c, {
        userId: user.id,
        clientId: clientId,
        redirectUri: redirectUri,
        scope: scope,
        state,
        codeChallenge,
        codeChallengeMethod,
      });
    } catch (error) {
      this.logger.error("Authorization decision handling error:", error);
      return c.html("<h1>Internal Server Error</h1>", 500);
    }
  }

  // Helper method to issue authorization codes
  private async issueAuthorizationCode(
    c: Context,
    params: {
      userId: string;
      clientId: string;
      redirectUri: string;
      scope: string;
      state?: string;
      codeChallenge?: string;
      codeChallengeMethod?: string;
    },
  ) {
    // Generate authorization code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store the authorization code
    await this.db.createAuthorizationCode({
      code,
      clientId: params.clientId,
      userId: params.userId,
      redirectUri: params.redirectUri,
      scope: params.scope,
      expiresAt,
      // Store PKCE params if provided
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
    });

    // Create the redirect URL with the code
    const redirectUrl = new URL(params.redirectUri);
    redirectUrl.searchParams.set("code", code);
    if (params.state) {
      redirectUrl.searchParams.set("state", params.state);
    }

    // Redirect to the client
    return c.redirect(redirectUrl.toString());
  }

  // Render consent page HTML with hidden fields for all parameters
  private renderConsentPage(params: {
    clientName: string;
    clientUri: string;
    logoUri?: string;
    scopes: string[];
    redirectUri: string;
    state?: string;
    clientId: string;
    responseType: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
  }) {
    // Render consent page HTML with hidden fields for all parameters
    const scopeDescriptions: Record<string, string> = {
      // Map of scope to human-readable description
      [OAUTH_SCOPES.PROFILE_READ]: "View your basic profile information",
      [OAUTH_SCOPES.BADGE_READ]: "View your badges",
      [OAUTH_SCOPES.ASSERTION_READ]: "View your badge assertions",
      [OAUTH_SCOPES.BADGE_CREATE]: "Create badges on your behalf",
      [OAUTH_SCOPES.BADGE_UPDATE]: "Update your badges",
      [OAUTH_SCOPES.BADGE_DELETE]: "Delete your badges",
      [OAUTH_SCOPES.ASSERTION_CREATE]: "Issue badge assertions on your behalf",
      [OAUTH_SCOPES.ASSERTION_UPDATE]: "Update your badge assertions",
      [OAUTH_SCOPES.ASSERTION_DELETE]: "Delete your badge assertions",
      [OAUTH_SCOPES.PROFILE_UPDATE]: "Update your profile information",
      [OAUTH_SCOPES.OFFLINE_ACCESS]:
        "Access your data when you're not using the app",
    };

    const scopeHtml = params.scopes
      .map((scope) => {
        const description = scopeDescriptions[scope] || scope;
        return `
          <div class="scope">
            <input type="checkbox" name="scope_${scope}" id="scope_${scope}" checked disabled>
            <label for="scope_${scope}">${description}</label>
          </div>
        `;
      })
      .join("");

    // Include all parameters as hidden fields
    const hiddenFields = `
      <input type="hidden" name="client_id" value="${params.clientId}">
      <input type="hidden" name="redirect_uri" value="${params.redirectUri}">
      <input type="hidden" name="response_type" value="${params.responseType}">
      <input type="hidden" name="scope" value="${params.scopes.join(" ")}">
      ${params.state ? `<input type="hidden" name="state" value="${params.state}">` : ""}
      ${params.codeChallenge ? `<input type="hidden" name="code_challenge" value="${params.codeChallenge}">` : ""}
      ${params.codeChallengeMethod ? `<input type="hidden" name="code_challenge_method" value="${params.codeChallengeMethod}">` : ""}
    `;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authorize Application</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              max-width: 500px;
              margin: 0 auto;
              padding: 2rem;
            }
            .header {
              text-align: center;
              margin-bottom: 2rem;
            }
            .client-info {
              display: flex;
              align-items: center;
              margin-bottom: 1rem;
            }
            .client-logo {
              width: 64px;
              height: 64px;
              margin-right: 1rem;
              border-radius: 8px;
            }
            .scopes {
              margin: 2rem 0;
              border: 1px solid #eee;
              padding: 1rem;
              border-radius: 8px;
            }
            .scope {
              margin-bottom: 0.5rem;
            }
            .buttons {
              display: flex;
              justify-content: space-between;
              margin-top: 2rem;
            }
            .btn {
              padding: 0.75rem 1.5rem;
              border-radius: 4px;
              border: none;
              font-size: 1rem;
              cursor: pointer;
            }
            .btn-approve {
              background-color: #4CAF50;
              color: white;
            }
            .btn-deny {
              background-color: #f44336;
              color: white;
            }
            .remember {
              margin-top: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Authorization Request</h1>
            <p>The application <strong>${params.clientName}</strong> wants to access your account.</p>
          </div>
          
          <div class="client-info">
            ${params.logoUri ? `<img class="client-logo" src="${params.logoUri}" alt="${params.clientName} logo">` : ""}
            <div>
              <h2>${params.clientName}</h2>
              ${params.clientUri ? `<a href="${params.clientUri}" target="_blank">${params.clientUri}</a>` : ""}
            </div>
          </div>
          
          <div class="scopes">
            <h3>This application will be able to:</h3>
            ${scopeHtml}
          </div>
          
          <form method="post">
            ${hiddenFields}
            
            <div class="remember">
              <input type="checkbox" name="remember" id="remember" value="true">
              <label for="remember">Remember this decision</label>
            </div>
            
            <div class="buttons">
              <button type="submit" name="approved" value="true" class="btn btn-approve">Approve</button>
              <button type="submit" name="approved" value="false" class="btn btn-deny">Deny</button>
            </div>
          </form>
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
      this.logger.error(error, "Token endpoint error:");
      if (
        error instanceof BadRequestError ||
        error instanceof UnauthorizedError
      ) {
        throw error;
      }
      return c.json(
        { error: "server_error", error_description: "Internal server error" },
        500,
      );
    }
  }

  private async handleRefreshTokenGrant(
    c: Context,
    body: Record<string, unknown>,
  ) {
    const { refresh_token, client_id, client_secret, scope } = body as {
      refresh_token: string;
      client_id: string;
      client_secret?: string;
      scope?: string;
    };

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

      // Use generateCode for opaque refresh token
      const newRefreshToken = generateCode();

      // Store the access token
      await this.db.storeAccessToken({
        token: accessToken,
        clientId: client.id,
        userId: payload.sub,
        scope: validScopes.join(" "),
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
      });

      // Store the new opaque refresh token
      await this.db.createRefreshToken({
        token: newRefreshToken,
        clientId: client.id,
        userId: payload.sub,
        scope: validScopes.join(" "),
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), // 30 days
      });

      // Create a JWT token using our bridge
      await this.oauthJwtBridge.convertOAuthToJWT(
        accessToken,
        client.clientId,
        payload.sub,
        validScopes.join(" "),
      );

      // Revoke the old refresh token (assuming it was a JWT)
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
      this.logger.error("Refresh token grant error:", error);
      if (error instanceof BadRequestError) {
        return c.json(
          { error: "invalid_request", error_description: error.message },
          400,
        );
      }
      if (error instanceof UnauthorizedError) {
        return c.json(
          { error: "invalid_grant", error_description: error.message },
          400,
        );
      }
      return c.json(
        { error: "server_error", error_description: "Internal server error" },
        500,
      );
    }
  }

  private async handleClientCredentialsGrant(
    c: Context,
    body: Record<string, unknown>,
  ) {
    const { client_id, client_secret, scope } = body as {
      client_id: string;
      client_secret?: string;
      scope?: string;
    };

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

  private async handleAuthorizationCodeGrant(
    c: Context,
    body: Record<string, unknown>,
  ) {
    const {
      code,
      redirect_uri,
      client_id,
      client_secret,
      code_verifier, // PKCE code verifier
    } = body as {
      code: string;
      redirect_uri: string;
      client_id: string;
      client_secret?: string;
      code_verifier?: string;
    };

    // Validate required parameters
    if (!code || !redirect_uri || !client_id) {
      throw new BadRequestError("Missing required parameters");
    }

    // Verify client credentials
    const client = await this.db.getOAuthClient(client_id);
    if (!client) {
      throw new UnauthorizedError("Invalid client");
    }

    // For confidential clients, validate client secret if auth method requires it
    if (
      client.tokenEndpointAuthMethod !== "none" &&
      client_secret !== client.clientSecret
    ) {
      throw new UnauthorizedError("Invalid client credentials");
    }

    // Find the authorization code
    const authCode = await this.db.getAuthorizationCode(code);
    if (!authCode) {
      throw new BadRequestError("Invalid authorization code");
    }

    // Validate the authorization code
    if (
      authCode.isUsed ||
      authCode.expiresAt < new Date() ||
      authCode.redirectUri !== redirect_uri
    ) {
      throw new BadRequestError("Invalid authorization code");
    }

    // Verify the client ID matches
    const clientObj = await this.db.getOAuthClientById(authCode.clientId);
    if (clientObj?.clientId !== client_id) {
      throw new BadRequestError("Invalid client for this authorization code");
    }

    // Verify PKCE if code challenge was provided during authorization
    if (authCode.codeChallenge) {
      if (!code_verifier) {
        throw new BadRequestError("Code verifier required for PKCE flow");
      }

      // Verify the code verifier against the stored challenge
      const pkceValid = verifyPKCE(
        code_verifier,
        authCode.codeChallenge,
        authCode.codeChallengeMethod || "plain",
      );

      if (!pkceValid) {
        throw new BadRequestError("Invalid code verifier");
      }
    }

    // Mark the authorization code as used
    await this.db.useAuthorizationCode(code);

    // Generate OAuth tokens
    const accessToken = generateCode();
    const refreshToken = client.grantTypes.includes("refresh_token")
      ? generateCode()
      : null;

    // Store the access token
    await this.db.createAccessToken({
      token: accessToken,
      clientId: authCode.clientId,
      userId: authCode.userId,
      scope: authCode.scope,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
    });

    // Store refresh token if applicable
    if (refreshToken) {
      await this.db.createRefreshToken({
        token: refreshToken,
        clientId: authCode.clientId,
        userId: authCode.userId,
        scope: authCode.scope,
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), // 30 days
      });
    }

    // Convert OAuth tokens to JWT (for internal use)
    await this.oauthJwtBridge.convertOAuthToJWT(
      accessToken,
      client.id,
      authCode.userId,
      authCode.scope,
    );

    // Return the OAuth tokens
    return c.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: refreshToken,
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
      this.logger.error("Token introspection error:", error);
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
      this.logger.error("Token revocation error:", error);
      // Always return 200 OK per RFC 7009
      return c.json({});
    }
  }

  // Add the getUserFromContext method
  private async getUserFromContext(
    c: Context,
  ): Promise<{ id: string; username: string } | null> {
    try {
      // Get the authorization header
      const authHeader = c.req.header("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
      }

      // Extract the token
      const token = authHeader.substring(7);

      // Verify the token
      const payload = await verifyToken(token);
      if (!payload || !payload.sub) {
        return null;
      }

      // Return the user information
      return {
        id: payload.sub,
        username: payload.sub,
      };
    } catch (error) {
      this.logger.error("Error getting user from context:", error);
      return null;
    }
  }
}
