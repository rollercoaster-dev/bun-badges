# Open Badges 3.0 Support

Bun Badges implements the Open Badges 3.0 standard, which aligns with the W3C Verifiable Credentials Data Model. This document outlines the key features and endpoints for working with Open Badges 3.0 in the platform.

## Overview

Open Badges 3.0 enhances the digital badge ecosystem with:

- Cryptographic proofs for verification
- Decentralized identifiers (DIDs)
- Self-contained verification (no hosted verification required)
- Improved privacy features

This implementation supports both Open Badges 2.0 (for backward compatibility) and Open Badges 3.0 (for enhanced security and functionality).

## Key Features

### Cryptographic Verification

Badges are cryptographically signed using Ed25519 keys, allowing for tamper-proof verification. Each issuer is assigned a DID and key pair for badge signing.

### Verifiable Credentials

Badges follow the W3C Verifiable Credentials data model with the Open Badges 3.0 context, making them compatible with broader verifiable credential ecosystems.

### Enhanced Privacy

Improved recipient identification methods with more secure hashing and privacy-preserving features.

### Revocation Support

Badges can be revoked using cryptographic status lists, providing secure and verifiable revocation information.

## API Endpoints

### Issuing Badges (OB3.0)

To issue a badge in Open Badges 3.0 format:

```
POST /assertions
```

With the following request body:

```json
{
  "badgeId": "badge-uuid",
  "recipient": {
    "type": "email",
    "identity": "recipient@example.com",
    "hashed": true
  },
  "evidence": "https://example.com/evidence",
  "version": "ob3"
}
```

Setting `version` to `ob3` instructs the API to create an Open Badges 3.0 verifiable credential.

### Retrieving Badges (OB3.0)

To retrieve a badge in Open Badges 3.0 format:

```
GET /assertions/{assertionId}?format=ob3
```

The response will include the full credential with cryptographic proof.

### Verifying Badges

To verify a badge:

```
GET /verify/{assertionId}
```

The response includes verification status with details about signature verification, revocation status, and structural validation.

## Data Model

### Open Badge Credential (OB3.0)

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/vc/status-list/2021/v1",
    "https://w3id.org/badges/v3"
  ],
  "id": "https://example.com/assertions/1234",
  "type": ["VerifiableCredential", "OpenBadgeCredential"],
  "issuer": {
    "id": "did:key:z6MkrXSQTybtqyMasfSxeRBksrz6CjHhWBMz1EKT1STM7hV3",
    "type": "Profile",
    "name": "Example Issuer"
  },
  "issuanceDate": "2025-03-19T12:00:00Z",
  "credentialSubject": {
    "type": "EmailCredentialSubject",
    "achievement": {
      "id": "https://example.com/badges/5678",
      "type": ["AchievementCredential"],
      "name": "Example Badge",
      "description": "An achievement for completing a task",
      "criteria": {
        "narrative": "Complete all required steps to earn this badge"
      },
      "image": {
        "id": "https://example.com/badges/5678/image",
        "type": "Image"
      }
    }
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2025-03-19T12:05:00Z",
    "verificationMethod": "did:key:z6MkrXSQTybtqyMasfSxeRBksrz6CjHhWBMz1EKT1STM7hV3#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "zQeVbY4oNQX6CbXs8EQ2zCus4Jt6FfgkU6cVZ6iNpSEsHsXvo5Aq12dbir57H2XfVP1QrFR5bqntoG5i1XB71Uw"
  }
}
```

## Implementation Details

### Signing Keys

The system automatically generates Ed25519 key pairs for issuers when they first create an OB3.0 badge. These keys are securely stored and used for signing all badges issued by that entity.

### Verification Process

Badge verification involves:

1. Extracting the proof from the credential
2. Retrieving the issuer's public key
3. Verifying the signature against the credential data
4. Checking revocation status
5. Validating credential structure

### Revocation

Badges can be revoked through the API:

```
POST /assertions/{assertionId}/revoke
```

```json
{
  "reason": "Badge requirements updated"
}
```

Revoked OB3.0 badges contain a `credentialStatus` property that refers to a status list credential.

## Migration from OB2.0 to OB3.0

Existing badges issued in OB2.0 format can continue to be verified through the platform. New badges can be issued in either format, with OB3.0 being recommended for enhanced security and features.

## Technical Implementation

The implementation uses:

- Ed25519 cryptography for digital signatures
- DIDs as persistent identifiers
- JSON-LD for semantic data representation
- PostgreSQL for storing badge and key data
- Bun and Hono for high-performance API delivery

## Future Enhancements

- Support for additional proof formats
- DID resolution with multiple DID methods
- Integration with digital wallets
- Support for selective disclosure
- Expanded cryptographic algorithm options
