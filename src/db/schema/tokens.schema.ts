/**
 * Tokens Schema
 * 
 * This module defines the database schema for OAuth tokens used in the application.
 * Tokens are used for authentication and authorization of API requests.
 */

import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

/**
 * Tokens table schema
 */
export const tokens = pgTable('tokens', {
  // Primary key (CUID)
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  
  // Token type (access, refresh, registration, verification)
  type: text('type').notNull(),
  
  // Token hash (for secure storage)
  tokenHash: text('token_hash').notNull(),
  
  // Client ID
  clientId: text('client_id').notNull(),
  
  // User ID
  userId: text('user_id').notNull(),
  
  // Scope
  scope: text('scope'),
  
  // JWT ID (jti)
  jwtId: text('jwt_id'),
  
  // Creation timestamp
  createdAt: timestamp('created_at').notNull().defaultNow(),
  
  // Expiration timestamp
  expiresAt: timestamp('expires_at').notNull(),
  
  // Revocation timestamp
  revokedAt: timestamp('revoked_at'),
  
  // Revocation reason
  revocationReason: text('revocation_reason'),
  
  // Is the token active
  isActive: boolean('is_active').notNull().default(true),
});
