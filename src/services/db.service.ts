import { and, eq, gt, lt } from "drizzle-orm";
import { db, schema } from "@/db/config";
import { nanoid } from "nanoid";

const {
  verificationCodes,
  revokedTokens,
  oauthClients,
  authorizationCodes,
  users,
} = schema;

import type { NewRevokedToken } from "@/db/schema/auth";
import type { InferInsertModel } from "drizzle-orm";

type NewUser = Omit<InferInsertModel<typeof users>, "createdAt" | "updatedAt">;

export class DatabaseService {
  // Re-export the db instance for direct access when needed
  static db = db;

  // User Management Methods
  async createUser(data: NewUser) {
    const [user] = await db
      .insert(users)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return user;
  }

  async getUserByEmail(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user;
  }

  // Verification Code Methods
  async createVerificationCode(
    data: Omit<schema.NewVerificationCode, "id">,
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
    isHeadless?: boolean;
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
      isHeadless: data.isHeadless || false,
    });

    return {
      id: clientId,
      secret: clientSecret,
      name: data.name,
      redirectUris: data.redirectUris,
      scopes: data.scopes,
      grantTypes: data.grantTypes,
      tokenEndpointAuthMethod: data.tokenEndpointAuthMethod,
      isHeadless: data.isHeadless || false,
    };
  }

  async getOAuthClient(clientId: string) {
    const clients = await db
      .select()
      .from(oauthClients)
      .where(eq(oauthClients.clientId, clientId));
    return clients.length > 0 ? clients[0] : null;
  }

  async getOAuthClientById(id: string) {
    const clients = await db
      .select()
      .from(oauthClients)
      .where(eq(oauthClients.id, id));
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

  // OAuth Access Token Methods
  async storeAccessToken(data: {
    token: string;
    clientId: string; // UUID from oauthClients
    userId: string;
    scope: string;
    expiresAt: Date;
  }) {
    await db.insert(schema.oauthAccessTokens).values({
      token: data.token,
      clientId: data.clientId,
      userId: data.userId,
      scope: data.scope,
      expiresAt: data.expiresAt,
      isRevoked: false,
      createdAt: new Date(),
    });

    return { success: true };
  }

  async getAccessToken(token: string) {
    const [result] = await db
      .select()
      .from(schema.oauthAccessTokens)
      .where(eq(schema.oauthAccessTokens.token, token))
      .limit(1);

    return result;
  }

  async revokeAccessToken(token: string) {
    await db
      .update(schema.oauthAccessTokens)
      .set({ isRevoked: true })
      .where(eq(schema.oauthAccessTokens.token, token));

    return { success: true };
  }
}
