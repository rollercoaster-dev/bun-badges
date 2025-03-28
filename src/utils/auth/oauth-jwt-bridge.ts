import { generateToken, verifyToken, JWTPayload } from "./jwt";
import { DatabaseService } from "@/services/db.service";

/**
 * OAuth to JWT Bridge - Links the OAuth 2.0 system with the JWT authentication system
 *
 * This utility provides methods to:
 * 1. Convert OAuth tokens to JWT tokens and vice versa
 * 2. Validate scopes across both systems
 * 3. Handle token exchange and validation
 */
export class OAuthJWTBridge {
  private db: DatabaseService;

  constructor(db?: DatabaseService) {
    this.db = db || new DatabaseService();
  }

  /**
   * Converts an OAuth access token to a JWT token for use with the internal authentication system
   * @param oauthToken The OAuth token string
   * @param clientId The OAuth client ID that the token belongs to
   * @param userId The user ID of the token owner
   * @param scope The OAuth scopes the token has access to
   * @returns A JWT token string that can be used with the internal authentication system
   */
  async convertOAuthToJWT(
    oauthToken: string,
    clientId: string,
    userId: string,
    scope: string,
  ): Promise<string> {
    // Store the mapping between the OAuth token and the JWT
    // This will allow us to revoke both when either is revoked
    const jwtToken = await generateToken({
      sub: userId,
      type: "access",
      scope,
      client_id: clientId,
      oauth_token: oauthToken, // Include reference to OAuth token
    });

    // Store the mapping in the database for future reference
    await this.db.storeTokenMapping({
      oauthToken,
      jwtToken,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour expiry
    });

    return jwtToken;
  }

  /**
   * Validates an OAuth token against the JWT system to ensure it has the required permissions
   * @param oauthToken The OAuth token to validate
   * @param requiredScopes Array of required scopes
   * @returns Boolean indicating if the token has all required scopes
   */
  async validateOAuthScopes(
    oauthToken: string,
    requiredScopes: string[],
  ): Promise<boolean> {
    // Get the OAuth token from the database
    const token = await this.db.getAccessToken(oauthToken);
    if (!token || token.isRevoked) {
      return false;
    }

    // Check if the token has expired
    if (token.expiresAt < new Date()) {
      return false;
    }

    // Check if the token has all required scopes
    const tokenScopes = token.scope.split(" ");
    return requiredScopes.every((scope) => tokenScopes.includes(scope));
  }

  /**
   * Gets the JWT payload from an OAuth token if valid
   * @param oauthToken The OAuth token
   * @returns The JWT payload if the token is valid, null otherwise
   */
  async getJWTFromOAuthToken(oauthToken: string): Promise<JWTPayload | null> {
    // Get the token mapping from the database
    const mapping = await this.db.getTokenMappingByOAuth(oauthToken);
    if (!mapping) {
      return null;
    }

    try {
      // Verify the JWT
      const payload = await verifyToken(mapping.jwtToken);
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Revokes both the OAuth token and its corresponding JWT token
   * @param oauthToken The OAuth token to revoke
   */
  async revokeOAuthAndJWT(oauthToken: string): Promise<void> {
    // Revoke the OAuth token
    await this.db.revokeAccessToken(oauthToken);

    // Get and revoke the corresponding JWT
    const mapping = await this.db.getTokenMappingByOAuth(oauthToken);
    if (mapping && mapping.jwtToken) {
      // Get the access token to find the user
      const accessToken = await this.db.getAccessToken(oauthToken);
      if (!accessToken) return;

      await this.db.revokeToken({
        token: mapping.jwtToken,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        type: "access",
        username: accessToken.userId, // Use the user ID from the access token
      });

      // Also delete the mapping
      await this.db.deleteTokenMappingByOAuth(oauthToken);
    }
  }

  /**
   * Creates a JWT token based on an OAuth client credentials grant
   * @param clientId The client ID
   * @param scopes The scopes to include in the token
   * @returns A JWT token for the client credentials grant
   */
  async createClientCredentialsJWT(
    clientId: string,
    scopes: string[],
  ): Promise<string> {
    return generateToken({
      sub: clientId,
      type: "access",
      scope: scopes.join(" "),
      is_client_credentials: true, // Flag to indicate this is a client credentials token
    });
  }
}
