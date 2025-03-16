import { Context } from 'hono';
import { DatabaseService } from '@services/db.service';
import { generateToken } from '@utils/auth/jwt';
import { generateCode } from '@utils/auth/code';
import { BadRequestError, UnauthorizedError } from '@utils/errors';
import { OAUTH_SCOPES } from '@routes/oauth.routes';

export class OAuthController {
  private db: DatabaseService;

  constructor(db: DatabaseService = new DatabaseService()) {
    this.db = db;
  }

  // Implements RFC 7591 - OAuth 2.0 Dynamic Client Registration Protocol
  async registerClient(c: Context) {
    const body = await c.req.json();
    
    // Validate required fields
    if (!body.client_name || !body.redirect_uris || !Array.isArray(body.redirect_uris)) {
      throw new BadRequestError('Missing required fields');
    }

    // Create client record
    const client = await this.db.createOAuthClient({
      name: body.client_name,
      redirectUris: body.redirect_uris,
      scopes: body.scope?.split(' ') || [],
      grantTypes: body.grant_types || ['authorization_code'],
      tokenEndpointAuthMethod: body.token_endpoint_auth_method || 'client_secret_basic'
    });

    return c.json({
      client_id: client.id,
      client_secret: client.secret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0, // Never expires
      registration_access_token: await generateToken({ sub: client.id, type: 'registration' }),
      registration_client_uri: `${c.req.url}/${client.id}`,
      redirect_uris: client.redirectUris,
      grant_types: client.grantTypes,
      token_endpoint_auth_method: client.tokenEndpointAuthMethod
    });
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
    const client = await this.db.getOAuthClient(client_id);
    if (!client || client.secret !== client_secret) {
      throw new UnauthorizedError('Invalid client credentials');
    }

    let tokenResponse;

    if (grant_type === 'authorization_code') {
      // Verify authorization code
      const authCode = await this.db.getAuthorizationCode(code);
      if (!authCode || authCode.clientId !== client_id || authCode.redirectUri !== redirect_uri) {
        throw new UnauthorizedError('Invalid authorization code');
      }

      // Generate tokens
      const accessToken = await generateToken({
        sub: client_id,
        scope: authCode.scope,
        type: 'access'
      });

      const refreshToken = await generateToken({
        sub: client_id,
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
      await this.db.deleteAuthorizationCode(code);

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