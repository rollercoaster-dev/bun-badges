import { oauthConfig } from "../config/oauth.config";
import logger from "../utils/logger";
import { randomBytes } from "crypto";
// Using jose instead of jsonwebtoken for better Bun compatibility
import { SignJWT, jwtVerify } from "jose";
import { readFileSync } from "fs";
import { join } from "path";
import { env } from "../utils/env";
import { UnauthorizedError } from "../utils/errors";

// Load private key for JWT signing
const privateKeyPath =
  env.JWT_PRIVATE_KEY_PATH || join(process.cwd(), "keys", "private.key");
let privateKey: string;

try {
  privateKey = readFileSync(privateKeyPath, "utf8");
} catch (error) {
  logger.error(`Failed to load private key from ${privateKeyPath}`, { error });
  throw new Error("Failed to load private key");
}

// Client model interface
interface Client {
  id: string;
  secret: string;
  name: string;
  redirectUris: string[];
  grants: string[];
  scope: string;
  createdAt: Date;
  updatedAt: Date;
}

// Authorization code model interface
interface AuthorizationCode {
  code: string;
  clientId: string;
  redirectUri: string;
  userId: string;
  scope: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: Date;
  createdAt: Date;
}

// Token model interface
interface Token {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  userId: string;
  scope: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date;
}

/**
 * OAuth 2.0 Service
 * Implements the OAuth 2.0 Authorization Code Grant flow
 * according to the Open Badges 3.0 specification
 */
