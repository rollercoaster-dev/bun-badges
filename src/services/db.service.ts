import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "../db/config";
import { verificationCodes, revokedTokens } from "../db/schema/auth";
import type { NewVerificationCode, NewRevokedToken } from "../db/schema/auth";
import { oauthClients, authorizationCodes } from "../db/schema/oauth";
import { nanoid } from "nanoid";

export class DatabaseService {
  // Verification Code Methods
  async createVerificationCode(
    data: Omit<NewVerificationCode, "id">,
  ): Promise<string> {
    const [result] = await db
      .insert(verificationCodes)
      .values(data)
      .returning({ id: verificationCodes.id });
    return result.id;
  }

  async getVerificationCode(username: string, code: string) {
    const [result] = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.username, username),
          eq(verificationCodes.code, code),
          gt(verificationCodes.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return result;
  }

  async markCodeAsUsed(id: string) {
    await db
      .update(verificationCodes)
      .set({ usedAt: new Date() })
      .where(eq(verificationCodes.id, id));
  }

  async recordVerificationAttempt(id: string, attempt: string) {
    const [code] = await db
      .select({ attempts: verificationCodes.attempts })
      .from(verificationCodes)
      .where(eq(verificationCodes.id, id));

    const attempts = code?.attempts || [];
    attempts.push(attempt);

    await db
      .update(verificationCodes)
      .set({ attempts })
      .where(eq(verificationCodes.id, id));
  }

  // Revoked Token Methods
  async revokeToken(data: Omit<NewRevokedToken, "id">): Promise<void> {
    await db.insert(revokedTokens).values(data);
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(revokedTokens)
      .where(
        and(
          eq(revokedTokens.token, token),
          gt(revokedTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return !!result;
  }

  async cleanupExpiredTokens(): Promise<void> {
    await db
      .delete(revokedTokens)
      .where(lt(revokedTokens.expiresAt, new Date()));
  }

  // OAuth Client Methods

  async createOAuthClient(data: {
    name: string;
    redirectUris: string[];
    scopes: string[];
    grantTypes: string[];
    tokenEndpointAuthMethod: string;
  }) {
    const clientId = nanoid(16);
    const clientSecret = nanoid(32);

    await db.insert(oauthClients).values({
      clientId,
      clientSecret,
      clientName: data.name,
      clientUri: data.name, // Default to name if no URI provided
      redirectUris: data.redirectUris,
      scope: data.scopes.join(" "),
      grantTypes: data.grantTypes,
      responseTypes: ["code"], // Default to authorization code flow
      tokenEndpointAuthMethod: data.tokenEndpointAuthMethod,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    });

    return {
      id: clientId,
      secret: clientSecret,
      name: data.name,
      redirectUris: data.redirectUris,
      scopes: data.scopes,
      grantTypes: data.grantTypes,
      tokenEndpointAuthMethod: data.tokenEndpointAuthMethod,
    };
  }

  async getOAuthClient(clientId: string) {
    const clients = await db
      .select()
      .from(oauthClients)
      .where(eq(oauthClients.clientId, clientId));
    return clients.length > 0 ? clients[0] : null;
  }

  // Authorization Code Methods

  async createAuthorizationCode(data: {
    code: string;
    clientId: string;
    redirectUri: string;
    scope: string;
    expiresAt: Date;
  }) {
    // Find the client to get its UUID
    const clients = await db
      .select()
      .from(oauthClients)
      .where(eq(oauthClients.clientId, data.clientId));
    if (clients.length === 0) {
      throw new Error("Client not found");
    }

    await db.insert(authorizationCodes).values({
      code: data.code,
      clientId: clients[0].id, // Use the UUID from the client
      userId: "anonymous", // Placeholder until we have user authentication
      redirectUri: data.redirectUri,
      scope: data.scope,
      expiresAt: data.expiresAt,
      createdAt: new Date(),
      isUsed: false,
    });

    return data;
  }

  async getAuthorizationCode(code: string) {
    const codes = await db
      .select()
      .from(authorizationCodes)
      .where(eq(authorizationCodes.code, code));
    return codes.length > 0 ? codes[0] : null;
  }

  async deleteAuthorizationCode(code: string) {
    await db
      .delete(authorizationCodes)
      .where(eq(authorizationCodes.code, code));
  }

  async cleanupExpiredAuthCodes() {
    await db
      .delete(authorizationCodes)
      .where(lt(authorizationCodes.expiresAt, new Date()));
  }
}
