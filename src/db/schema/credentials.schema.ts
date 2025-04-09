/**
 * Credentials Schema
 * 
 * This module defines the database schema for Open Badges credentials used in the application.
 * Credentials are used to represent achievements, certifications, and other verifiable claims.
 */

import { pgTable, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

/**
 * Credentials table schema
 */
export const credentials = pgTable('credentials', {
  // Primary key (CUID)
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  
  // Credential type (VerifiableCredential, OpenBadgeCredential)
  type: text('type').notNull(),
  
  // Issuer ID
  issuerId: text('issuer_id').notNull(),
  
  // Recipient ID
  recipientId: text('recipient_id').notNull(),
  
  // Credential hash (for verification)
  credentialHash: text('credential_hash').notNull(),
  
  // Credential data (JSON)
  data: jsonb('data').notNull(),
  
  // Credential proof (JSON)
  proof: jsonb('proof'),
  
  // Key ID used for signing
  keyId: text('key_id'),
  
  // Credential status (active, revoked, suspended)
  status: text('status').notNull().default('active'),
  
  // Creation timestamp
  createdAt: timestamp('created_at').notNull().defaultNow(),
  
  // Issuance timestamp
  issuedAt: timestamp('issued_at').notNull().defaultNow(),
  
  // Expiration timestamp
  expiresAt: timestamp('expires_at'),
  
  // Revocation timestamp
  revokedAt: timestamp('revoked_at'),
  
  // Revocation reason
  revocationReason: text('revocation_reason'),
  
  // Is the credential active
  isActive: boolean('is_active').notNull().default(true),
});