export class OAuthService {
  /**
   * Register a new client
   * @param clientData Client registration data
   * @returns Registered client
   */
  async registerClient(clientData: Partial<Client>): Promise<Client> {
    try {
      // Generate client ID and secret
      const clientId = this.generateId();
      const clientSecret = this.generateSecret();

      // Create client record
      const client: Client = {
        id: clientId,
        secret: clientSecret,
        name:
          clientData.name || oauthConfig.client.defaultRegistration.clientName,
        redirectUris:
          clientData.redirectUris ||
          oauthConfig.client.defaultRegistration.redirectUris,
        grants:
          (clientData.grants as string[]) ||
          oauthConfig.client.defaultRegistration.grantTypes,
        scope: clientData.scope || oauthConfig.client.defaultRegistration.scope,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save client to database
      // TODO: Implement actual database storage
      logger.info("Registered new client", { clientId });

      return client;
    } catch (error) {
      logger.error("Failed to register client", { error });
      throw error;
    }
  }

  /**
   * Generate an authorization code
   * @param clientId Client ID
   * @param redirectUri Redirect URI
   * @param userId User ID
   * @param scope Requested scope
   * @param codeChallenge PKCE code challenge
   * @param codeChallengeMethod PKCE code challenge method
   * @returns Authorization code
   */
  async generateAuthorizationCode(
    clientId: string,
    redirectUri: string,
    userId: string,
    scope: string,
    codeChallenge?: string,
    codeChallengeMethod?: string,
  ): Promise<string> {
    try {
      // Generate authorization code
      const code = this.generateId();

      // Create authorization code record
      // Store the authorization code

      const authorizationCode: AuthorizationCode = {
        code,
        clientId,
        redirectUri,
        userId,
        scope,
        codeChallenge,
        codeChallengeMethod,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        createdAt: new Date(),
      };

      // Save authorization code to database
      // TODO: Implement actual database storage
      logger.info("Generated authorization code", { clientId, userId });

      return code;
    } catch (error) {
      logger.error("Failed to generate authorization code", { error });
      throw error;
    }
  }

  /**
   * Generate access and refresh tokens
   * @param clientId Client ID
   * @param userId User ID
   * @param scope Granted scope
   * @returns Access and refresh tokens
   */
  async generateTokens(
    clientId: string,
    userId: string,
    scope: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
      // Generate access token as JWT
      const accessTokenExpiresIn = oauthConfig.token.accessTokenExpiresIn;
      const encoder = new TextEncoder();
      const secretKey = encoder.encode(privateKey);

      const jwt = new SignJWT({
        sub: userId,
        aud: oauthConfig.token.jwtAudience,
        client_id: clientId,
        scope,
        jti: this.generateId(),
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer(oauthConfig.token.jwtIssuer)
        .setExpirationTime(
          Math.floor(Date.now() / 1000) + accessTokenExpiresIn,
        );

      const accessToken = await jwt.sign(secretKey);

      // Generate refresh token
      const refreshToken = this.generateId();

      // Create token record
      // Store the token

      const token: Token = {
        accessToken,
        refreshToken,
        clientId,
        userId,
        scope,
        expiresAt: new Date(Date.now() + accessTokenExpiresIn * 1000),
        createdAt: new Date(),
      };

      // Save token to database
      // TODO: Implement actual database storage
      logger.info("Generated tokens", { clientId, userId });

      return {
        accessToken,
        refreshToken,
        expiresIn: accessTokenExpiresIn,
      };
    } catch (error) {
      logger.error("Failed to generate tokens", { error });
      throw error;
    }
  }

  /**
   * Validate access token
   * @param accessToken Access token
   * @returns Token payload if valid
   */
  async validateAccessToken(
    accessToken: string,
  ): Promise<Record<string, unknown>> {
    try {
      // Verify JWT signature and expiration
      const encoder = new TextEncoder();
      const secretKey = encoder.encode(privateKey);
      const { payload } = await jwtVerify(accessToken, secretKey, {
        audience: oauthConfig.token.jwtAudience,
        issuer: oauthConfig.token.jwtIssuer,
      });

      // Check if token is revoked
      // TODO: Implement token revocation check

      return payload;
    } catch (error) {
      logger.error("Invalid access token", { error });
      throw new UnauthorizedError("Invalid access token");
    }
  }

  /**
   * Refresh access token
   * @param refreshToken Refresh token
   * @param clientId Client ID
   * @returns New access and refresh tokens
   */
  async refreshAccessToken(
    _refreshToken: string,
    clientId: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
      // Find token by refresh token
      // TODO: Implement actual database query
      const token: Token | null = null;

      if (!token) {
        throw new UnauthorizedError("Invalid refresh token");
      }

      // Mock implementation - in a real app, we would check the token
      if (false) {
        throw new UnauthorizedError("Invalid client");
      }

      // Mock implementation - in a real app, we would check if the token is revoked
      if (false) {
        throw new UnauthorizedError("Token has been revoked");
      }

      // Generate new tokens
      // Mock implementation - in a real app, we would use the actual token data
      return this.generateTokens(clientId, "user-123", "openid profile");
    } catch (error) {
      logger.error("Failed to refresh access token", { error });
      throw error;
    }
  }

  /**
   * Revoke token
   * @param token Token to revoke
   * @param tokenTypeHint Token type hint (access_token or refresh_token)
   * @param clientId Client ID
   */
  async revokeToken(
    _token: string,
    _tokenTypeHint?: "access_token" | "refresh_token",
    clientId?: string,
  ): Promise<void> {
    try {
      // Find token by access or refresh token
      // TODO: Implement actual database query
      const tokenRecord: Token | null = null;

      if (!tokenRecord) {
        // Token not found, but we don't return an error per OAuth 2.0 spec
        return;
      }

      // Mock implementation - in a real app, we would check the token
      if (false) {
        throw new UnauthorizedError("Invalid client");
      }

      // Mark token as revoked
      // TODO: Implement actual database update
      // Mock implementation - in a real app, we would log the actual client ID
      logger.info("Revoked token", { clientId });
    } catch (error) {
      logger.error("Failed to revoke token", { error });
      throw error;
    }
  }

  /**
   * Generate a random ID
   * @returns Random ID
   */
  private generateId(): string {
    return randomBytes(16).toString("hex");
  }

  /**
   * Generate a random secret
   * @returns Random secret
   */
  private generateSecret(): string {
    return randomBytes(32).toString("hex");
  }
}

// Export singleton instance
export const oauthService = new OAuthService();
