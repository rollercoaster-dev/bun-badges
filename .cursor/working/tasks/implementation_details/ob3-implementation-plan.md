# Open Badges 3.0 Implementation Plan

## Overview

This document outlines the specific implementation tasks needed to bring our Open Badges 3.0 support into full compliance with the official specification. Tasks are organized by priority and complexity.

## High Priority Tasks

### 1. Update Context URLs

**Current Implementation:**
```typescript
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/vc/status-list/2021/v1",
    "https://w3id.org/badges/v3",
  ]
}
```

**Required Implementation:**
```typescript
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    "https://purl.imsglobal.org/spec/ob/v3p0/extensions.json" // If using extensions
  ]
}
```

**Files to Modify:**
- `src/controllers/badge.controller.ts` - Update `constructOB3BadgeClassJson` and `constructOB3AssertionJson` methods
- `src/models/credential.model.ts` - Update type definitions

**Estimated Effort:** Low (1-2 hours)

### 2. Add Credential Schema Support

**Required Implementation:**
```typescript
{
  // ...existing credential properties
  "credentialSchema": [{
    "id": "https://purl.imsglobal.org/spec/ob/v3p0/schema/json/ob_v3p0_achievementcredential_schema.json",
    "type": "1EdTechJsonSchemaValidator2019"
  }]
}
```

**Files to Modify:**
- `src/controllers/badge.controller.ts` - Update `constructOB3AssertionJson` method
- `src/models/credential.model.ts` - Add `credentialSchema` to `OpenBadgeCredential` interface

**Additional Tasks:**
- Add schema validation utility for verifying credentials against the schema
- Update verification service to check schema references

**Estimated Effort:** Medium (3-4 hours)

### 3. Update Proof Format

**Current Implementation:**
```typescript
{
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2023-03-19T12:05:00Z",
    "verificationMethod": "did:key:z6MkrXSQTybtqyMasfSxeRBksrz6CjHhWBMz1EKT1STM7hV3#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "zQeVbY4oNQX6CbXs8EQ2zCus4Jt6FfgkU6cVZ6iNpSEsHsXvo5Aq12dbir57H2XfVP1QrFR5bqntoG5i1XB71Uw"
  }
}
```

**Required Implementation:**
```typescript
{
  "proof": [{
    "type": "DataIntegrityProof",
    "created": "2023-03-19T12:05:00Z",
    "verificationMethod": "did:key:z6MkrXSQTybtqyMasfSxeRBksrz6CjHhWBMz1EKT1STM7hV3#key-1",
    "proofPurpose": "assertionMethod",
    "cryptosuite": "eddsa-rdfc-2022",
    "proofValue": "zQeVbY4oNQX6CbXs8EQ2zCus4Jt6FfgkU6cVZ6iNpSEsHsXvo5Aq12dbir57H2XfVP1QrFR5bqntoG5i1XB71Uw"
  }]
}
```

**Files to Modify:**
- `src/controllers/badge.controller.ts` - Update the proof generation in `constructOB3AssertionJson`
- `src/models/credential.model.ts` - Update `CredentialProof` interface and add `DataIntegrityProof` type
- `src/services/verification.service.ts` - Update verification logic for the new proof format

**Dependencies:**
- Implement or use a library for the `eddsa-rdfc-2022` cryptosuite

**Estimated Effort:** High (8-10 hours)

## Medium Priority Tasks

### 4. Enhance Recipient Type Support

**Current Implementation:**
Primarily focused on email with some type definitions for other types

**Required Implementation:**
Full support for:
- Email recipients
- DID recipients
- URL recipients
- Phone recipients

**Files to Modify:**
- `src/controllers/badge.controller.ts` - Enhance `constructOB3AssertionJson` to properly handle all recipient types
- `src/services/credential.service.ts` - Update credential creation logic
- `src/models/credential.model.ts` - Ensure all recipient type interfaces are complete

**Estimated Effort:** Medium (4-6 hours)

### 5. Implement Endorsement Support

**Required Implementation:**
- Define `EndorsementCredential` type
- Create endpoints for managing endorsements
- Implement logic for creating and verifying endorsement credentials

**New Files Needed:**
- `src/models/endorsement.model.ts` - Type definitions for endorsements
- `src/services/endorsement.service.ts` - Service for endorsement operations
- `src/controllers/endorsement.controller.ts` - Controller for endorsement API
- `src/routes/endorsement.routes.ts` - API routes for endorsements

**Estimated Effort:** High (10-12 hours)

### 6. Add Terms of Use Support

**Required Implementation:**
```typescript
{
  // ...existing credential properties
  "termsOfUse": [{
    "type": "CredentialTermsOfUse",
    "id": "https://example.com/terms",
    "obligation": "Credential holder must present this credential when requested"
  }]
}
```

**Files to Modify:**
- `src/controllers/badge.controller.ts` - Add terms of use to credentials
- `src/models/credential.model.ts` - Update `OpenBadgeCredential` interface

**Estimated Effort:** Low (2-3 hours)

## Low Priority Tasks

### 7. Support JWT-Based Proofs

**Required Implementation:**
Add support for JWT encoding and verification of credentials

**New Files Needed:**
- `src/utils/signing/jwt.ts` - JWT creation and verification utilities

**Files to Modify:**
- `src/services/credential.service.ts` - Add JWT credential creation
- `src/services/verification.service.ts` - Add JWT verification logic
- `src/routes/assertion.routes.ts` - Add support for JWT format parameter

**Estimated Effort:** High (8-10 hours)

### 8. Improve Validation

**Required Tasks:**
- Implement JSON-LD validation utilities
- Add schema validation against official JSON schemas
- Enhance type guards with more detailed validation

**Files to Modify:**
- `src/utils/validation/` - Create new validation utilities
- `src/services/verification.service.ts` - Update verification with enhanced validation

**Estimated Effort:** Medium (6-8 hours)

## Implementation Phases

### Phase 1: Core Compliance Updates (1-2 days)
- Update context URLs
- Add credential schema support
- Enhance recipient type support

### Phase 2: Proof Format and Verification (2-3 days)
- Update proof format to DataIntegrityProof
- Implement eddsa-rdfc-2022 cryptosuite
- Update verification service for new proof format

### Phase 3: Extended Features (3-4 days)
- Implement endorsement support
- Add terms of use support
- Support JWT-based proofs
- Improve validation

## Testing Requirements

### Unit Tests
- Test all modified utility functions
- Validate proof creation and verification
- Verify schema validation

### Integration Tests
- Test end-to-end credential issuance and verification
- Test credential format conversions
- Test endorsement workflows

### Validation Testing
- Validate output against official JSON schemas
- Test compatibility with external OB3 validators

## Conclusion

This implementation plan provides a structured approach to bringing our Open Badges 3.0 implementation into full compliance with the official specification. By prioritizing the high-impact, low-effort changes first, we can quickly improve our compliance level while planning for the more complex changes.

The estimated total effort is approximately:
- High Priority: 12-16 hours
- Medium Priority: 16-21 hours
- Low Priority: 14-18 hours

With an overall implementation timeline of 6-9 days of dedicated development time. 