import { Context } from 'hono';
import { DatabaseService } from '../services/db.service';
import { generateToken } from '../utils/auth/jwt';
import { generateCode } from '../utils/auth/code';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { OAUTH_SCOPES } from '../routes/oauth.routes';
import { z } from 'zod';

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
  grant_types: z.array(z.enum(['authorization_code', 'refresh_token'])).optional(),
  token_endpoint_auth_method: z.enum(['client_secret_basic', 'client_secret_post', 'none']).optional(),
  response_types: z.array(z.enum(['code'])).optional(),
});

export class OAuthController {
  private db: DatabaseService;

  constructor(db: DatabaseService = new DatabaseService()) {
    this.db = db;
  }

  // Implements RFC 7591 - OAuth 2.0 Dynamic Client Registration Protocol
  async registerClient(c: Context) {
    try {
      // Parse and validate request body
      const body = await c.req.json();
      const validationResult = clientRegistrationSchema.safeParse(body);
      
      if (!validationResult.success) {
        throw new BadRequestError(`Invalid request: ${validationResult.error.message}`);
      }
      
      const data = validationResult.data;
      
      // Create client record
      const client = await this.db.createOAuthClient({
        name: data.client_name,
        redirectUris: data.redirect_uris,
        scopes: data.scope?.split(' ') || [],
        grantTypes: data.grant_types || ['authorization_code'],
        tokenEndpointAuthMethod: data.token_endpoint_auth_method || 'client_secret_basic'
      });
      
      // Generate registration access token
      const registrationToken = await generateToken({ 
        sub: client.id.toString(), 
        type: 'registration',
        scope: 'registration'
      });
      
      // Return client information
      return c.json({
        client_id: client.id,
        client_secret: client.secret,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_secret_expires_at: 0, // Never expires
        registration_access_token: registrationToken,
        registration_client_uri: `${c.req.url}/${client.id}`,
        redirect_uris: data.redirect_uris,
        grant_types: data.grant_types || ['authorization_code'],
        token_endpoint_auth_method: data.token_endpoint_auth_method || 'client_secret_basic',
        response_types: data.response_types || ['code'],
        client_name: data.client_name,
        client_uri: data.client_uri,
        logo_uri: data.logo_uri,
        scope: data.scope,
        contacts: data.contacts,
        tos_uri: data.tos_uri,
        policy_uri: data.policy_uri,
        software_id: data.software_id,
        software_version: data.software_version
      }, 201);
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      console.error('Client registration error:', error);
      throw new BadRequestError('Failed to register client');
    }
  }

  // Handle authorization code grant flow
  async authorize(c: Context) {
    const query = c.req.query();
    const { 
      response_type,
      client_id,
      redirect_uri,
      scope,
      state
    } = query;

    // Validate required parameters
    if (!response_type || !client_id || !redirect_uri) {
      throw new BadRequestError('Missing required parameters');
    }

    // Verify client
    const client = await this.db.getOAuthClient(client_id);
    if (!client) {
      throw new UnauthorizedError('Invalid client');
    }

    // Verify redirect URI
    if (!client.redirectUris.includes(redirect_uri)) {
      throw new UnauthorizedError('Invalid redirect URI');
    }

    // Generate authorization code
    const code = await generateCode();
    await this.db.createAuthorizationCode({
      code,
      clientId: client_id,
      redirectUri: redirect_uri,
      scope: scope || '',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    // Build redirect URL
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (state) {
      redirectUrl.searchParams.set('state', state);
    }

    return c.redirect(redirectUrl.toString());
  }

  // Handle token requests for authorization code and refresh token grants
  async token(c: Context) {
    const body = await c.req.parseBody();
    const {
      grant_type,
      code,
      redirect_uri,
      refresh_token,
      client_id,
      client_secret
    } = body;

    // Validate client credentials
    const client = await this.db.getOAuthClient(client_id as string);
    if (!client || client.clientSecret !== client_secret) {
      throw new UnauthorizedError('Invalid client credentials');
    }

    let tokenResponse;

    if (grant_type === 'authorization_code') {
      // Verify authorization code
      const authCode = await this.db.getAuthorizationCode(code as string);
      if (!authCode || authCode.clientId !== client_id || authCode.redirectUri !== redirect_uri) {
        throw new UnauthorizedError('Invalid authorization code');
      }

      // Generate tokens
      const accessToken = await generateToken({
        sub: client_id as string,
        scope: authCode.scope,
        type: 'access'
      });

      const refreshToken = await generateToken({
        sub: client_id as string,
        scope: authCode.scope,
        type: 'refresh'
      });

      tokenResponse = {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: refreshToken,
        scope: authCode.scope
      };

      // Invalidate used code
      await this.db.deleteAuthorizationCode(code as string);

    } else if (grant_type === 'refresh_token') {
      // Verify refresh token
      if (!refresh_token) {
        throw new BadRequestError('Missing refresh token');
      }

      // TODO: Implement refresh token validation and rotation
      throw new BadRequestError('Refresh token grant not implemented');
    } else {
      throw new BadRequestError('Unsupported grant type');
    }

    return c.json(tokenResponse);
  }

  // Implements RFC 7662 - OAuth 2.0 Token Introspection
  async introspect(c: Context) {
    const body = await c.req.parseBody();
    const { token } = body;

    if (!token) {
      throw new BadRequestError('Missing token parameter');
    }

    // TODO: Implement token introspection
    return c.json({
      active: false
    });
  }

  // Implements RFC 7009 - OAuth 2.0 Token Revocation
  async revoke(c: Context) {
    const body = await c.req.parseBody();
    const { token } = body;

    if (!token) {
      throw new BadRequestError('Missing token parameter');
    }

    // TODO: Implement token revocation
    return c.json({}, 200);
  }
} 