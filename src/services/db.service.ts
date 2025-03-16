import { and, eq, gt, lt } from 'drizzle-orm';
import { db } from '../db/config';
import { verificationCodes, revokedTokens } from '../db/schema/auth';
import type { NewVerificationCode, NewRevokedToken } from '../db/schema/auth';

export class DatabaseService {
  // Verification Code Methods
  async createVerificationCode(data: Omit<NewVerificationCode, 'id'>): Promise<string> {
    const [result] = await db.insert(verificationCodes)
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
          gt(verificationCodes.expiresAt, new Date())
        )
      )
      .limit(1);
    return result;
  }

  async markCodeAsUsed(id: string) {
    await db.update(verificationCodes)
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

    await db.update(verificationCodes)
      .set({ attempts })
      .where(eq(verificationCodes.id, id));
  }

  // Revoked Token Methods
  async revokeToken(data: Omit<NewRevokedToken, 'id'>): Promise<void> {
    await db.insert(revokedTokens).values(data);
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(revokedTokens)
      .where(
        and(
          eq(revokedTokens.token, token),
          gt(revokedTokens.expiresAt, new Date())
        )
      )
      .limit(1);
    return !!result;
  }

  async cleanupExpiredTokens(): Promise<void> {
    await db.delete(revokedTokens)
      .where(lt(revokedTokens.expiresAt, new Date()));
  }
} 