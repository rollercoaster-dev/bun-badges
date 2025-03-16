# Database Schema Design

## Overview
PostgreSQL database design for storing all Open Badges data with JSONB support for flexible structures.

## Core Tables

### Users
```sql
CREATE TABLE users (
  user_id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  password_hash TEXT NULL,
  oauth_provider VARCHAR(50),
  oauth_subject VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### IssuerProfiles
```sql
CREATE TABLE issuer_profiles (
  issuer_id UUID PRIMARY KEY,
  name VARCHAR(255),
  url TEXT,
  description TEXT,
  email VARCHAR(255),
  owner_user_id UUID REFERENCES users(user_id),
  issuer_json JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### BadgeClasses
```sql
CREATE TABLE badge_classes (
  badge_id UUID PRIMARY KEY,
  issuer_id UUID REFERENCES issuer_profiles(issuer_id),
  name VARCHAR(255),
  description TEXT,
  criteria TEXT,
  image_url TEXT,
  badge_json JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### BadgeAssertions
```sql
CREATE TABLE badge_assertions (
  assertion_id UUID PRIMARY KEY,
  badge_id UUID REFERENCES badge_classes(badge_id),
  issuer_id UUID REFERENCES issuer_profiles(issuer_id),
  recipient_type VARCHAR(50),
  recipient_identity TEXT,
  recipient_hashed BOOLEAN,
  issued_on TIMESTAMP,
  evidence_url TEXT,
  revoked BOOLEAN DEFAULT FALSE,
  revocation_reason TEXT,
  assertion_json JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### WebAuthnCredentials
```sql
CREATE TABLE webauthn_credentials (
  credential_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(user_id),
  public_key TEXT,
  sign_count BIGINT,
  created_at TIMESTAMP
);
```

### LoginTokens
```sql
CREATE TABLE login_tokens (
  token_id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(user_id),
  code TEXT,
  expires_at TIMESTAMP
);
```

## Design Considerations

### JSONB Usage
- Store complete JSON-LD structures
- Maintain Open Badges spec compliance
- Enable flexible schema evolution
- Support for custom extensions

### Indexing Strategy
- Index on issuer_id for quick lookups
- Index on recipient fields for verification
- JSONB indexes for specific queries
- Composite indexes for common queries

### Future-Proofing
- OB 3.0 support via JSONB fields
- DID integration readiness
- Cryptographic proof storage
- Flexible recipient identification

## Data Integrity
- Foreign key constraints
- Timestamp tracking
- Soft deletion support
- Audit trail capability

## Security Considerations
- Hashed recipient identities
- Secure credential storage
- Token lifecycle management
- Revocation tracking 